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

export class TransactionTracker {
  // Timeout wrapper
  private async withTimeout<T>(promise: Promise<T>, ms: number = 10000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ])
  }

  // Track outflows using Blockscout API (fast, indexed)
  private async trackViaBlockscout(address: string, chainId: number): Promise<TrackedTransfer[]> {
    const explorerApis: Record<number, string> = {
      1: 'https://eth.blockscout.com/api/v2',
      8453: 'https://base.blockscout.com/api/v2',
      56: 'https://bsc.blockscout.com/api/v2',
      42161: 'https://arbitrum.blockscout.com/api/v2',
      137: 'https://polygon.blockscout.com/api/v2',
      10: 'https://optimism.blockscout.com/api/v2',
      43114: 'https://avalanche.blockscout.com/api/v2',
      250: 'https://fantom.blockscout.com/api/v2',
      81457: 'https://blast.blockscout.com/api/v2',
      324: 'https://zksync.blockscout.com/api/v2',
      59144: 'https://linea.blockscout.com/api/v2',
      5000: 'https://mantle.blockscout.com/api/v2',
      534352: 'https://scroll.blockscout.com/api/v2',
      100: 'https://gnosis.blockscout.com/api/v2',
      7000: 'https://zetachain.blockscout.com/api/v2',
      80094: 'https://berachain.blockscout.com/api/v2',
    }

    const baseUrl = explorerApis[chainId]
    if (!baseUrl) return []

    const transfers: TrackedTransfer[] = []
    const chain = CHAINS[chainId]
    if (!chain) return []

    try {
      // Fetch native transactions from Blockscout
      const txUrl = `${baseUrl}/addresses/${address}/transactions`
      const [txResponse, tokenResponse] = await Promise.all([
        this.withTimeout(fetch(txUrl), 10000).catch(() => null),
        this.withTimeout(fetch(`${baseUrl}/addresses/${address}/token-transfers`), 10000).catch(() => null)
      ])

      // Process native transactions
      if (txResponse && txResponse.ok) {
        const txData = await txResponse.json()
        const txs = txData.items || []

        for (const tx of txs) {
          // Only outgoing transactions
          if (tx.from?.hash?.toLowerCase() !== address.toLowerCase()) continue

          const to = tx.to?.hash || ''
          const value = tx.value ? BigInt(tx.value) : 0n
          const timestamp = tx.timestamp ? new Date(tx.timestamp).getTime() : Date.now()

          const exchangeInfo = isExchangeWallet(to)
          const drainerInfo = isKnownDrainer(to)

          // Native transfer
          if (value > 0n) {
            transfers.push({
              hash: tx.hash,
              from: address,
              to,
              value: ethers.formatEther(value),
              asset: chain.nativeCurrency,
              chainId,
              chainName: chain.name,
              timestamp,
              isExchangeDeposit: !!exchangeInfo,
              exchangeName: exchangeInfo?.name,
              isDrainerTransfer: !!drainerInfo,
              drainerName: drainerInfo?.name,
              blockNumber: tx.block_number || 0
            })
          }
        }
      }

      // Process token transfers
      if (tokenResponse && tokenResponse.ok) {
        const tokenData = await tokenResponse.json()
        const tokenTxs = tokenData.items || []

        for (const tt of tokenTxs) {
          if (tt.from?.hash?.toLowerCase() !== address.toLowerCase()) continue

          const tokenTo = tt.to?.hash || ''
          const tokenValue = tt.total?.value ? BigInt(tt.total.value) : 0n
          const tokenDecimals = tt.total?.decimals || 18
          const tokenSymbol = tt.token?.symbol || tt.total?.symbol || 'UNKNOWN'
          const timestamp = tt.timestamp ? new Date(tt.timestamp).getTime() : Date.now()

          const tokenExchangeInfo = isExchangeWallet(tokenTo)
          const tokenDrainerInfo = isKnownDrainer(tokenTo)

          transfers.push({
            hash: tt.tx_hash || '',
            from: address,
            to: tokenTo,
            value: ethers.formatUnits(tokenValue, tokenDecimals),
            asset: tokenSymbol,
            chainId,
            chainName: chain.name,
            timestamp,
            isExchangeDeposit: !!tokenExchangeInfo,
            exchangeName: tokenExchangeInfo?.name,
            isDrainerTransfer: !!tokenDrainerInfo,
            drainerName: tokenDrainerInfo?.name,
            blockNumber: 0
          })
        }
      }
    } catch {
      // Skip errors
    }

    return transfers
  }

  // Track outflows using RPC getLogs (fallback for chains without Blockscout)
  private async trackViaRPC(address: string, chainId: number): Promise<TrackedTransfer[]> {
    const chain = CHAINS[chainId]
    if (!chain) return []

    const transfers: TrackedTransfer[] = []

    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc)

      // Get current block with timeout
      const latestBlock = await this.withTimeout(provider.getBlockNumber(), 8000).catch(() => 0)
      if (!latestBlock) return []

      // Scan last 10000 blocks (covers weeks on most chains)
      const startBlock = Math.max(0, latestBlock - 10000)

      // Native outflows
      const nativeLogs = await this.withTimeout(provider.getLogs({
        fromBlock: startBlock,
        toBlock: latestBlock,
        topics: [
          ethers.id('Transfer(address,address,uint256)'),
          ethers.zeroPadValue(address, 32)
        ]
      }), 10000).catch(() => [])

      // Batch fetch block timestamps (max 20)
      const uniqueBlocks = new Set<number>()
      for (const log of nativeLogs) uniqueBlocks.add(log.blockNumber)
      const blockTimestamps = new Map<number, number>()
      await Promise.all(
        [...uniqueBlocks].slice(0, 20).map(async (bn) => {
          try {
            const block = await this.withTimeout(provider.getBlock(bn), 5000)
            if (block) blockTimestamps.set(bn, block.timestamp * 1000)
          } catch {}
        })
      )

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
    } catch {
      // Skip errors
    }

    return transfers
  }

  // Track all chains (Blockscout API first, RPC fallback)
  async trackAllChains(address: string, chainIds: number[] = [1, 8453, 56]): Promise<TrackedTransfer[]> {
    const allTransfers: TrackedTransfer[] = []

    // Scan all chains in parallel with 40s overall timeout
    const scanPromise = Promise.all(
      chainIds.map(async (chainId) => {
        try {
          // Try Blockscout API first (fast, indexed)
          const blockscoutResults = await this.trackViaBlockscout(address, chainId)
          if (blockscoutResults.length > 0) return blockscoutResults

          // Fallback to RPC for chains without Blockscout
          return await this.trackViaRPC(address, chainId)
        } catch {
          return []
        }
      })
    )

    const results = await Promise.race([
      scanPromise,
      new Promise<TrackedTransfer[][]>((resolve) => setTimeout(() => resolve([]), 40000))
    ])

    results.forEach(transfers => allTransfers.push(...transfers))

    // Deduplicate by tx hash + chain
    const seen = new Set<string>()
    const unique = allTransfers.filter(t => {
      const key = `${t.chainId}:${t.hash}:${t.to}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return unique.sort((a, b) => b.timestamp - a.timestamp)
  }
}

export const tracker = new TransactionTracker()

// Check if funds reached an exchange
export async function checkExchangeDeposit(address: string, chainId: number): Promise<{ deposited: boolean; exchange?: string; txHash?: string }> {
  const transfers = await tracker.trackAllChains(address, [chainId])
  for (const transfer of transfers) {
    if (transfer.isExchangeDeposit) {
      return { deposited: true, exchange: transfer.exchangeName, txHash: transfer.hash }
    }
  }
  return { deposited: false }
}
