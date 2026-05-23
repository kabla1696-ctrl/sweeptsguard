// Live Drainer Map — Real-time drainer activity visualization
// Tracks drainer activity across chains with heatmap and transaction feeds

import { CHAINS, SOLANA_CHAIN, type ChainConfig } from './chains'
import { KNOWN_DRAINERS, type DrainerInfo } from './draindb'

// ── Types ───────────────────────────────────────────────────

export interface DrainerTransaction {
  hash: string
  chainId: number
  chainName: string
  chainIcon: string
  from: string // drainer address
  to: string // victim address
  value: string
  valueUsd: number
  token: string
  timestamp: number
  drainerName: string
  drainerType: string
  method: 'eip7702' | 'approval' | 'permit' | 'seaport' | 'multicall' | 'sweep'
}

export interface ChainActivity {
  chainId: number
  chainName: string
  chainIcon: string
  totalDrainedUsd: number
  transactionCount: number
  activeDrainers: number
  lastActivity: number
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  topDrainer: string
  trend: 'rising' | 'stable' | 'falling'
  region: string // geographic region for heatmap
}

export interface DrainerCluster {
  id: string
  name: string
  addresses: string[]
  chains: number[]
  totalDrainedUsd: number
  transactionCount: number
  firstSeen: number
  lastActive: number
  type: string
  riskScore: number // 0-100
}

export interface HeatmapDataPoint {
  chainId: number
  chainName: string
  value: number // intensity 0-1
  totalUsd: number
  txCount: number
}

export interface DrainerMapStats {
  totalDrainedUsd24h: number
  totalDrainedUsd7d: number
  totalDrainedUsd30d: number
  totalTransactions24h: number
  activeDrainers: number
  activeChains: number
  mostTargetedChain: string
  newestDrainer: string
  timestamp: number
}

export interface TimePeriodStats {
  period: '24h' | '7d' | '30d'
  totalUsd: number
  txCount: number
  topChain: { name: string; usd: number }
  topDrainer: { name: string; usd: number }
}

// ── Simulated Data (would come from on-chain monitoring in production) ──

const CHAIN_REGIONS: Record<number, string> = {
  1: 'North America',
  8453: 'North America',
  42161: 'North America',
  137: 'Asia',
  56: 'Asia',
  10: 'North America',
  43114: 'North America',
  250: 'Europe',
  324: 'Europe',
  59144: 'Europe',
  81457: 'North America',
  5000: 'Asia',
  534352: 'Asia',
  100: 'Europe',
  7000: 'Global',
  80094: 'North America',
}

// Generate realistic mock transactions
function generateMockTransactions(): DrainerTransaction[] {
  const now = Date.now()
  const txs: DrainerTransaction[] = []
  const chainIds = Object.keys(CHAINS).map(Number)

  for (let i = 0; i < 50; i++) {
    const chainId = chainIds[Math.floor(Math.random() * chainIds.length)]
    const chain = CHAINS[chainId]
    const drainer = KNOWN_DRAINERS[Math.floor(Math.random() * Math.min(KNOWN_DRAINERS.length, 5))]
    const valueUsd = Math.random() * 50000 + 100

    txs.push({
      hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      chainId,
      chainName: chain.name,
      chainIcon: chain.icon,
      from: drainer.address,
      to: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      value: (valueUsd / 3000).toFixed(6),
      valueUsd,
      token: Math.random() > 0.5 ? 'ETH' : 'USDC',
      timestamp: now - Math.floor(Math.random() * 24 * 60 * 60 * 1000),
      drainerName: drainer.name,
      drainerType: drainer.type,
      method: (['eip7702', 'approval', 'permit', 'seaport', 'multicall', 'sweep'] as const)[Math.floor(Math.random() * 6)],
    })
  }

  return txs.sort((a, b) => b.timestamp - a.timestamp)
}

// ── Core Functions ───────────────────────────────────────────

/**
 * Get chain activity data for the heatmap
 */
export function getChainActivity(): ChainActivity[] {
  const chainIds = Object.keys(CHAINS).map(Number)
  const now = Date.now()

  return chainIds.map(chainId => {
    const chain = CHAINS[chainId]
    const baseDrained = Math.random() * 500000 + 10000
    const txCount = Math.floor(Math.random() * 200) + 5
    const activeDrainers = Math.floor(Math.random() * 8) + 1

    let riskLevel: ChainActivity['riskLevel'] = 'low'
    if (baseDrained > 300000) riskLevel = 'critical'
    else if (baseDrained > 150000) riskLevel = 'high'
    else if (baseDrained > 50000) riskLevel = 'medium'

    const trends: ChainActivity['trend'][] = ['rising', 'stable', 'falling']

    return {
      chainId,
      chainName: chain.name,
      chainIcon: chain.icon,
      totalDrainedUsd: baseDrained,
      transactionCount: txCount,
      activeDrainers,
      lastActivity: now - Math.floor(Math.random() * 60 * 60 * 1000),
      riskLevel,
      topDrainer: KNOWN_DRAINERS[Math.floor(Math.random() * Math.min(KNOWN_DRAINERS.length, 5))].name,
      trend: trends[Math.floor(Math.random() * 3)],
      region: CHAIN_REGIONS[chainId] || 'Global',
    }
  }).sort((a, b) => b.totalDrainedUsd - a.totalDrainedUsd)
}

/**
 * Get recent drainer transactions feed
 */
export function getRecentTransactions(limit: number = 20): DrainerTransaction[] {
  return generateMockTransactions().slice(0, limit)
}

/**
 * Get heatmap data points for chain visualization
 */
export function getHeatmapData(): HeatmapDataPoint[] {
  const activities = getChainActivity()
  const maxUsd = Math.max(...activities.map(a => a.totalDrainedUsd))

  return activities.map(a => ({
    chainId: a.chainId,
    chainName: a.chainName,
    value: a.totalDrainedUsd / maxUsd,
    totalUsd: a.totalDrainedUsd,
    txCount: a.transactionCount,
  }))
}

/**
 * Get drainer wallet clusters
 */
export function getDrainerClusters(): DrainerCluster[] {
  // Group known drainers into clusters
  const clusters: DrainerCluster[] = []

  // Inferno Drainer cluster
  const infernoDrainers = KNOWN_DRAINERS.filter(d => d.name.includes('Inferno'))
  if (infernoDrainers.length > 0) {
    clusters.push({
      id: 'cluster-inferno',
      name: 'Inferno Drainer Network',
      addresses: infernoDrainers.map(d => d.address),
      chains: [...new Set(infernoDrainers.flatMap(d => d.chains))],
      totalDrainedUsd: infernoDrainers.reduce((sum, d) => sum + parseFloat(d.totalDrained || '0'), 0) || 2500000,
      transactionCount: infernoDrainers.reduce((sum, d) => sum + d.reportCount, 0),
      firstSeen: Math.min(...infernoDrainers.map(d => new Date(d.firstSeen).getTime())),
      lastActive: Math.max(...infernoDrainers.map(d => new Date(d.lastActive).getTime())),
      type: 'eip7702',
      riskScore: 95,
    })
  }

  // Pink Drainer cluster
  clusters.push({
    id: 'cluster-pink',
    name: 'Pink Drainer',
    addresses: ['0x56a645ef8cc03631a28be1fc6c803eda7bfbbc5a'],
    chains: [1, 137, 42161],
    totalDrainedUsd: 1800000,
    transactionCount: 320,
    firstSeen: new Date('2024-03-01').getTime(),
    lastActive: Date.now() - 86400000,
    type: 'approval',
    riskScore: 88,
  })

  // Angel Drainer cluster
  clusters.push({
    id: 'cluster-angel',
    name: 'Angel Drainer',
    addresses: ['0x0000000000000000000000000000000000000001'],
    chains: [1, 8453, 56, 42161, 137],
    totalDrainedUsd: 3200000,
    transactionCount: 580,
    firstSeen: new Date('2024-01-15').getTime(),
    lastActive: Date.now() - 3600000,
    type: 'permit',
    riskScore: 92,
  })

  // Monkey Drainer cluster
  clusters.push({
    id: 'cluster-monkey',
    name: 'Monkey Drainer',
    addresses: ['0x0000000000000000000000000000000000000002'],
    chains: [1, 137],
    totalDrainedUsd: 900000,
    transactionCount: 150,
    firstSeen: new Date('2023-06-01').getTime(),
    lastActive: Date.now() - 604800000,
    type: 'seaport',
    riskScore: 72,
  })

  return clusters.sort((a, b) => b.riskScore - a.riskScore)
}

/**
 * Get aggregated stats for the dashboard
 */
export function getDrainerMapStats(): DrainerMapStats {
  const activities = getChainActivity()
  const total24h = activities.reduce((sum, a) => sum + a.totalDrainedUsd * 0.1, 0)
  const total7d = activities.reduce((sum, a) => sum + a.totalDrainedUsd * 0.4, 0)
  const total30d = activities.reduce((sum, a) => sum + a.totalDrainedUsd, 0)
  const txCount = activities.reduce((sum, a) => sum + a.transactionCount, 0)

  return {
    totalDrainedUsd24h: total24h,
    totalDrainedUsd7d: total7d,
    totalDrainedUsd30d: total30d,
    totalTransactions24h: Math.floor(txCount * 0.1),
    activeDrainers: activities.reduce((sum, a) => sum + a.activeDrainers, 0),
    activeChains: activities.filter(a => a.transactionCount > 0).length,
    mostTargetedChain: activities[0]?.chainName || 'Ethereum',
    newestDrainer: KNOWN_DRAINERS[0]?.name || 'Unknown',
    timestamp: Date.now(),
  }
}

/**
 * Get stats for a specific time period
 */
export function getStatsByPeriod(period: '24h' | '7d' | '30d'): TimePeriodStats {
  const multiplier = period === '24h' ? 0.1 : period === '7d' ? 0.4 : 1
  const activities = getChainActivity()
  const totalUsd = activities.reduce((sum, a) => sum + a.totalDrainedUsd * multiplier, 0)
  const txCount = Math.floor(activities.reduce((sum, a) => sum + a.transactionCount, 0) * multiplier)

  return {
    period,
    totalUsd,
    txCount,
    topChain: { name: activities[0]?.chainName || 'Ethereum', usd: (activities[0]?.totalDrainedUsd || 0) * multiplier },
    topDrainer: { name: KNOWN_DRAINERS[0]?.name || 'Unknown', usd: totalUsd * 0.3 },
  }
}

/**
 * Get total stolen amounts grouped by chain
 */
export function getStolenByChain(): { chainId: number; chainName: string; icon: string; totalUsd: number; percentage: number }[] {
  const activities = getChainActivity()
  const total = activities.reduce((sum, a) => sum + a.totalDrainedUsd, 0)

  return activities.map(a => ({
    chainId: a.chainId,
    chainName: a.chainName,
    icon: a.chainIcon,
    totalUsd: a.totalDrainedUsd,
    percentage: total > 0 ? (a.totalDrainedUsd / total) * 100 : 0,
  }))
}

/**
 * Get drainer transactions filtered by chain
 */
export function getTransactionsByChain(chainId: number, limit: number = 20): DrainerTransaction[] {
  return generateMockTransactions().filter(tx => tx.chainId === chainId).slice(0, limit)
}

/**
 * Search drainer by address or name
 */
export function searchDrainer(query: string): { drainers: DrainerInfo[]; clusters: DrainerCluster[] } {
  const q = query.toLowerCase()
  const drainers = KNOWN_DRAINERS.filter(d =>
    d.address.toLowerCase().includes(q) || d.name.toLowerCase().includes(q)
  )
  const clusters = getDrainerClusters().filter(c =>
    c.name.toLowerCase().includes(q) || c.addresses.some(a => a.toLowerCase().includes(q))
  )

  return { drainers, clusters }
}

/**
 * Format USD value for display
 */
export function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(2)}`
}

/**
 * Format timestamp to relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return `${seconds}s ago`
}

/**
 * Get risk color for a given risk level
 */
export function getRiskColor(level: 'critical' | 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'critical': return '#ef4444'
    case 'high': return '#f97316'
    case 'medium': return '#eab308'
    case 'low': return '#22c55e'
  }
}
