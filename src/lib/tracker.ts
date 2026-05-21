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
    const addrLower = address.toLowerCase()

    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc)

      // Get current block with timeout
      const latestBlock = await this.withTimeout(provider.getBlockNumber(), 8000).catch(() => 0)
      if (!latestBlock) return []

      // Scan last 5000 blocks (~17 hours on ETH, varies by chain)
      const startBlock = Math.max(0, latestBlock - 5000)

      // ── Strategy 1: ERC-20 Token Transfer events (from address) ──
      const tokenLogs = await this.withTimeout(provider.getLogs({
        fromBlock: startBlock,
        toBlock: latestBlock,
        topics: [
          ethers.id('Transfer(address,address,uint256)'),
          ethers.zeroPadValue(address, 32)
        ]
      }), 10000).catch(() => [])

      // ── Strategy 2: Native ETH outflows — scan recent blocks for txs from address ──
      // getLogs doesn't work for native ETH (no Transfer event)
      // Instead, scan the last 200 blocks by fetching block headers with tx hashes
      const nativeScanEnd = latestBlock
      const nativeScanStart = Math.max(0, nativeScanEnd - 200)
      const blockPromises: Promise<void>[] = []

      for (let bn = nativeScanStart; bn <= nativeScanEnd; bn++) {
        blockPromises.push(
          this.withTimeout(provider.getBlock(bn, true), 5000).then(block => {
            if (!block || !block.prefetchedTransactions) return
            for (const tx of block.prefetchedTransactions) {
              if (tx.from?.toLowerCase() !== addrLower) continue
              if (!tx.to || tx.value === 0n) continue // Skip contract creation and zero-value

              const exchangeInfo = isExchangeWallet(tx.to)
              const drainerInfo = isKnownDrainer(tx.to)

              transfers.push({
                hash: tx.hash,
                from: address,
                to: tx.to,
                value: ethers.formatEther(tx.value),
                asset: chain.nativeCurrency,
                chainId,
                chainName: chain.name,
                timestamp: block.timestamp * 1000,
                isExchangeDeposit: !!exchangeInfo,
                exchangeName: exchangeInfo?.name,
                isDrainerTransfer: !!drainerInfo,
                drainerName: drainerInfo?.name,
                blockNumber: bn
              })
            }
          }).catch(() => {})
        )
      }

      // Run native scan and token log processing in parallel
      await Promise.all(blockPromises)

      // ── Process ERC-20 token transfer logs ──
      // Batch fetch block timestamps
      const uniqueBlocks = new Set<number>()
      for (const log of tokenLogs) uniqueBlocks.add(log.blockNumber)
      const blockTimestamps = new Map<number, number>()
      await Promise.all(
        [...uniqueBlocks].slice(0, 50).map(async (bn) => {
          try {
            const block = await this.withTimeout(provider.getBlock(bn), 5000)
            if (block) blockTimestamps.set(bn, block.timestamp * 1000)
          } catch {}
        })
      )

      // Fetch token symbols for unique token addresses
      const tokenAddresses = new Set<string>()
      for (const log of tokenLogs) {
        if (log.address) tokenAddresses.add(log.address.toLowerCase())
      }
      const tokenInfoMap = new Map<string, { symbol: string; decimals: number }>()
      await Promise.all(
        [...tokenAddresses].slice(0, 30).map(async (tokenAddr) => {
          try {
            const contract = new ethers.Contract(tokenAddr, [
              'function symbol() view returns (string)',
              'function decimals() view returns (uint8)'
            ], provider)
            const [symbol, decimals] = await Promise.all([
              this.withTimeout(contract.symbol(), 5000).catch(() => 'UNKNOWN'),
              this.withTimeout(contract.decimals(), 5000).catch(() => 18)
            ])
            tokenInfoMap.set(tokenAddr.toLowerCase(), { symbol, decimals })
          } catch {}
        })
      )

      for (const log of tokenLogs) {
        const to = '0x' + log.topics[2].slice(26)
        const value = BigInt(log.data)
        if (value === 0n) continue

        const tokenAddr = log.address.toLowerCase()
        const tokenInfo = tokenInfoMap.get(tokenAddr) || { symbol: 'UNKNOWN', decimals: 18 }

        const exchangeInfo = isExchangeWallet(to)
        const drainerInfo = isKnownDrainer(to)

        transfers.push({
          hash: log.transactionHash,
          from: address,
          to,
          value: ethers.formatUnits(value, tokenInfo.decimals),
          asset: tokenInfo.symbol,
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
