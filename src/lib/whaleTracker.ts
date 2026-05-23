// Whale Wallet Tracker
// Follow whale wallets, track buy/sell alerts, portfolio overviews,
// "smart money is moving" notifications, and whale leaderboards.

import { ethers } from 'ethers'
import { CHAINS } from './chains'

// ── Types ───────────────────────────────────────────────────

export type WhaleCategory = 'fund' | 'exchange' | 'defi' | 'trader' | 'unknown'
export type TxAction = 'buy' | 'sell' | 'transfer' | 'approve' | 'swap' | 'stake' | 'unstake'

export interface TrackedWhale {
  address: string
  label: string
  category: WhaleCategory
  estimatedNetWorth: number // USD
  chains: number[]
  tags: string[]
  followedAt: number
  lastActivity: number
  winRate?: number // percent
  totalTrades?: number
  profitLoss30d?: number // USD
  avatar?: string // emoji or URL
}

export interface WhalePortfolio {
  whaleAddress: string
  totalValue: number
  tokens: PortfolioToken[]
  nfts: number
  chains: { chainId: number; chainName: string; value: number }[]
  lastUpdated: string
}

export interface PortfolioToken {
  symbol: string
  name: string
  balance: string
  value: number
  price: number
  change24h: number
  chain: string
}

export interface WhaleTrade {
  id: string
  whaleAddress: string
  whaleLabel: string
  hash: string
  chain: number
  chainName: string
  action: TxAction
  token: string
  tokenSymbol: string
  amount: string
  amountFormatted: string
  priceUsd: number
  valueUsd: number
  timestamp: string
  profit?: number // estimated profit if known
}

export interface SmartMoneySignal {
  id: string
  type: 'accumulation' | 'distribution' | 'new_position' | 'exit' | 'rotation'
  token: string
  tokenSymbol: string
  whales: { address: string; label: string }[]
  totalValue: number
  chain: string
  confidence: number // 0-100
  message: string
  timestamp: string
  read: boolean
}

export interface WhaleLeaderboard {
  address: string
  label: string
  category: WhaleCategory
  netWorth: number
  winRate: number
  profit30d: number
  tradeCount: number
  followers: number
  rank: number
  trend: 'up' | 'down' | 'stable'
  avatar: string
}

export interface TrackerConfig {
  enabled: boolean
  minTradeValue: number // USD
  alertOnBuy: boolean
  alertOnSell: boolean
  alertOnNewPosition: boolean
  smartMoneyNotifications: boolean
  chains: number[]
  maxFollowed: number
}

export const DEFAULT_TRACKER_CONFIG: TrackerConfig = {
  enabled: true,
  minTradeValue: 100_000,
  alertOnBuy: true,
  alertOnSell: true,
  alertOnNewPosition: true,
  smartMoneyNotifications: true,
  chains: [1, 8453, 42161, 137, 10, 56],
  maxFollowed: 50,
}

// ── Known whales (seed data) ────────────────────────────────

const SEED_WHALES: TrackedWhale[] = [
  {
    address: '0x28c6c06298d514db089934071355e5743bf21d60',
    label: 'Binance Hot Wallet',
    category: 'exchange',
    estimatedNetWorth: 2_500_000_000,
    chains: [1, 56, 42161, 137],
    tags: ['exchange', 'top-tier'],
    followedAt: Date.now() - 86400000 * 30,
    lastActivity: Date.now() - 3600000,
    winRate: 72,
    totalTrades: 15420,
    profitLoss30d: 45_000_000,
    avatar: '🏛️',
  },
  {
    address: '0x1b3cb81e51011b549d78bf720b0d924ac763a7c2',
    label: 'Grayscale ETH Trust',
    category: 'fund',
    estimatedNetWorth: 3_200_000_000,
    chains: [1],
    tags: ['institutional', 'fund'],
    followedAt: Date.now() - 86400000 * 60,
    lastActivity: Date.now() - 7200000,
    winRate: 68,
    totalTrades: 320,
    profitLoss30d: 12_000_000,
    avatar: '🏦',
  },
  {
    address: '0x8103683202aa8da10536036edef04cdd865c225e',
    label: 'Wintermute',
    category: 'defi',
    estimatedNetWorth: 900_000_000,
    chains: [1, 42161, 137, 8453],
    tags: ['market-maker', 'defi'],
    followedAt: Date.now() - 86400000 * 45,
    lastActivity: Date.now() - 1800000,
    winRate: 65,
    totalTrades: 8200,
    profitLoss30d: 8_500_000,
    avatar: '🔮',
  },
  {
    address: '0x176f3dab24a159341c0509bb36b833e7fdd0a132',
    label: 'Jump Trading',
    category: 'defi',
    estimatedNetWorth: 2_000_000_000,
    chains: [1, 42161, 137],
    tags: ['market-maker', 'high-frequency'],
    followedAt: Date.now() - 86400000 * 90,
    lastActivity: Date.now() - 900000,
    winRate: 71,
    totalTrades: 22000,
    profitLoss30d: 32_000_000,
    avatar: '⚡',
  },
  {
    address: '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503',
    label: 'Justin Sun',
    category: 'trader',
    estimatedNetWorth: 1_500_000_000,
    chains: [1, 56, 42161],
    tags: ['individual', 'high-profile'],
    followedAt: Date.now() - 86400000 * 120,
    lastActivity: Date.now() - 14400000,
    winRate: 58,
    totalTrades: 1200,
    profitLoss30d: -2_000_000,
    avatar: '👤',
  },
  {
    address: '0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae',
    label: 'Ethereum Foundation',
    category: 'fund',
    estimatedNetWorth: 800_000_000,
    chains: [1],
    tags: ['foundation', 'long-term'],
    followedAt: Date.now() - 86400000 * 180,
    lastActivity: Date.now() - 86400000,
    winRate: 82,
    totalTrades: 45,
    profitLoss30d: 0,
    avatar: '🌐',
  },
  {
    address: '0x21a31ee1afc51d94c2efccaa2092ad1028285549',
    label: 'Binance Cold Wallet',
    category: 'exchange',
    estimatedNetWorth: 5_000_000_000,
    chains: [1],
    tags: ['exchange', 'cold-storage'],
    followedAt: Date.now() - 86400000 * 200,
    lastActivity: Date.now() - 172800000,
    winRate: 0,
    totalTrades: 12,
    profitLoss30d: 0,
    avatar: '🔒',
  },
  {
    address: '0x742d35cc6634c0532925a3b844bc9e7595f2bd3e',
    label: 'Bitfinex Hot Wallet',
    category: 'exchange',
    estimatedNetWorth: 1_800_000_000,
    chains: [1],
    tags: ['exchange'],
    followedAt: Date.now() - 86400000 * 150,
    lastActivity: Date.now() - 3600000,
    winRate: 0,
    totalTrades: 5400,
    profitLoss30d: 0,
    avatar: '🏛️',
  },
]

// Token price cache (simulated)
const TOKEN_PRICES: Record<string, { price: number; change24h: number }> = {
  ETH: { price: 3800, change24h: 2.5 },
  BTC: { price: 95000, change24h: 1.8 },
  USDC: { price: 1, change24h: 0 },
  USDT: { price: 1, change24h: 0.01 },
  DAI: { price: 1, change24h: -0.02 },
  UNI: { price: 12, change24h: -3.2 },
  AAVE: { price: 280, change24h: 5.1 },
  LINK: { price: 18, change24h: 1.5 },
  MKR: { price: 2500, change24h: -1.2 },
  PEPE: { price: 0.000012, change24h: 15.5 },
  ARB: { price: 1.2, change24h: -2.8 },
  OP: { price: 2.5, change24h: 3.1 },
  SOL: { price: 180, change24h: 4.2 },
}

// ── In-memory stores ────────────────────────────────────────

const followedWhales = new Map<string, TrackedWhale>()
const trades: WhaleTrade[] = []
const signals: SmartMoneySignal[] = []
let trackerConfig: TrackerConfig = { ...DEFAULT_TRACKER_CONFIG }

// Initialize with seed data
for (const whale of SEED_WHALES) {
  followedWhales.set(whale.address.toLowerCase(), whale)
}

// ── Helper ──────────────────────────────────────────────────

function generateId(): string {
  return `wt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function getTimeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

// ── Whale Management ────────────────────────────────────────

/**
 * Follow a new whale wallet
 */
export function followWhale(
  address: string,
  label: string,
  category: WhaleCategory = 'unknown',
  estimatedNetWorth: number = 0
): { success: boolean; whale?: TrackedWhale; error?: string } {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return { success: false, error: 'Invalid address' }
  }

  const normalized = address.toLowerCase()
  if (followedWhales.has(normalized)) {
    return { success: false, error: 'Already following this wallet' }
  }

  if (followedWhales.size >= trackerConfig.maxFollowed) {
    return { success: false, error: `Maximum ${trackerConfig.maxFollowed} followed wallets` }
  }

  const whale: TrackedWhale = {
    address: normalized,
    label,
    category,
    estimatedNetWorth,
    chains: [1],
    tags: [],
    followedAt: Date.now(),
    lastActivity: Date.now(),
    avatar: category === 'exchange' ? '🏛️' : category === 'fund' ? '🏦' : category === 'defi' ? '🔮' : '👤',
  }

  followedWhales.set(normalized, whale)
  return { success: true, whale }
}

/**
 * Unfollow a whale wallet
 */
export function unfollowWhale(address: string): { success: boolean; error?: string } {
  const normalized = address.toLowerCase()
  if (!followedWhales.has(normalized)) {
    return { success: false, error: 'Not following this wallet' }
  }
  followedWhales.delete(normalized)
  return { success: true }
}

/**
 * Get all followed whales
 */
export function getFollowedWhales(): TrackedWhale[] {
  return Array.from(followedWhales.values())
}

/**
 * Check if address is being followed
 */
export function isFollowing(address: string): boolean {
  return followedWhales.has(address.toLowerCase())
}

// ── Trade Scanning ──────────────────────────────────────────

/**
 * Scan for recent whale trades (simulated)
 */
export async function scanWhaleTrades(chainId?: number): Promise<WhaleTrade[]> {
  const chains = chainId ? [chainId] : trackerConfig.chains
  const newTrades: WhaleTrade[] = []

  for (const chain of chains) {
    const chainConfig = CHAINS[chain]
    if (!chainConfig) continue

    // Simulate finding trades for each followed whale
    const whales = Array.from(followedWhales.values()).filter(
      w => w.chains.includes(chain)
    )

    for (const whale of whales) {
      // Deterministic pseudo-random trade generation
      const hash = Math.abs(whale.address.charCodeAt(2) * 17 + chain * 31 + Date.now() % 10000)
      if (hash % 5 !== 0) continue // 20% chance per whale per scan

      const tokens = Object.keys(TOKEN_PRICES)
      const tokenSymbol = tokens[hash % tokens.length]
      const tokenPrice = TOKEN_PRICES[tokenSymbol]
      const actions: TxAction[] = ['buy', 'sell', 'swap', 'transfer']
      const action = actions[hash % actions.length]

      const amount = (hash % 10000 + 1) * (hash % 100 + 1)
      const valueUsd = amount * tokenPrice.price

      if (valueUsd < trackerConfig.minTradeValue) continue

      const trade: WhaleTrade = {
        id: generateId(),
        whaleAddress: whale.address,
        whaleLabel: whale.label,
        hash: `0x${Array.from({ length: 64 }, (_, i) => ((hash * (i + 1) * 13) & 0xf).toString(16)).join('')}`,
        chain,
        chainName: chainConfig.name,
        action,
        token: `0x${tokenSymbol.padStart(40, '0')}`,
        tokenSymbol,
        amount: amount.toString(),
        amountFormatted: amount.toLocaleString(),
        priceUsd: tokenPrice.price,
        valueUsd,
        timestamp: new Date(Date.now() - (hash % 86400000)).toISOString(),
      }

      newTrades.push(trade)
    }
  }

  // Store trades
  trades.unshift(...newTrades)
  if (trades.length > 1000) trades.length = 1000

  // Generate signals from trade patterns
  generateSignals(newTrades)

  return newTrades
}

/**
 * Generate smart money signals from trade patterns
 */
function generateSignals(newTrades: WhaleTrade[]): void {
  // Group by token
  const byToken = new Map<string, WhaleTrade[]>()
  for (const trade of newTrades) {
    const key = trade.tokenSymbol
    if (!byToken.has(key)) byToken.set(key, [])
    byToken.get(key)!.push(trade)
  }

  for (const [token, tokenTrades] of byToken) {
    if (tokenTrades.length < 2) continue

    const buyTrades = tokenTrades.filter(t => t.action === 'buy')
    const sellTrades = tokenTrades.filter(t => t.action === 'sell')

    // Accumulation signal (multiple whales buying)
    if (buyTrades.length >= 2) {
      const totalValue = buyTrades.reduce((s, t) => s + t.valueUsd, 0)
      signals.unshift({
        id: generateId(),
        type: 'accumulation',
        token: buyTrades[0].token,
        tokenSymbol: token,
        whales: buyTrades.map(t => ({ address: t.whaleAddress, label: t.whaleLabel })),
        totalValue,
        chain: buyTrades[0].chainName,
        confidence: Math.min(95, 50 + buyTrades.length * 15),
        message: `🐋 ${buyTrades.length} whales accumulating ${token} — $${(totalValue / 1_000_000).toFixed(1)}M moved`,
        timestamp: new Date().toISOString(),
        read: false,
      })
    }

    // Distribution signal (multiple whales selling)
    if (sellTrades.length >= 2) {
      const totalValue = sellTrades.reduce((s, t) => s + t.valueUsd, 0)
      signals.unshift({
        id: generateId(),
        type: 'distribution',
        token: sellTrades[0].token,
        tokenSymbol: token,
        whales: sellTrades.map(t => ({ address: t.whaleAddress, label: t.whaleLabel })),
        totalValue,
        chain: sellTrades[0].chainName,
        confidence: Math.min(90, 40 + sellTrades.length * 15),
        message: `🐋 ${sellTrades.length} whales distributing ${token} — $${(totalValue / 1_000_000).toFixed(1)}M sold`,
        timestamp: new Date().toISOString(),
        read: false,
      })
    }
  }

  // Keep signals manageable
  if (signals.length > 100) signals.length = 100
}

// ── Portfolio ───────────────────────────────────────────────

/**
 * Get a whale's portfolio overview (simulated)
 */
export async function getWhalePortfolio(address: string): Promise<WhalePortfolio | null> {
  const whale = followedWhales.get(address.toLowerCase())
  if (!whale) return null

  // Simulated portfolio based on whale size
  const hash = Math.abs(address.charCodeAt(2) * 31 + address.charCodeAt(5) * 17)
  const tokens: PortfolioToken[] = []

  const tokenList = Object.entries(TOKEN_PRICES)
  for (let i = 0; i < Math.min(6, tokenList.length); i++) {
    const [symbol, info] = tokenList[(hash + i) % tokenList.length]
    const balance = ((hash * (i + 1) * 100) % 1000000) + 100
    tokens.push({
      symbol,
      name: symbol,
      balance: balance.toLocaleString(),
      value: balance * info.price,
      price: info.price,
      change24h: info.change24h,
      chain: 'Ethereum',
    })
  }

  const totalValue = tokens.reduce((s, t) => s + t.value, 0)

  return {
    whaleAddress: address,
    totalValue,
    tokens,
    nfts: hash % 50,
    chains: [
      { chainId: 1, chainName: 'Ethereum', value: totalValue * 0.6 },
      { chainId: 8453, chainName: 'Base', value: totalValue * 0.2 },
      { chainId: 42161, chainName: 'Arbitrum', value: totalValue * 0.15 },
      { chainId: 137, chainName: 'Polygon', value: totalValue * 0.05 },
    ],
    lastUpdated: new Date().toISOString(),
  }
}

// ── Leaderboard ─────────────────────────────────────────────

/**
 * Get whale leaderboard
 */
export function getLeaderboard(): WhaleLeaderboard[] {
  const whales = Array.from(followedWhales.values())

  return whales
    .map((w, i) => ({
      address: w.address,
      label: w.label,
      category: w.category,
      netWorth: w.estimatedNetWorth,
      winRate: w.winRate || 0,
      profit30d: w.profitLoss30d || 0,
      tradeCount: w.totalTrades || 0,
      followers: Math.floor(Math.random() * 5000) + 100, // simulated
      rank: 0,
      trend: (w.profitLoss30d || 0) > 0 ? 'up' as const : (w.profitLoss30d || 0) < 0 ? 'down' as const : 'stable' as const,
      avatar: w.avatar || '👤',
    }))
    .sort((a, b) => b.netWorth - a.netWorth)
    .map((w, i) => ({ ...w, rank: i + 1 }))
}

// ── Signals ─────────────────────────────────────────────────

/**
 * Get smart money signals
 */
export function getSignals(limit: number = 20): SmartMoneySignal[] {
  return signals.slice(0, limit)
}

/**
 * Mark signal as read
 */
export function markSignalRead(signalId: string): void {
  const signal = signals.find(s => s.id === signalId)
  if (signal) signal.read = true
}

/**
 * Mark all signals as read
 */
export function markAllSignalsRead(): void {
  signals.forEach(s => { s.read = true })
}

/**
 * Get unread signal count
 */
export function getUnreadSignalCount(): number {
  return signals.filter(s => !s.read).length
}

// ── Config ──────────────────────────────────────────────────

export function getTrackerConfig(): TrackerConfig {
  return { ...trackerConfig }
}

export function updateTrackerConfig(updates: Partial<TrackerConfig>): void {
  trackerConfig = { ...trackerConfig, ...updates }
}

// ── Stats ───────────────────────────────────────────────────

export function getTrackerStats(): {
  followedCount: number
  totalTrades: number
  totalSignals: number
  unreadSignals: number
  topWhale: string
} {
  const topWhale = Array.from(followedWhales.values())
    .sort((a, b) => b.estimatedNetWorth - a.estimatedNetWorth)[0]

  return {
    followedCount: followedWhales.size,
    totalTrades: trades.length,
    totalSignals: signals.length,
    unreadSignals: getUnreadSignalCount(),
    topWhale: topWhale?.label || 'None',
  }
}

/**
 * Get recent trades
 */
export function getRecentTrades(limit: number = 50): WhaleTrade[] {
  return trades.slice(0, limit)
}

/**
 * Format USD value
 */
export function formatUSD(val: number): string {
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${val.toFixed(0)}`
}
