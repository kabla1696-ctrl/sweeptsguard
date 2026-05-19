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

  // Timeout wrapper
  private async withTimeout<T>(promise: Promise<T>, ms: number = 8000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ])
  }

  // Track all outgoing transfers from an address
  async trackOutflows(address: string, chainId: number, fromBlock: number = -500): Promise<TrackedTransfer[]> {
    const provider = this.providers.get(chainId)
    const chain = CHAINS[chainId]
    if (!provider || !chain) return []

    const transfers: TrackedTransfer[] = []

    try {
      // Get current block with timeout
      const latestBlock = await this.withTimeout(provider.getBlockNumber(), 8000).catch(() => 0)
      if (!latestBlock) return []

      const startBlock = Math.max(0, latestBlock + fromBlock)

      // Track native transfers (ETH) + ERC-20 transfers in one batch
      const [nativeLogs, erc20Logs] = await Promise.all([
        this.withTimeout(provider.getLogs({
          fromBlock: startBlock,
          toBlock: latestBlock,
          topics: [
            ethers.id('Transfer(address,address,uint256)'),
            ethers.zeroPadValue(address, 32)
          ]
        }), 10000).catch(() => []),
        this.withTimeout(provider.getLogs({
          fromBlock: startBlock,
          toBlock: latestBlock,
          topics: [
            ethers.id('Transfer(address,address,uint256)'),
            null,
            ethers.zeroPadValue(address, 32)
          ]
        }), 10000).catch(() => [])
      ])

      // Batch fetch block timestamps (max 20 unique blocks)
      const uniqueBlocks = new Set<number>()
      for (const log of [...nativeLogs, ...erc20Logs]) {
        uniqueBlocks.add(log.blockNumber)
      }
      const blockNumbers = [...uniqueBlocks].slice(0, 20)
      const blockTimestamps = new Map<number, number>()
      await Promise.all(
        blockNumbers.map(async (bn) => {
          try {
            const block = await this.withTimeout(provider.getBlock(bn), 5000)
            if (block) blockTimestamps.set(bn, block.timestamp * 1000)
          } catch {}
        })
      )

      // Process native outflows
      for (const log of nativeLogs) {
        const to = '0x' + log.topics[2].slice(26)
        const value = BigInt(log.data)
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
          timestamp: blockTimestamps.get(log.blockNumber) || Date.now(),
          isExchangeDeposit: !!exchangeInfo,
          exchangeName: exchangeInfo?.name,
          isDrainerTransfer: !!drainerInfo,
          drainerName: drainerInfo?.name,
          blockNumber: log.blockNumber
        })
      }

      // Process ERC-20 inflows (max 30 logs)
      const erc20Batch = erc20Logs.slice(0, 30)
      for (const log of erc20Batch) {
        const from = '0x' + log.topics[1].slice(26)
        const to = '0x' + log.topics[2].slice(26)
        const value = BigInt(log.data)

        // Skip if this is not an outflow from address
        if (from.toLowerCase() !== address.toLowerCase()) continue

        let symbol = 'UNKNOWN'
        let decimals = 18
        try {
          const iface = new ethers.Interface(['function symbol() view returns (string)', 'function decimals() view returns (uint8)'])
          const symbolData = iface.encodeFunctionData('symbol')
          const decimalsData = iface.encodeFunctionData('decimals')
          const [symbolResult, decimalsResult] = await Promise.all([
            this.withTimeout(provider.call({ to: log.address, data: symbolData }), 3000).catch(() => '0x'),
            this.withTimeout(provider.call({ to: log.address, data: decimalsData }), 3000).catch(() => '0x')
          ])
          try { symbol = iface.decodeFunctionResult('symbol', symbolResult)[0] as string } catch {}
          try { decimals = Number(iface.decodeFunctionResult('decimals', decimalsResult)[0]) } catch {}
        } catch {}

        const exchangeInfo = isExchangeWallet(to)
        const drainerInfo = isKnownDrainer(to)

        transfers.push({
          hash: log.transactionHash,
          from,
          to,
          value: ethers.formatUnits(value, decimals),
          asset: symbol,
          chainId,
          chainName: chain.name,
          timestamp: blockTimestamps.get(log.blockNumber) || Date.now(),
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

    return transfers
  }

  // Track funds across multiple chains
  async trackAllChains(address: string, chainIds: number[] = [1, 8453, 56]): Promise<TrackedTransfer[]> {
    const allTransfers: TrackedTransfer[] = []

    // Parallel scan with 45s overall timeout
    const scanPromise = Promise.all(
      chainIds.map(chainId => this.trackOutflows(address, chainId))
    )

    const results = await Promise.race([
      scanPromise,
      new Promise<TrackedTransfer[][]>((resolve) => setTimeout(() => resolve([]), 45000))
    ])

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
