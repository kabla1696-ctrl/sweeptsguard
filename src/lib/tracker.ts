import { ethers } from 'ethers'
import { CHAINS } from './chains'
import { isExchangeWallet, isKnownDrainer } from './draindb'

export interface TrackedTransfer {
  hash: string
  from: string
  to: string
  value: string
  asset: string
  chainId: number
  chainName: string
  timestamp: number
  isExchangeDeposit: boolean
  exchangeName?: string
  isDrainerTransfer: boolean
  drainerName?: string
  blockNumber: number
}

export interface FundFlow {
  source: string
  destination: string
  amount: string
  asset: string
  hops: number
  chainId: number
  timestamp: number
  isExchange: boolean
  exchangeName?: string
}

export class TransactionTracker {
  private providers: Map<number, ethers.JsonRpcProvider> = new Map()

  constructor() {
    for (const [id, chain] of Object.entries(CHAINS)) {
      this.providers.set(Number(id), new ethers.JsonRpcProvider(chain.rpc))
    }
  }

  // Track all outgoing transfers from an address
  async trackOutflows(address: string, chainId: number, fromBlock: number = -1000): Promise<TrackedTransfer[]> {
    const provider = this.providers.get(chainId)
    const chain = CHAINS[chainId]
    if (!provider || !chain) return []

    const transfers: TrackedTransfer[] = []

    try {
      // Track native transfers (ETH)
      const nativeFilter = {
        fromBlock,
        toBlock: 'latest',
        topics: [
          ethers.id('Transfer(address,address,uint256)'),
          ethers.zeroPadValue(address, 32)
        ]
      }

      const logs = await provider.getLogs(nativeFilter).catch(() => [])

      for (const log of logs) {
        const to = '0x' + log.topics[2].slice(26)
        const value = BigInt(log.data)
        const block = await provider.getBlock(log.blockNumber)

        const exchangeInfo = isExchangeWallet(to)
        const drainerInfo = isKnownDrainer(to)

        transfers.push({
          hash: log.transactionHash,
          from: address,
          to,
          value: ethers.formatEther(value),
          asset: chain.nativeCurrency,
          chainId,
          chainName: chain.name,
          timestamp: block ? block.timestamp * 1000 : Date.now(),
          isExchangeDeposit: !!exchangeInfo,
          exchangeName: exchangeInfo?.name,
          isDrainerTransfer: !!drainerInfo,
          drainerName: drainerInfo?.name,
          blockNumber: log.blockNumber
        })
      }

      // Track ERC-20 transfers
      const erc20Filter = {
        fromBlock,
        toBlock: 'latest',
        topics: [
          ethers.id('Transfer(address,address,uint256)'),
          ethers.zeroPadValue(address, 32)
        ]
      }

      const erc20Logs = await provider.getLogs(erc20Filter).catch(() => [])

      for (const log of erc20Logs) {
        const to = '0x' + log.topics[2].slice(26)
        const value = BigInt(log.data)
        const block = await provider.getBlock(log.blockNumber)

        // Get token info
        const tokenContract = new ethers.Contract(log.address, [
          'function symbol() view returns (string)',
          'function decimals() view returns (uint8)'
        ], provider)

        let symbol = 'UNKNOWN'
        let decimals = 18
        try {
          symbol = await tokenContract.symbol()
          decimals = await tokenContract.decimals()
        } catch {}

        const exchangeInfo = isExchangeWallet(to)
        const drainerInfo = isKnownDrainer(to)

        transfers.push({
          hash: log.transactionHash,
          from: address,
          to,
          value: ethers.formatUnits(value, decimals),
          asset: symbol,
          chainId,
          chainName: chain.name,
          timestamp: block ? block.timestamp * 1000 : Date.now(),
          isExchangeDeposit: !!exchangeInfo,
          exchangeName: exchangeInfo?.name,
          isDrainerTransfer: !!drainerInfo,
          drainerName: drainerInfo?.name,
          blockNumber: log.blockNumber
        })
      }
    } catch {
      // Skip errors
    }

    // Sort by timestamp descending
    return transfers.sort((a, b) => b.timestamp - a.timestamp)
  }

  // Track funds across multiple chains
  async trackAllChains(address: string, chainIds: number[] = [1, 8453, 56]): Promise<TrackedTransfer[]> {
    const allTransfers: TrackedTransfer[] = []

    const promises = chainIds.map(chainId =>
      this.trackOutflows(address, chainId)
    )

    const results = await Promise.all(promises)
    results.forEach(transfers => allTransfers.push(...transfers))

    return allTransfers.sort((a, b) => b.timestamp - a.timestamp)
  }

  // Follow fund flow (track where stolen funds went)
  async followFunds(address: string, chainId: number, maxHops: number = 5): Promise<FundFlow[]> {
    const flows: FundFlow[] = []
    const visited = new Set<string>()
    const queue: { address: string; depth: number }[] = [{ address, depth: 0 }]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (current.depth >= maxHops) continue
      if (visited.has(current.address.toLowerCase())) continue

      visited.add(current.address.toLowerCase())

      const transfers = await this.trackOutflows(current.address, chainId, -5000)

      for (const transfer of transfers) {
        flows.push({
          source: transfer.from,
          destination: transfer.to,
          amount: transfer.value,
          asset: transfer.asset,
          hops: current.depth + 1,
          chainId,
          timestamp: transfer.timestamp,
          isExchange: transfer.isExchangeDeposit,
          exchangeName: transfer.exchangeName
        })

        // Continue following if not an exchange
        if (!transfer.isExchangeDeposit && current.depth < maxHops - 1) {
          queue.push({ address: transfer.to, depth: current.depth + 1 })
        }
      }
    }

    return flows
  }

  // Check if funds reached an exchange
  async checkExchangeDeposit(address: string, chainId: number): Promise<{ deposited: boolean; exchange?: string; txHash?: string }> {
    const transfers = await this.trackOutflows(address, chainId, -10000)

    for (const transfer of transfers) {
      if (transfer.isExchangeDeposit) {
        return {
          deposited: true,
          exchange: transfer.exchangeName,
          txHash: transfer.hash
        }
      }
    }

    return { deposited: false }
  }
}

export const tracker = new TransactionTracker()
