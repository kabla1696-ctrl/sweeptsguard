// Whale Alert System — Track whale wallets and alert on suspicious token movements
import { ethers } from 'ethers'
import { CHAINS, type ChainConfig } from './chains'

export interface WhaleWallet {
  address: string
  label: string
  estimatedValue: number // USD
  chains: number[]
  lastActivity: string
  category: 'fund' | 'exchange' | 'defi' | 'individual' | 'unknown'
}

export interface WhaleTransaction {
  hash: string
  chain: number
  chainName: string
  from: string
  fromLabel: string
  to: string
  toLabel: string
  token: string
  tokenSymbol: string
  amount: string
  amountFormatted: string
  usdValue: number
  timestamp: string
  type: 'buy' | 'sell' | 'transfer' | 'approve'
  suspicious: boolean
  suspiciousReasons: string[]
}

export interface WhaleAlert {
  id: string
  level: 'info' | 'warning' | 'critical'
  title: string
  message: string
  whaleAddress: string
  whaleLabel: string
  token: string
  tokenSymbol: string
  amount: string
  usdValue: number
  chain: number
  chainName: string
  txHash: string
  timestamp: string
  read: boolean
}

export interface WhaleAlertConfig {
  enabled: boolean
  minValueUSD: number // Minimum transaction value to alert on (default $1M)
  watchlistOnly: boolean // Only alert on watchlist wallets
  alertOnBuy: boolean
  alertOnSell: boolean
  alertOnTransfer: boolean
  suspiciousTokenAlerts: boolean // Alert when whales buy new/suspicious tokens
  chains: number[]
}

export const DEFAULT_WHALE_CONFIG: WhaleAlertConfig = {
  enabled: true,
  minValueUSD: 1_000_000,
  watchlistOnly: false,
  alertOnBuy: true,
  alertOnSell: true,
  alertOnTransfer: true,
  suspiciousTokenAlerts: true,
  chains: [1, 8453, 42161, 137, 10, 56],
}

// Well-known whale addresses (public knowledge)
const KNOWN_WHALES: WhaleWallet[] = [
  {
    address: '0x28c6c06298d514db089934071355e5743bf21d60',
    label: 'Binance Hot Wallet',
    estimatedValue: 2_500_000_000,
    chains: [1, 56, 42161, 137],
    lastActivity: new Date().toISOString(),
    category: 'exchange',
  },
  {
    address: '0x21a31ee1afc51d94c2efccaa2092ad1028285549',
    label: 'Binance Cold Wallet',
    estimatedValue: 5_000_000_000,
    chains: [1],
    lastActivity: new Date().toISOString(),
    category: 'exchange',
  },
  {
    address: '0x742d35cc6634c0532925a3b844bc9e7595f2bd3e',
    label: 'Bitfinex Hot Wallet',
    estimatedValue: 1_800_000_000,
    chains: [1],
    lastActivity: new Date().toISOString(),
    category: 'exchange',
  },
  {
    address: '0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae',
    label: 'Ethereum Foundation',
    estimatedValue: 800_000_000,
    chains: [1],
    lastActivity: new Date().toISOString(),
    category: 'fund',
  },
  {
    address: '0x1b3cb81e51011b549d78bf720b0d924ac763a7c2',
    label: 'Grayscale ETH Trust',
    estimatedValue: 3_200_000_000,
    chains: [1],
    lastActivity: new Date().toISOString(),
    category: 'fund',
  },
  {
    address: '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503',
    label: 'Justin Sun / Poloniex',
    estimatedValue: 1_500_000_000,
    chains: [1, 56, 42161],
    lastActivity: new Date().toISOString(),
    category: 'individual',
  },
  {
    address: '0x176f3dab24a159341c0509bb36b833e7fdd0a132',
    label: 'Jump Trading',
    estimatedValue: 2_000_000_000,
    chains: [1, 42161, 137],
    lastActivity: new Date().toISOString(),
    category: 'defi',
  },
  {
    address: '0x8103683202aa8da10536036edef04cdd865c225e',
    label: 'Wintermute',
    estimatedValue: 900_000_000,
    chains: [1, 42161, 137, 8453],
    lastActivity: new Date().toISOString(),
    category: 'defi',
  },
]

// Suspicious token patterns that may indicate manipulation
const SUSPICIOUS_PATTERNS = [
  { pattern: /safe|moon|elon|musk|doge|shib|pepe|wojak/i, reason: 'Meme/hype token' },
  { pattern: /wrapped|bridged|synthetic/i, reason: 'Wrapped asset — verify legitimacy' },
  { pattern: /rebase|elastic|algorithmic/i, reason: 'Rebase/algorithmic token — high risk' },
]

export class WhaleAlertSystem {
  private config: WhaleAlertConfig
  private watchlist: Map<string, WhaleWallet>
  private alerts: WhaleAlert[] = []
  private recentTransactions: WhaleTransaction[] = []
  private pollingInterval: ReturnType<typeof setInterval> | null = null

  constructor(config: Partial<WhaleAlertConfig> = {}) {
    this.config = { ...DEFAULT_WHALE_CONFIG, ...config }
    this.watchlist = new Map()

    // Load known whales into watchlist
    for (const whale of KNOWN_WHALES) {
      this.watchlist.set(whale.address.toLowerCase(), whale)
    }
  }

  // Add a custom whale to the watchlist
  addWatchlistWallet(wallet: WhaleWallet): void {
    this.watchlist.set(wallet.address.toLowerCase(), wallet)
  }

  // Remove a wallet from the watchlist
  removeWatchlistWallet(address: string): void {
    this.watchlist.delete(address.toLowerCase())
  }

  // Get the full watchlist
  getWatchlist(): WhaleWallet[] {
    return Array.from(this.watchlist.values())
  }

  // Update config
  updateConfig(config: Partial<WhaleAlertConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): WhaleAlertConfig {
    return { ...this.config }
  }

  // Get recent alerts
  getAlerts(limit: number = 50): WhaleAlert[] {
    return this.alerts.slice(0, limit)
  }

  // Mark alert as read
  markAlertRead(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) alert.read = true
  }

  // Mark all alerts as read
  markAllRead(): void {
    this.alerts.forEach(a => { a.read = true })
  }

  // Get unread count
  getUnreadCount(): number {
    return this.alerts.filter(a => !a.read).length
  }

  // Get recent transactions
  getRecentTransactions(limit: number = 100): WhaleTransaction[] {
    return this.recentTransactions.slice(0, limit)
  }

  // Scan a specific chain for whale activity
  async scanChain(chainId: number): Promise<WhaleTransaction[]> {
    const chain = CHAINS[chainId]
    if (!chain) return []

    const provider = new ethers.JsonRpcProvider(chain.rpc)
    const transactions: WhaleTransaction[] = []

    try {
      const currentBlock = await provider.getBlockNumber()
      const fromBlock = Math.max(0, currentBlock - 100) // Last ~100 blocks

      // Get large Transfer events
      const transferTopic = ethers.id('Transfer(address,address,uint256)')
      const logs = await provider.getLogs({
        fromBlock,
        toBlock: 'latest',
        topics: [transferTopic],
      }).catch(() => [])

      // Process logs in batches
      const uniqueTokens = new Set<string>()
      const uniqueAddresses = new Set<string>()

      for (const log of logs.slice(0, 500)) {
        uniqueTokens.add(log.address)
        const iface = new ethers.Interface(['event Transfer(address indexed from, address indexed to, uint256 value)'])
        try {
          const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data })
          if (parsed) {
            uniqueAddresses.add(parsed.args.from.toLowerCase())
            uniqueAddresses.add(parsed.args.to.toLowerCase())
          }
        } catch {}
      }

      // Check which addresses are whales
      const whaleAddresses = new Set<string>()
      for (const addr of uniqueAddresses) {
        if (this.watchlist.has(addr)) {
          whaleAddresses.add(addr)
        }
      }

      // Get token info for relevant tokens
      const tokenInfoMap = new Map<string, { symbol: string; decimals: number }>()
      for (const tokenAddr of uniqueTokens) {
        try {
          const iface = new ethers.Interface([
            'function symbol() view returns (string)',
            'function decimals() view returns (uint8)',
          ])
          const [symbolData, decimalsData] = await Promise.all([
            provider.call({ to: tokenAddr, data: iface.encodeFunctionData('symbol') }).catch(() => '0x'),
            provider.call({ to: tokenAddr, data: iface.encodeFunctionData('decimals') }).catch(() => '0x'),
          ])

          let symbol = 'UNKNOWN'
          let decimals = 18
          try {
            if (symbolData !== '0x' && symbolData.length > 2) {
              symbol = iface.decodeFunctionResult('symbol', symbolData)[0] as string
            }
          } catch {}
          try {
            if (decimalsData !== '0x' && decimalsData.length > 2) {
              decimals = Number(iface.decodeFunctionResult('decimals', decimalsData)[0])
            }
          } catch {}

          tokenInfoMap.set(tokenAddr.toLowerCase(), { symbol, decimals })
        } catch {}
      }

      // Parse whale transactions
      const iface = new ethers.Interface(['event Transfer(address indexed from, address indexed to, uint256 value)'])
      const blockTimestamps = new Map<number, number>()

      for (const log of logs.slice(0, 500)) {
        try {
          const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data })
          if (!parsed) continue

          const from = parsed.args.from.toLowerCase()
          const to = parsed.args.to.toLowerCase()
          const isFromWhale = whaleAddresses.has(from)
          const isToWhale = whaleAddresses.has(to)

          if (!isFromWhale && !isToWhale) continue

          const tokenInfo = tokenInfoMap.get(log.address.toLowerCase()) || { symbol: 'UNKNOWN', decimals: 18 }
          const amount = parsed.args.value.toString()
          const amountFormatted = ethers.formatUnits(amount, tokenInfo.decimals)
          const amountNum = parseFloat(amountFormatted)

          // Skip dust transfers
          if (amountNum < 0.001) continue

          // Get block timestamp
          if (!blockTimestamps.has(log.blockNumber)) {
            try {
              const block = await provider.getBlock(log.blockNumber)
              if (block) blockTimestamps.set(log.blockNumber, Number(block.timestamp))
            } catch {}
          }
          const timestamp = blockTimestamps.get(log.blockNumber)
            ? new Date(blockTimestamps.get(log.blockNumber)! * 1000).toISOString()
            : new Date().toISOString()

          // Determine transaction type
          let txType: WhaleTransaction['type'] = 'transfer'
          const suspiciousReasons: string[] = []

          // Check if token name matches suspicious patterns
          for (const { pattern, reason } of SUSPICIOUS_PATTERNS) {
            if (pattern.test(tokenInfo.symbol)) {
              suspiciousReasons.push(reason)
            }
          }

          // Check if it's a new/small-cap token (likely suspicious if whale is buying)
          if (isToWhale && suspiciousReasons.length > 0) {
            txType = 'buy'
          } else if (isFromWhale) {
            txType = 'sell'
          }

          const fromWallet = this.watchlist.get(from)
          const toWallet = this.watchlist.get(to)

          transactions.push({
            hash: log.transactionHash,
            chain: chainId,
            chainName: chain.name,
            from,
            fromLabel: fromWallet?.label || `${from.slice(0, 6)}...${from.slice(-4)}`,
            to,
            toLabel: toWallet?.label || `${to.slice(0, 6)}...${to.slice(-4)}`,
            token: log.address,
            tokenSymbol: tokenInfo.symbol,
            amount,
            amountFormatted,
            usdValue: 0, // TODO: Price API integration
            timestamp,
            type: txType,
            suspicious: suspiciousReasons.length > 0,
            suspiciousReasons,
          })
        } catch {}
      }
    } catch (err) {
      console.error(`Whale scan failed for chain ${chainId}:`, err)
    }

    return transactions
  }

  // Scan all configured chains
  async scanAllChains(): Promise<WhaleTransaction[]> {
    const allTxns: WhaleTransaction[] = []
    const promises = this.config.chains.map(chainId => this.scanChain(chainId))
    const results = await Promise.allSettled(promises)

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allTxns.push(...result.value)
      }
    }

    // Sort by timestamp descending
    allTxns.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Store and generate alerts
    this.recentTransactions = [...allTxns, ...this.recentTransactions].slice(0, 500)
    this.generateAlerts(allTxns)

    return allTxns
  }

  // Generate alerts from transactions
  private generateAlerts(transactions: WhaleTransaction[]): void {
    for (const tx of transactions) {
      const fromWhale = this.watchlist.get(tx.from)
      const toWhale = this.watchlist.get(tx.to)
      const whale = fromWhale || toWhale
      if (!whale) continue

      // Check if we should alert
      if (this.config.watchlistOnly && !this.watchlist.has(tx.from) && !this.watchlist.has(tx.to)) {
        continue
      }

      let shouldAlert = false
      let level: WhaleAlert['level'] = 'info'
      let title = ''
      let message = ''

      if (tx.suspicious && this.config.suspiciousTokenAlerts) {
        shouldAlert = true
        level = 'warning'
        title = `🐋 Whale Buying Suspicious Token`
        message = `${whale.label} (${whale.address.slice(0, 8)}...) bought ${tx.amountFormatted} ${tx.tokenSymbol}\n⚠️ ${tx.suspiciousReasons.join(', ')}`
      } else if (tx.type === 'buy' && this.config.alertOnBuy) {
        shouldAlert = true
        title = `🐋 Whale Buy Detected`
        message = `${whale.label} bought ${tx.amountFormatted} ${tx.tokenSymbol} on ${tx.chainName}`
      } else if (tx.type === 'sell' && this.config.alertOnSell) {
        shouldAlert = true
        level = 'warning'
        title = `🐋 Whale Sell Detected`
        message = `${whale.label} sold ${tx.amountFormatted} ${tx.tokenSymbol} on ${tx.chainName}`
      } else if (tx.type === 'transfer' && this.config.alertOnTransfer) {
        shouldAlert = true
        title = `🐋 Whale Transfer`
        message = `${whale.label} moved ${tx.amountFormatted} ${tx.tokenSymbol} on ${tx.chainName}`
      }

      if (shouldAlert) {
        // Deduplicate: don't alert on the same tx twice
        if (this.alerts.some(a => a.txHash === tx.hash)) continue

        this.alerts.unshift({
          id: `whale-${tx.hash}-${Date.now()}`,
          level,
          title,
          message,
          whaleAddress: whale.address,
          whaleLabel: whale.label,
          token: tx.token,
          tokenSymbol: tx.tokenSymbol,
          amount: tx.amountFormatted,
          usdValue: tx.usdValue,
          chain: tx.chain,
          chainName: tx.chainName,
          txHash: tx.hash,
          timestamp: tx.timestamp,
          read: false,
        })
      }
    }

    // Keep alerts list manageable
    if (this.alerts.length > 200) {
      this.alerts = this.alerts.slice(0, 200)
    }
  }

  // Start polling for whale activity
  startPolling(intervalMs: number = 60_000): void {
    if (this.pollingInterval) return
    this.pollingInterval = setInterval(() => {
      this.scanAllChains().catch(err => {
        console.error('Whale alert polling error:', err)
      })
    }, intervalMs)
    // Initial scan
    this.scanAllChains().catch(() => {})
  }

  // Stop polling
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
  }

  // Check if an address is a known whale
  isWhale(address: string): WhaleWallet | undefined {
    return this.watchlist.get(address.toLowerCase())
  }

  // Get whale stats
  getStats(): { totalWhales: number; totalAlerts: number; unreadAlerts: number; recentTxCount: number } {
    return {
      totalWhales: this.watchlist.size,
      totalAlerts: this.alerts.length,
      unreadAlerts: this.getUnreadCount(),
      recentTxCount: this.recentTransactions.length,
    }
  }
}

// Singleton instance
export const whaleAlerts = new WhaleAlertSystem()
