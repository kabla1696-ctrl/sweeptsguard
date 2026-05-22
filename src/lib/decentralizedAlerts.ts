// Decentralized Alert Network — On-chain threat intelligence & community verification
// Warn other users about drainers, scam contracts, and malicious actors

export type ThreatLevel = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type AlertCategory = 'drainer' | 'scam_token' | 'phishing' | 'rug_pull' | 'honeypot' | 'fake_airdrop' | 'address_poisoning' | 'other'
export type AlertStatus = 'pending' | 'verified' | 'disputed' | 'debunked'

export interface ThreatAlert {
  id: string
  reporter: string
  reporterReputation: number
  targetAddress: string
  chainId: number
  chainName: string
  category: AlertCategory
  threatLevel: ThreatLevel
  title: string
  description: string
  evidence: string[]
  tags: string[]
  status: AlertStatus
  verifications: AlertVerification[]
  upvotes: number
  downvotes: number
  viewCount: number
  affectedUsers: number
  estimatedLoss: string
  createdAt: number
  updatedAt: number
  expiresAt?: number
  txHash?: string // On-chain reference
}

export interface AlertVerification {
  verifier: string
  verifierReputation: number
  vote: 'confirm' | 'dispute'
  comment: string
  timestamp: number
}

export interface ThreatFeed {
  alerts: ThreatAlert[]
  total: number
  lastUpdated: number
}

export interface ReporterProfile {
  address: string
  reputation: number
  level: 'newcomer' | 'contributor' | 'trusted' | 'guardian' | 'sentinel'
  totalReports: number
  verifiedReports: number
  accuracy: number // percentage
  joinedAt: number
  badges: string[]
  rank: number
}

export interface NetworkStats {
  totalAlerts: number
  activeAlerts: number
  verifiedAlerts: number
  totalReporters: number
  totalAffectedUsers: number
  estimatedTotalLoss: string
  topCategories: { category: AlertCategory; count: number }[]
  topChains: { chainId: number; chainName: string; count: number }[]
}

// In-memory store (would be backed by smart contract + indexer in production)
const alertsStore: ThreatAlert[] = []
const reportersStore = new Map<string, ReporterProfile>()

// Seed demo data
function seedDemoData() {
  const demoAlerts: ThreatAlert[] = [
    {
      id: 'alert-001',
      reporter: '0x1234567890abcdef1234567890abcdef12345678',
      reporterReputation: 92,
      targetAddress: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      chainId: 1,
      chainName: 'Ethereum',
      category: 'drainer',
      threatLevel: 'critical',
      title: 'Known Inferno Drainer Contract — Active Theft',
      description: 'This contract uses the Inferno Drainer kit. It tricks users into granting unlimited token approvals, then sweeps all approved tokens. Over 200 victims in the past 48 hours.',
      evidence: [
        'https://etherscan.io/tx/0xabc123...',
        'https://twitter.com/scam_alert/status/123456',
        'Contract analysis: approve() + transferFrom() pattern detected',
      ],
      tags: ['inferno-drainer', 'approval-sweep', 'phishing-site'],
      status: 'verified',
      verifications: [
        { verifier: '0xabcd...1234', verifierReputation: 88, vote: 'confirm', comment: 'Confirmed. Lost 2.3 ETH to this contract.', timestamp: Date.now() - 3600000 },
        { verifier: '0xefgh...5678', verifierReputation: 95, vote: 'confirm', comment: 'Smart contract audit confirms malicious pattern.', timestamp: Date.now() - 7200000 },
        { verifier: '0xijkl...9012', verifierReputation: 72, vote: 'confirm', comment: 'Also stole my USDC. Avoid at all costs.', timestamp: Date.now() - 10800000 },
      ],
      upvotes: 847,
      downvotes: 3,
      viewCount: 12450,
      affectedUsers: 203,
      estimatedLoss: '$1.2M',
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 3600000,
      txHash: '0xabc123def456...',
    },
    {
      id: 'alert-002',
      reporter: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      reporterReputation: 78,
      targetAddress: '0x9876543210fedcba9876543210fedcba98765432',
      chainId: 1,
      chainName: 'Ethereum',
      category: 'scam_token',
      threatLevel: 'high',
      title: 'Fake Airdrop Token — DO NOT INTERACT',
      description: 'A fake token mimicking a popular airdrop. If you try to sell it, the contract drains your wallet via a hidden transfer hook.',
      evidence: [
        'Token contract: 0x9876...5432',
        'Honeypot analysis confirms hidden fee of 100%',
        'No legitimate project backing found',
      ],
      tags: ['fake-airdrop', 'honeypot', 'hidden-fee'],
      status: 'verified',
      verifications: [
        { verifier: '0xaaaa...bbbb', verifierReputation: 85, vote: 'confirm', comment: 'Honeypot confirmed by multiple analysis tools.', timestamp: Date.now() - 14400000 },
      ],
      upvotes: 412,
      downvotes: 8,
      viewCount: 5600,
      affectedUsers: 87,
      estimatedLoss: '$340K',
      createdAt: Date.now() - 172800000,
      updatedAt: Date.now() - 14400000,
    },
    {
      id: 'alert-003',
      reporter: '0x1111222233334444555566667777888899990000',
      reporterReputation: 65,
      targetAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      chainId: 8453,
      chainName: 'Base',
      category: 'phishing',
      threatLevel: 'high',
      title: 'Phishing Site Impersonating Uniswap on Base',
      description: 'A phishing site at uni-swap[.]finance is targeting Base chain users. It requests wallet connection and then prompts unlimited token approvals.',
      evidence: [
        'Screenshot: https://evidence.sweeptsguard.xyz/phish-003.png',
        'Domain registered 3 days ago',
        'Uses same UI as official Uniswap',
      ],
      tags: ['phishing', 'uniswap-clone', 'base-chain'],
      status: 'verified',
      verifications: [
        { verifier: '0xbbbb...cccc', verifierReputation: 91, vote: 'confirm', comment: 'Domain confirmed phishing by security team.', timestamp: Date.now() - 28800000 },
        { verifier: '0xdddd...eeee', verifierReputation: 70, vote: 'confirm', comment: 'Lost 0.5 ETH. Site looks identical to real Uniswap.', timestamp: Date.now() - 36000000 },
      ],
      upvotes: 256,
      downvotes: 2,
      viewCount: 3800,
      affectedUsers: 34,
      estimatedLoss: '$89K',
      createdAt: Date.now() - 259200000,
      updatedAt: Date.now() - 28800000,
    },
    {
      id: 'alert-004',
      reporter: '0x22223333444455556666777788889999aaaabbbb',
      reporterReputation: 45,
      targetAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      chainId: 137,
      chainName: 'Polygon',
      category: 'rug_pull',
      threatLevel: 'critical',
      title: 'Liquidity Pulled — SafeMoon Fork on Polygon',
      description: 'The deployer removed all liquidity from this SafeMoon fork token on Polygon. LP tokens burned, $2.1M drained in a single transaction.',
      evidence: [
        'https://polygonscan.com/tx/0xdef789...',
        'LP removal tx confirmed',
        'Deployer wallet emptied within 10 minutes',
      ],
      tags: ['rug-pull', 'liquidity-removal', 'safemoon-clone'],
      status: 'verified',
      verifications: [
        { verifier: '0xffff...0000', verifierReputation: 89, vote: 'confirm', comment: 'Blockchain data confirms rug pull.', timestamp: Date.now() - 43200000 },
      ],
      upvotes: 534,
      downvotes: 12,
      viewCount: 8900,
      affectedUsers: 1200,
      estimatedLoss: '$2.1M',
      createdAt: Date.now() - 345600000,
      updatedAt: Date.now() - 43200000,
    },
    {
      id: 'alert-005',
      reporter: '0x3333444455556666777788889999000011112222',
      reporterReputation: 88,
      targetAddress: '0xcccccccccccccccccccccccccccccccccccccccc',
      chainId: 1,
      chainName: 'Ethereum',
      category: 'address_poisoning',
      threatLevel: 'medium',
      title: 'Address Poisoning Campaign — 500+ Fake Transactions',
      description: 'An address poisoning campaign sending 0 ETH from similar-looking addresses to trick users into copying the wrong address from their transaction history.',
      evidence: [
        'Pattern analysis of 500+ micro-transactions',
        'Addresses generated to match first/last chars of target',
        'Confirmed victim reports from multiple users',
      ],
      tags: ['address-poisoning', 'zero-value-transfer', 'social-engineering'],
      status: 'verified',
      verifications: [
        { verifier: '0x4444...5555', verifierReputation: 93, vote: 'confirm', comment: 'Pattern confirmed across 100+ wallets.', timestamp: Date.now() - 57600000 },
      ],
      upvotes: 189,
      downvotes: 1,
      viewCount: 2100,
      affectedUsers: 45,
      estimatedLoss: '$56K',
      createdAt: Date.now() - 432000000,
      updatedAt: Date.now() - 57600000,
    },
    {
      id: 'alert-006',
      reporter: '0x5555666677778888999900001111222233334444',
      reporterReputation: 30,
      targetAddress: '0xdddddddddddddddddddddddddddddddddddddddd',
      chainId: 42161,
      chainName: 'Arbitrum',
      category: 'honeypot',
      threatLevel: 'medium',
      title: 'Honeypot Token on Arbitrum — Can\'t Sell',
      description: 'New token on Arbitrum with hidden sell restriction. You can buy but the sell function reverts for all non-whitelisted addresses.',
      evidence: [
        'Contract code analysis: sell() restricted to whitelisted addresses',
        'Trading volume is artificially inflated by bot wallets',
        'Website uses stock photos and fake team members',
      ],
      tags: ['honeypot', 'sell-restriction', 'fake-team'],
      status: 'pending',
      verifications: [],
      upvotes: 67,
      downvotes: 15,
      viewCount: 890,
      affectedUsers: 12,
      estimatedLoss: '$18K',
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000,
    },
    {
      id: 'alert-007',
      reporter: '0x6666777788889999000011112222333344445555',
      reporterReputation: 72,
      targetAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      chainId: 10,
      chainName: 'Optimism',
      category: 'fake_airdrop',
      threatLevel: 'high',
      title: 'Fake OP Airdrop Claim Site',
      description: 'A phishing site claiming to distribute "bonus OP tokens" requests wallet connection and token approval. The approval drains USDC and ETH.',
      evidence: [
        'Domain: op-airdrop-claim[.]xyz (NOT official)',
        'Requests unlimited USDC approval',
        'Smart contract analysis confirms drain pattern',
      ],
      tags: ['fake-airdrop', 'op-impersonation', 'approval-drain'],
      status: 'verified',
      verifications: [
        { verifier: '0x7777...8888', verifierReputation: 82, vote: 'confirm', comment: 'Confirmed drain pattern.', timestamp: Date.now() - 72000000 },
      ],
      upvotes: 321,
      downvotes: 5,
      viewCount: 4200,
      affectedUsers: 56,
      estimatedLoss: '$210K',
      createdAt: Date.now() - 518400000,
      updatedAt: Date.now() - 72000000,
    },
  ]

  const demoReporters: ReporterProfile[] = [
    { address: '0x1234...5678', reputation: 92, level: 'sentinel', totalReports: 47, verifiedReports: 44, accuracy: 93.6, joinedAt: Date.now() - 31536000000, badges: ['🏆', '🛡️', '⭐'], rank: 1 },
    { address: '0xabcd...ef01', reputation: 78, level: 'guardian', totalReports: 23, verifiedReports: 19, accuracy: 82.6, joinedAt: Date.now() - 15768000000, badges: ['🛡️', '⭐'], rank: 2 },
    { address: '0x3333...4444', reputation: 88, level: 'sentinel', totalReports: 35, verifiedReports: 33, accuracy: 94.3, joinedAt: Date.now() - 23456000000, badges: ['🏆', '🛡️'], rank: 3 },
    { address: '0x5555...6666', reputation: 72, level: 'trusted', totalReports: 15, verifiedReports: 11, accuracy: 73.3, joinedAt: Date.now() - 10000000000, badges: ['⭐'], rank: 4 },
    { address: '0x7777...8888', reputation: 65, level: 'contributor', totalReports: 8, verifiedReports: 5, accuracy: 62.5, joinedAt: Date.now() - 5000000000, badges: [], rank: 5 },
  ]

  alertsStore.push(...demoAlerts)
  demoReporters.forEach(r => reportersStore.set(r.address, r))
}

// Initialize
seedDemoData()

/**
 * Get the global threat feed with optional filters
 */
export function getThreatFeed(options?: {
  category?: AlertCategory
  threatLevel?: ThreatLevel
  chainId?: number
  status?: AlertStatus
  search?: string
  sortBy?: 'newest' | 'most_voted' | 'most_viewed' | 'highest_threat'
  limit?: number
  offset?: number
}): ThreatFeed {
  let filtered = [...alertsStore]

  if (options?.category) {
    filtered = filtered.filter(a => a.category === options.category)
  }
  if (options?.threatLevel) {
    filtered = filtered.filter(a => a.threatLevel === options.threatLevel)
  }
  if (options?.chainId) {
    filtered = filtered.filter(a => a.chainId === options.chainId)
  }
  if (options?.status) {
    filtered = filtered.filter(a => a.status === options.status)
  }
  if (options?.search) {
    const q = options.search.toLowerCase()
    filtered = filtered.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.tags.some(t => t.includes(q)) ||
      a.targetAddress.toLowerCase().includes(q)
    )
  }

  // Sort
  const sortBy = options?.sortBy || 'newest'
  switch (sortBy) {
    case 'newest':
      filtered.sort((a, b) => b.createdAt - a.createdAt)
      break
    case 'most_voted':
      filtered.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))
      break
    case 'most_viewed':
      filtered.sort((a, b) => b.viewCount - a.viewCount)
      break
    case 'highest_threat': {
      const levelOrder: Record<ThreatLevel, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 }
      filtered.sort((a, b) => levelOrder[b.threatLevel] - levelOrder[a.threatLevel])
      break
    }
  }

  const offset = options?.offset || 0
  const limit = options?.limit || 20

  return {
    alerts: filtered.slice(offset, offset + limit),
    total: filtered.length,
    lastUpdated: Date.now(),
  }
}

/**
 * Submit a new alert to the network
 */
export function submitAlert(alert: Omit<ThreatAlert, 'id' | 'status' | 'verifications' | 'upvotes' | 'downvotes' | 'viewCount' | 'createdAt' | 'updatedAt'>): ThreatAlert {
  const newAlert: ThreatAlert = {
    ...alert,
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'pending',
    verifications: [],
    upvotes: 0,
    downvotes: 0,
    viewCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  alertsStore.unshift(newAlert)

  // Update reporter stats
  let reporter = reportersStore.get(alert.reporter)
  if (!reporter) {
    reporter = {
      address: alert.reporter,
      reputation: 10,
      level: 'newcomer',
      totalReports: 0,
      verifiedReports: 0,
      accuracy: 0,
      joinedAt: Date.now(),
      badges: [],
      rank: reportersStore.size + 1,
    }
    reportersStore.set(alert.reporter, reporter)
  }
  reporter.totalReports++

  return newAlert
}

/**
 * Verify or dispute an alert
 */
export function verifyAlert(
  alertId: string,
  verifier: string,
  vote: 'confirm' | 'dispute',
  comment: string
): ThreatAlert | null {
  const alert = alertsStore.find(a => a.id === alertId)
  if (!alert) return null

  // Prevent duplicate votes
  if (alert.verifications.some(v => v.verifier === verifier)) {
    throw new Error('You have already voted on this alert')
  }

  const verifierProfile = reportersStore.get(verifier)
  const verification: AlertVerification = {
    verifier,
    verifierReputation: verifierProfile?.reputation || 10,
    vote,
    comment,
    timestamp: Date.now(),
  }

  alert.verifications.push(verification)

  if (vote === 'confirm') {
    alert.upvotes++
  } else {
    alert.downvotes++
  }

  // Auto-verify if enough confirmations
  const confirms = alert.verifications.filter(v => v.vote === 'confirm').length
  const disputes = alert.verifications.filter(v => v.vote === 'dispute').length

  if (confirms >= 3 && confirms > disputes * 2) {
    alert.status = 'verified'
  } else if (disputes >= 3 && disputes > confirms) {
    alert.status = 'disputed'
  }

  alert.updatedAt = Date.now()
  return alert
}

/**
 * Vote on an alert (upvote/downvote without full verification)
 */
export function voteAlert(alertId: string, direction: 'up' | 'down'): ThreatAlert | null {
  const alert = alertsStore.find(a => a.id === alertId)
  if (!alert) return null

  if (direction === 'up') {
    alert.upvotes++
  } else {
    alert.downvotes++
  }
  alert.updatedAt = Date.now()
  return alert
}

/**
 * Get a single alert by ID
 */
export function getAlert(alertId: string): ThreatAlert | null {
  return alertsStore.find(a => a.id === alertId) || null
}

/**
 * Check if an address has been reported
 */
export function checkAddress(address: string): ThreatAlert[] {
  const addr = address.toLowerCase()
  return alertsStore.filter(a => a.targetAddress.toLowerCase() === addr && a.status !== 'debunked')
}

/**
 * Get reporter profile
 */
export function getReporter(address: string): ReporterProfile | null {
  return reportersStore.get(address) || null
}

/**
 * Get top reporters by reputation
 */
export function getTopReporters(limit: number = 10): ReporterProfile[] {
  return Array.from(reportersStore.values())
    .sort((a, b) => b.reputation - a.reputation)
    .slice(0, limit)
}

/**
 * Get network statistics
 */
export function getNetworkStats(): NetworkStats {
  const totalAlerts = alertsStore.length
  const activeAlerts = alertsStore.filter(a => a.status !== 'debunked').length
  const verifiedAlerts = alertsStore.filter(a => a.status === 'verified').length
  const totalReporters = reportersStore.size
  const totalAffectedUsers = alertsStore.reduce((sum, a) => sum + a.affectedUsers, 0)

  const estimatedTotalLoss = alertsStore.reduce((sum, a) => {
    const num = parseFloat(a.estimatedLoss.replace(/[$MK,]/g, ''))
    const multiplier = a.estimatedLoss.includes('M') ? 1000000 : 1000
    return sum + num * multiplier
  }, 0)

  // Count by category
  const categoryCount = new Map<AlertCategory, number>()
  alertsStore.forEach(a => {
    categoryCount.set(a.category, (categoryCount.get(a.category) || 0) + 1)
  })
  const topCategories = Array.from(categoryCount.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)

  // Count by chain
  const chainCount = new Map<number, { chainName: string; count: number }>()
  alertsStore.forEach(a => {
    const existing = chainCount.get(a.chainId)
    if (existing) {
      existing.count++
    } else {
      chainCount.set(a.chainId, { chainName: a.chainName, count: 1 })
    }
  })
  const topChains = Array.from(chainCount.entries())
    .map(([chainId, data]) => ({ chainId, chainName: data.chainName, count: data.count }))
    .sort((a, b) => b.count - a.count)

  return {
    totalAlerts,
    activeAlerts,
    verifiedAlerts,
    totalReporters,
    totalAffectedUsers,
    estimatedTotalLoss: `$${(estimatedTotalLoss / 1000000).toFixed(1)}M`,
    topCategories,
    topChains,
  }
}

/**
 * Get alert category display info
 */
export function getCategoryInfo(category: AlertCategory): { label: string; icon: string; color: string } {
  const info: Record<AlertCategory, { label: string; icon: string; color: string }> = {
    drainer: { label: 'Drainer Contract', icon: '💀', color: 'text-red-400' },
    scam_token: { label: 'Scam Token', icon: '🪙', color: 'text-orange-400' },
    phishing: { label: 'Phishing Site', icon: '🎣', color: 'text-yellow-400' },
    rug_pull: { label: 'Rug Pull', icon: '🧶', color: 'text-red-500' },
    honeypot: { label: 'Honeypot', icon: '🍯', color: 'text-amber-400' },
    fake_airdrop: { label: 'Fake Airdrop', icon: '🎁', color: 'text-purple-400' },
    address_poisoning: { label: 'Address Poisoning', icon: '☠️', color: 'text-emerald-400' },
    other: { label: 'Other', icon: '⚠️', color: 'text-gray-400' },
  }
  return info[category] || info.other
}

/**
 * Get threat level display info
 */
export function getThreatLevelInfo(level: ThreatLevel): { label: string; color: string; bgColor: string } {
  const info: Record<ThreatLevel, { label: string; color: string; bgColor: string }> = {
    critical: { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/20' },
    high: { label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
    medium: { label: 'Medium', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
    low: { label: 'Low', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    info: { label: 'Info', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
  }
  return info[level]
}

/**
 * Get reporter level from reputation score
 */
export function getReporterLevel(reputation: number): ReporterProfile['level'] {
  if (reputation >= 90) return 'sentinel'
  if (reputation >= 75) return 'guardian'
  if (reputation >= 50) return 'trusted'
  if (reputation >= 25) return 'contributor'
  return 'newcomer'
}

/**
 * Format relative time
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
  return 'Just now'
}
