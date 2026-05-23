// Airdrop Hunter Pro — Eligible detection, claim guides, value estimates, calendar

export interface Airdrop {
  id: string
  project: string
  token: string
  chain: string
  chainId: number
  status: 'upcoming' | 'active' | 'claimed' | 'expired'
  estimatedValue: number // USD
  totalValue: number // total airdrop pool USD
  claimDeadline?: string // ISO date
  snapshotDate?: string
  eligibilityCriteria: string[]
  claimUrl: string
  icon: string
  description: string
  category: 'defi' | 'nft' | 'gaming' | 'infrastructure' | 'layer2' | 'social'
  announcedDate: string
}

export interface EligibilityCheck {
  address: string
  eligible: boolean
  estimatedTokens: number
  estimatedValueUSD: number
  criteria: { name: string; met: boolean; weight: number }[]
  rank?: number
  totalEligible?: number
}

export interface ClaimStep {
  step: number
  title: string
  description: string
  action: string
  url?: string
  estimatedGas?: string
  warning?: string
}

export interface ClaimGuide {
  airdropId: string
  steps: ClaimStep[]
  totalEstimatedGas: string
  difficulty: 'easy' | 'medium' | 'hard'
  timeEstimate: string
}

export interface PastAirdrop {
  project: string
  token: string
  claimDate: string
  tokensReceived: number
  valueAtClaim: number
  valueNow: number
  txHash: string
  chain: string
}

export interface AirdropNotification {
  id: string
  airdropId: string
  type: 'new_eligible' | 'deadline_approaching' | 'claim_open' | 'value_change'
  message: string
  createdAt: string
  read: boolean
}

// Comprehensive airdrop database (demo data)
const AIRDROPS: Airdrop[] = [
  {
    id: 'zksync-era-2',
    project: 'zkSync Era',
    token: 'ZK',
    chain: 'zkSync Era',
    chainId: 324,
    status: 'active',
    estimatedValue: 2400,
    totalValue: 950000000,
    claimDeadline: '2026-06-15T00:00:00Z',
    snapshotDate: '2026-03-01T00:00:00Z',
    eligibilityCriteria: [
      'Bridge to zkSync Era mainnet',
      'Use 5+ unique protocols',
      'Active for 3+ months',
      'Hold >0.1 ETH on zkSync',
    ],
    claimUrl: 'https://claim.zksync.io',
    icon: '⚡',
    description: 'Second airdrop for zkSync Era early adopters and active DeFi users.',
    category: 'layer2',
    announcedDate: '2026-04-20T00:00:00Z',
  },
  {
    id: 'scroll-token',
    project: 'Scroll',
    token: 'SCR',
    chain: 'Scroll',
    chainId: 534352,
    status: 'active',
    estimatedValue: 1800,
    totalValue: 600000000,
    claimDeadline: '2026-06-30T00:00:00Z',
    eligibilityCriteria: [
      'Bridge to Scroll mainnet',
      'Provide liquidity on Scroll DEXes',
      'Complete Scroll Canvas tasks',
    ],
    claimUrl: 'https://claim.scroll.io',
    icon: '📜',
    description: 'Scroll governance token distribution for ecosystem participants.',
    category: 'layer2',
    announcedDate: '2026-05-01T00:00:00Z',
  },
  {
    id: 'linea-surge',
    project: 'Linea',
    token: 'LNA',
    chain: 'Linea',
    chainId: 59144,
    status: 'upcoming',
    estimatedValue: 1200,
    totalValue: 400000000,
    snapshotDate: '2026-07-01T00:00:00Z',
    eligibilityCriteria: [
      'Bridge ETH to Linea',
      'Use Linea DeFi protocols',
      'Hold LXP-L points',
    ],
    claimUrl: 'https://linea.build',
    icon: '🌊',
    description: 'Linea ecosystem token for DeFi participants and LXP holders.',
    category: 'layer2',
    announcedDate: '2026-05-10T00:00:00Z',
  },
  {
    id: 'eigenlayer-season2',
    project: 'EigenLayer',
    token: 'EIGEN',
    chain: 'Ethereum',
    chainId: 1,
    status: 'active',
    estimatedValue: 3500,
    totalValue: 1200000000,
    claimDeadline: '2026-06-01T00:00:00Z',
    eligibilityCriteria: [
      'Restake ETH/LSTs on EigenLayer',
      'Delegate to AVS operators',
      'Active restaking for 2+ months',
    ],
    claimUrl: 'https://claim.eigenfoundation.org',
    icon: '🔮',
    description: 'Season 2 EIGEN token distribution for restakers and AVS delegators.',
    category: 'defi',
    announcedDate: '2026-04-15T00:00:00Z',
  },
  {
    id: 'jupiter-season2',
    project: 'Jupiter',
    token: 'JUP',
    chain: 'Solana',
    chainId: 0,
    status: 'claimed',
    estimatedValue: 800,
    totalValue: 700000000,
    claimDeadline: '2026-04-01T00:00:00Z',
    eligibilityCriteria: [
      'Swap on Jupiter aggregator',
      'Use limit orders or DCA',
      'Volume > $1000',
    ],
    claimUrl: 'https://vote.jup.ag',
    icon: '🪐',
    description: 'Jupiter exchange JUP token for active Solana traders.',
    category: 'defi',
    announcedDate: '2026-02-01T00:00:00Z',
  },
  {
    id: 'starknet-round2',
    project: 'Starknet',
    token: 'STRK',
    chain: 'Starknet',
    chainId: 0,
    status: 'upcoming',
    estimatedValue: 1500,
    totalValue: 500000000,
    snapshotDate: '2026-08-01T00:00:00Z',
    eligibilityCriteria: [
      'Bridge to Starknet',
      'Use Starknet DeFi (Ekubo, ZKX, etc.)',
      'Stake STRK tokens',
    ],
    claimUrl: 'https://starknet.io',
    icon: '🌟',
    description: 'Second STRK distribution for Starknet ecosystem builders and users.',
    category: 'layer2',
    announcedDate: '2026-05-15T00:00:00Z',
  },
  {
    id: 'hyperliquid',
    project: 'Hyperliquid',
    token: 'HYPE',
    chain: 'Hyperliquid',
    chainId: 0,
    status: 'active',
    estimatedValue: 5000,
    totalValue: 2000000000,
    claimDeadline: '2026-05-30T00:00:00Z',
    eligibilityCriteria: [
      'Trade on Hyperliquid DEX',
      'Provide liquidity to HLP vaults',
      'Use Hyperps or perps',
    ],
    claimUrl: 'https://app.hyperliquid.xyz',
    icon: '🚀',
    description: 'HYPE token for Hyperliquid DEX traders and liquidity providers.',
    category: 'defi',
    announcedDate: '2026-04-01T00:00:00Z',
  },
  {
    id: 'pudgy-penguins',
    project: 'Pudgy Penguins',
    token: 'PGU',
    chain: 'Ethereum',
    chainId: 1,
    status: 'upcoming',
    estimatedValue: 4200,
    totalValue: 300000000,
    snapshotDate: '2026-06-15T00:00:00Z',
    eligibilityCriteria: [
      'Hold Pudgy Penguins NFT',
      'Hold Lil Pudgys NFT',
      'Active on Pudgy World',
    ],
    claimUrl: 'https://pudgypenguins.com',
    icon: '🐧',
    description: 'PGU governance token for Pudgy Penguins ecosystem holders.',
    category: 'nft',
    announcedDate: '2026-05-05T00:00:00Z',
  },
]

export function getAllAirdrops(): Airdrop[] {
  return AIRDROPS
}

export function getAirdropById(id: string): Airdrop | undefined {
  return AIRDROPS.find(a => a.id === id)
}

export function getAirdropsByStatus(status: Airdrop['status']): Airdrop[] {
  return AIRDROPS.filter(a => a.status === status)
}

export function getAirdropsByCategory(category: Airdrop['category']): Airdrop[] {
  return AIRDROPS.filter(a => a.category === category)
}

export function getUpcomingAirdrops(): Airdrop[] {
  return AIRDROPS.filter(a => a.status === 'upcoming' || a.status === 'active')
}

export function checkEligibility(address: string, airdropId: string): EligibilityCheck {
  const airdrop = AIRDROPS.find(a => a.id === airdropId)
  if (!airdrop) {
    return { address, eligible: false, estimatedTokens: 0, estimatedValueUSD: 0, criteria: [] }
  }

  // Simulate eligibility based on address hash
  const seed = parseInt(address.slice(2, 10), 16)
  const rng = (n: number) => ((seed * 9301 + 49297 + n * 233) % 233280) / 233280

  const criteriaMet = airdrop.eligibilityCriteria.map((name, i) => ({
    name,
    met: rng(i) > 0.3,
    weight: 20 + rng(i + 100) * 30,
  }))

  const totalWeight = criteriaMet.reduce((s, c) => s + c.weight, 0)
  const metWeight = criteriaMet.filter(c => c.met).reduce((s, c) => s + c.weight, 0)
  const eligible = metWeight / totalWeight >= 0.5
  const tokens = eligible ? Math.round(500 + rng(50) * 5000) : 0
  const valueUSD = tokens * (airdrop.estimatedValue / 3000) // rough token price

  return {
    address,
    eligible,
    estimatedTokens: tokens,
    estimatedValueUSD: Math.round(valueUSD),
    criteria: criteriaMet,
    rank: eligible ? Math.round(1000 + rng(60) * 50000) : undefined,
    totalEligible: Math.round(50000 + rng(70) * 200000),
  }
}

export function getClaimGuide(airdropId: string): ClaimGuide | null {
  const airdrop = AIRDROPS.find(a => a.id === airdropId)
  if (!airdrop) return null

  const baseSteps: ClaimStep[] = [
    {
      step: 1,
      title: 'Connect Wallet',
      description: `Connect your wallet to the ${airdrop.project} claims page.`,
      action: 'Connect',
      url: airdrop.claimUrl,
    },
    {
      step: 2,
      title: 'Verify Eligibility',
      description: 'The site will check your wallet for eligibility. Make sure you used the same wallet.',
      action: 'Check',
    },
    {
      step: 3,
      title: 'Claim Tokens',
      description: `Click "Claim" to receive your ${airdrop.token} tokens. You'll need ETH for gas.`,
      action: 'Claim',
      estimatedGas: '0.002-0.01 ETH',
    },
    {
      step: 4,
      title: 'Verify Receipt',
      description: `Check your wallet for ${airdrop.token} tokens. Add the token contract if not visible.`,
      action: 'Verify',
    },
  ]

  // Add specific warnings
  if (airdrop.status === 'active' && airdrop.claimDeadline) {
    const deadline = new Date(airdrop.claimDeadline)
    const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86400000)
    if (daysLeft < 14) {
      baseSteps[2].warning = `⏰ Only ${daysLeft} days left to claim! Deadline: ${deadline.toLocaleDateString()}`
    }
  }

  return {
    airdropId,
    steps: baseSteps,
    totalEstimatedGas: '0.005-0.02 ETH',
    difficulty: 'easy',
    timeEstimate: '5-10 minutes',
  }
}

// Past airdrops history (simulated)
export function getPastAirdrops(address: string): PastAirdrop[] {
  const seed = parseInt(address.slice(2, 10), 16)
  const rng = (n: number) => ((seed * 9301 + 49297 + n * 233) % 233280) / 233280

  return [
    {
      project: 'Arbitrum',
      token: 'ARB',
      claimDate: '2026-03-23',
      tokensReceived: Math.round(1000 + rng(1) * 10000),
      valueAtClaim: Math.round(500 + rng(2) * 5000),
      valueNow: Math.round(800 + rng(3) * 8000),
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(rng(4) * 16).toString(16)).join('')}`,
      chain: 'Arbitrum',
    },
    {
      project: 'Optimism',
      token: 'OP',
      claimDate: '2026-02-15',
      tokensReceived: Math.round(500 + rng(5) * 5000),
      valueAtClaim: Math.round(300 + rng(6) * 3000),
      valueNow: Math.round(400 + rng(7) * 4000),
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(rng(8) * 16).toString(16)).join('')}`,
      chain: 'Optimism',
    },
    {
      project: 'EigenLayer',
      token: 'EIGEN',
      claimDate: '2026-05-01',
      tokensReceived: Math.round(200 + rng(9) * 2000),
      valueAtClaim: Math.round(1000 + rng(10) * 10000),
      valueNow: Math.round(1200 + rng(11) * 12000),
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(rng(12) * 16).toString(16)).join('')}`,
      chain: 'Ethereum',
    },
  ]
}

// Notifications
const notifications: AirdropNotification[] = []

export function getNotifications(): AirdropNotification[] {
  return notifications
}

export function addNotification(
  airdropId: string,
  type: AirdropNotification['type'],
  message: string
): AirdropNotification {
  const notif: AirdropNotification = {
    id: `notif_${Date.now()}`,
    airdropId,
    type,
    message,
    createdAt: new Date().toISOString(),
    read: false,
  }
  notifications.unshift(notif)
  return notif
}

export function markNotificationRead(id: string): boolean {
  const notif = notifications.find(n => n.id === id)
  if (!notif) return false
  notif.read = true
  return true
}

export function getCategoryIcon(category: Airdrop['category']): string {
  switch (category) {
    case 'defi': return '💰'
    case 'nft': return '🖼️'
    case 'gaming': return '🎮'
    case 'infrastructure': return '🔧'
    case 'layer2': return '⛓️'
    case 'social': return '📱'
    default: return '🎁'
  }
}

export function getStatusColor(status: Airdrop['status']): string {
  switch (status) {
    case 'active': return 'text-green-400 bg-green-500/10 border-green-500/20'
    case 'upcoming': return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    case 'claimed': return 'text-purple-400 bg-purple-500/10 border-purple-500/20'
    case 'expired': return 'text-white/30 bg-white/5 border-white/10'
    default: return 'text-white/30 bg-white/5 border-white/10'
  }
}

export function formatValue(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

export function getDaysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}
