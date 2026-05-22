// Gamification / Security Quests system

export type QuestCategory = 'onboarding' | 'security' | 'monitoring' | 'advanced' | 'social'
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

export interface Quest {
  id: string
  title: string
  description: string
  category: QuestCategory
  points: number
  icon: string
  requirement: string
  isRepeatable: boolean
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
}

export interface UserQuest extends Quest {
  completed: boolean
  completedAt?: string
  progress: number // 0-100
}

export interface Badge {
  id: string
  name: string
  description: string
  tier: BadgeTier
  icon: string
  requirement: string
  requiredPoints: number
  unlocked: boolean
  unlockedAt?: string
}

export interface UserProfile {
  walletAddress: string
  totalPoints: number
  level: BadgeTier
  streak: number
  lastActiveDate: string
  questsCompleted: string[]
  badges: string[]
  rank: number
  joinedAt: string
}

export interface LeaderboardEntry {
  rank: number
  address: string
  points: number
  level: BadgeTier
  streak: number
  badges: number
  questsCompleted: number
}

// All available quests
export const QUESTS: Quest[] = [
  // Onboarding
  { id: 'connect-wallet', title: 'Connect Your Wallet', description: 'Connect your wallet to SweepGuard to start protecting your assets.', category: 'onboarding', points: 10, icon: '🔗', requirement: 'Connect any EVM wallet', isRepeatable: false, difficulty: 'easy' },
  { id: 'complete-profile', title: 'Complete Your Profile', description: 'Set up your security profile with notification preferences.', category: 'onboarding', points: 15, icon: '👤', requirement: 'Fill in profile settings', isRepeatable: false, difficulty: 'easy' },
  { id: 'first-scan', title: 'First Contract Scan', description: 'Scan your first smart contract for vulnerabilities.', category: 'onboarding', points: 10, icon: '🔍', requirement: 'Run a contract scan', isRepeatable: false, difficulty: 'easy' },

  // Security
  { id: 'revoke-dangerous', title: 'Revoke Dangerous Approval', description: 'Find and revoke a token approval with unlimited spending.', category: 'security', points: 25, icon: '🚫', requirement: 'Revoke at least one unlimited approval', isRepeatable: false, difficulty: 'medium' },
  { id: 'set-recovery', title: 'Set Up Recovery Wallet', description: 'Configure a recovery wallet for emergency fund recovery.', category: 'security', points: 20, icon: '🆘', requirement: 'Set a recovery address', isRepeatable: false, difficulty: 'easy' },
  { id: 'enable-2fa', title: 'Enable 2FA Protection', description: 'Add two-factor authentication to your SweepGuard account.', category: 'security', points: 20, icon: '🔐', requirement: 'Enable TOTP or SMS 2FA', isRepeatable: false, difficulty: 'easy' },
  { id: 'audit-contract', title: 'Audit a Smart Contract', description: 'Run a full security audit on a smart contract using the Audit Bot.', category: 'security', points: 15, icon: '🤖', requirement: 'Complete one contract audit', isRepeatable: false, difficulty: 'easy' },
  { id: 'check-allowances', title: 'Review Token Allowances', description: 'Check all your token allowances across chains.', category: 'security', points: 10, icon: '📋', requirement: 'Review token approvals page', isRepeatable: false, difficulty: 'easy' },
  { id: 'honey-token', title: 'Deploy Honey Token', description: 'Set up a honey token to detect unauthorized access.', category: 'security', points: 30, icon: '🍯', requirement: 'Deploy a honey token trap', isRepeatable: false, difficulty: 'hard' },

  // Monitoring
  { id: 'daily-check', title: 'Daily Security Check', description: 'Perform a daily security health check on your wallet.', category: 'monitoring', points: 5, icon: '📅', requirement: 'Check wallet health daily', isRepeatable: true, difficulty: 'easy' },
  { id: 'set-alerts', title: 'Configure Alert System', description: 'Set up real-time alerts for suspicious wallet activity.', category: 'monitoring', points: 15, icon: '🔔', requirement: 'Configure at least one alert type', isRepeatable: false, difficulty: 'easy' },
  { id: 'monitor-drainer', title: 'Track a Drainer', description: 'Use the Live Drainer Map to monitor known drainer addresses.', category: 'monitoring', points: 15, icon: '🗺️', requirement: 'View drainer map and track an address', isRepeatable: false, difficulty: 'easy' },
  { id: 'whale-watch', title: 'Whale Watcher', description: 'Set up whale movement alerts for tokens you hold.', category: 'monitoring', points: 10, icon: '🐋', requirement: 'Configure whale alerts', isRepeatable: false, difficulty: 'medium' },

  // Advanced
  { id: 'setup-multisig', title: 'Multi-Sig Recovery', description: 'Configure multi-signature recovery for high-value wallets.', category: 'advanced', points: 40, icon: '🏛️', requirement: 'Set up multi-sig with 2+ signers', isRepeatable: false, difficulty: 'hard' },
  { id: 'cross-chain-link', title: 'Cross-Chain Identity', description: 'Link your wallets across multiple chains for unified monitoring.', category: 'advanced', points: 25, icon: '⛓️', requirement: 'Link wallets on 2+ chains', isRepeatable: false, difficulty: 'medium' },
  { id: 'family-setup', title: 'Family Protection', description: 'Set up protection for family members\' wallets.', category: 'advanced', points: 30, icon: '👨‍👩‍👧‍👦', requirement: 'Add at least one family member', isRepeatable: false, difficulty: 'medium' },
  { id: 'dark-web-check', title: 'Dark Web Scan', description: 'Check if your wallet address appears on dark web databases.', category: 'advanced', points: 20, icon: '🕵️', requirement: 'Run a dark web scan', isRepeatable: false, difficulty: 'medium' },

  // Social
  { id: 'share-achievement', title: 'Share an Achievement', description: 'Share one of your security achievements on social media.', category: 'social', points: 10, icon: '📣', requirement: 'Share any achievement', isRepeatable: false, difficulty: 'easy' },
  { id: 'refer-friend', title: 'Refer a Friend', description: 'Invite a friend to join SweepGuard and protect their wallet.', category: 'social', points: 20, icon: '🤝', requirement: 'Successful referral', isRepeatable: true, difficulty: 'easy' },
  { id: 'streak-7', title: 'Week Warrior', description: 'Maintain a 7-day security check streak.', category: 'social', points: 50, icon: '🔥', requirement: '7-day consecutive streak', isRepeatable: false, difficulty: 'hard' },
  { id: 'streak-30', title: 'Monthly Guardian', description: 'Maintain a 30-day security check streak.', category: 'social', points: 150, icon: '💎', requirement: '30-day consecutive streak', isRepeatable: false, difficulty: 'expert' },
]

// Badge tiers and requirements
export const BADGES: Badge[] = [
  { id: 'badge-bronze', name: 'Bronze Guardian', description: 'Started your security journey', tier: 'bronze', icon: '🥉', requirement: 'Earn 50 points', requiredPoints: 50, unlocked: false },
  { id: 'badge-silver', name: 'Silver Sentinel', description: 'Demonstrating consistent security practices', tier: 'silver', icon: '🥈', requirement: 'Earn 200 points', requiredPoints: 200, unlocked: false },
  { id: 'badge-gold', name: 'Gold Protector', description: 'A true security champion', tier: 'gold', icon: '🥇', requirement: 'Earn 500 points', requiredPoints: 500, unlocked: false },
  { id: 'badge-platinum', name: 'Platinum Defender', description: 'Elite security expertise', tier: 'platinum', icon: '💠', requirement: 'Earn 1000 points', requiredPoints: 1000, unlocked: false },
  { id: 'badge-diamond', name: 'Diamond Vault Keeper', description: 'Legendary security mastery', tier: 'diamond', icon: '💎', requirement: 'Earn 2500 points', requiredPoints: 2500, unlocked: false },
  { id: 'badge-streak7', name: 'Week Warrior', description: '7-day security streak', tier: 'silver', icon: '🔥', requirement: '7-day streak', requiredPoints: 0, unlocked: false },
  { id: 'badge-streak30', name: 'Iron Will', description: '30-day security streak', tier: 'gold', icon: '⚡', requirement: '30-day streak', requiredPoints: 0, unlocked: false },
  { id: 'badge-auditor', name: 'Contract Auditor', description: 'Audited 10+ contracts', tier: 'gold', icon: '🔍', requirement: 'Audit 10 contracts', requiredPoints: 0, unlocked: false },
  { id: 'badge-revoker', name: 'Approval Revoker', description: 'Revoked 5+ dangerous approvals', tier: 'silver', icon: '🚫', requirement: 'Revoke 5 approvals', requiredPoints: 0, unlocked: false },
  { id: 'badge-multichain', name: 'Multi-Chain Master', description: 'Secured wallets on 5+ chains', tier: 'platinum', icon: '⛓️', requirement: 'Link 5 chains', requiredPoints: 0, unlocked: false },
]

// Level thresholds
export const LEVEL_THRESHOLDS: { tier: BadgeTier; minPoints: number; title: string }[] = [
  { tier: 'bronze', minPoints: 0, title: 'Bronze Guardian' },
  { tier: 'silver', minPoints: 200, title: 'Silver Sentinel' },
  { tier: 'gold', minPoints: 500, title: 'Gold Protector' },
  { tier: 'platinum', minPoints: 1000, title: 'Platinum Defender' },
  { tier: 'diamond', minPoints: 2500, title: 'Diamond Vault Keeper' },
]

// In-memory user state (would be DB in production)
let currentUser: UserProfile | null = null
let leaderboard: LeaderboardEntry[] = []

export function getCurrentUser(): UserProfile | null {
  return currentUser
}

export function initializeUser(address: string): UserProfile {
  currentUser = {
    walletAddress: address,
    totalPoints: 0,
    level: 'bronze',
    streak: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    questsCompleted: [],
    badges: [],
    rank: Math.floor(Math.random() * 1000) + 50,
    joinedAt: new Date().toISOString(),
  }
  return currentUser
}

export function getUserQuests(): UserQuest[] {
  const user = currentUser
  return QUESTS.map(quest => ({
    ...quest,
    completed: user?.questsCompleted.includes(quest.id) ?? false,
    completedAt: user?.questsCompleted.includes(quest.id) ? new Date().toISOString() : undefined,
    progress: user?.questsCompleted.includes(quest.id) ? 100 : Math.floor(Math.random() * 60),
  }))
}

export function getUserBadges(): Badge[] {
  const user = currentUser
  if (!user) return BADGES.map(b => ({ ...b }))

  return BADGES.map(badge => {
    const unlockedByPoints = badge.requiredPoints > 0 && user.totalPoints >= badge.requiredPoints
    const unlockedByStreak = badge.id === 'badge-streak7' && user.streak >= 7
    const unlockedByStreak30 = badge.id === 'badge-streak30' && user.streak >= 30
    const unlocked = user.badges.includes(badge.id) || unlockedByPoints || unlockedByStreak || unlockedByStreak30

    return {
      ...badge,
      unlocked,
      unlockedAt: unlocked ? new Date().toISOString() : undefined,
    }
  })
}

export function completeQuest(questId: string): { success: boolean; pointsEarned: number; newBadges: string[]; message: string } {
  if (!currentUser) return { success: false, pointsEarned: 0, newBadges: [], message: 'No user session' }

  const quest = QUESTS.find(q => q.id === questId)
  if (!quest) return { success: false, pointsEarned: 0, newBadges: [], message: 'Quest not found' }

  if (currentUser.questsCompleted.includes(questId) && !quest.isRepeatable) {
    return { success: false, pointsEarned: 0, newBadges: [], message: 'Quest already completed' }
  }

  // Add points and mark complete
  currentUser.totalPoints += quest.points
  if (!currentUser.questsCompleted.includes(questId)) {
    currentUser.questsCompleted.push(questId)
  }
  currentUser.lastActiveDate = new Date().toISOString().split('T')[0]

  // Update level
  const newLevel = [...LEVEL_THRESHOLDS].reverse().find(l => currentUser!.totalPoints >= l.minPoints)
  if (newLevel) currentUser.level = newLevel.tier

  // Check for new badges
  const newBadges: string[] = []
  const badges = getUserBadges()
  for (const badge of badges) {
    if (badge.unlocked && !currentUser.badges.includes(badge.id)) {
      currentUser.badges.push(badge.id)
      newBadges.push(badge.name)
    }
  }

  // Update streak for daily check
  if (questId === 'daily-check') {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    if (currentUser.lastActiveDate === yesterday || currentUser.lastActiveDate === today) {
      currentUser.streak += 1
    } else {
      currentUser.streak = 1
    }
  }

  return {
    success: true,
    pointsEarned: quest.points,
    newBadges,
    message: `+${quest.points} points! ${quest.title} completed.`,
  }
}

export function getLeaderboard(): LeaderboardEntry[] {
  // Generate mock leaderboard
  if (leaderboard.length === 0) {
    const names = [
      '0x1234...5678', '0xabcd...ef01', '0x9876...5432', '0xfedc...ba98',
      '0x1111...2222', '0x3333...4444', '0x5553...6666', '0x7777...8888',
      '0x9999...aaaa', '0xbbbb...cccc', '0xdddd...eeee', '0xdead...beef',
      '0xcafe...babe', '0xface...feed', '0x0bad...c0de',
    ]
    leaderboard = names.map((addr, i) => ({
      rank: i + 1,
      address: addr,
      points: Math.floor(Math.random() * 2000) + 100,
      level: (['bronze', 'silver', 'gold', 'platinum', 'diamond'] as BadgeTier[])[Math.min(Math.floor(Math.random() * 5), 4)],
      streak: Math.floor(Math.random() * 30),
      badges: Math.floor(Math.random() * 8),
      questsCompleted: Math.floor(Math.random() * QUESTS.length),
    })).sort((a, b) => b.points - a.points).map((e, i) => ({ ...e, rank: i + 1 }))
  }

  // Insert current user if exists
  if (currentUser) {
    const existing = leaderboard.findIndex(e => e.address === currentUser!.walletAddress)
    const userEntry: LeaderboardEntry = {
      rank: 0,
      address: currentUser.walletAddress,
      points: currentUser.totalPoints,
      level: currentUser.level,
      streak: currentUser.streak,
      badges: currentUser.badges.length,
      questsCompleted: currentUser.questsCompleted.length,
    }
    if (existing >= 0) {
      leaderboard[existing] = userEntry
    } else {
      leaderboard.push(userEntry)
    }
    leaderboard.sort((a, b) => b.points - a.points)
    leaderboard.forEach((e, i) => { e.rank = i + 1 })
  }

  return leaderboard
}

export function getNextLevel(): { current: BadgeTier; next: BadgeTier | null; pointsNeeded: number; progress: number } | null {
  if (!currentUser) return null

  const currentIdx = LEVEL_THRESHOLDS.findIndex(l => l.tier === currentUser!.level)
  const nextLevel = LEVEL_THRESHOLDS[currentIdx + 1]

  if (!nextLevel) return { current: currentUser.level, next: null, pointsNeeded: 0, progress: 100 }

  const currentThreshold = LEVEL_THRESHOLDS[currentIdx].minPoints
  const pointsInLevel = currentUser.totalPoints - currentThreshold
  const pointsForLevel = nextLevel.minPoints - currentThreshold
  const progress = Math.min(100, Math.floor((pointsInLevel / pointsForLevel) * 100))

  return {
    current: currentUser.level,
    next: nextLevel.tier,
    pointsNeeded: nextLevel.minPoints - currentUser.totalPoints,
    progress,
  }
}

export function shareAchievement(questTitle: string, points: number): string {
  const text = `🛡️ I just completed "${questTitle}" on SweepGuard and earned ${points} security points! 🔐\n\nProtect your crypto wallet: https://sweeptsguard.vercel.app\n\n#SweepGuard #CryptoSecurity #Web3`
  return text
}

export function getTierColor(tier: BadgeTier): string {
  switch (tier) {
    case 'bronze': return '#cd7f32'
    case 'silver': return '#c0c0c0'
    case 'gold': return '#ffd700'
    case 'platinum': return '#e5e4e2'
    case 'diamond': return '#b9f2ff'
  }
}

export function getTierGradient(tier: BadgeTier): string {
  switch (tier) {
    case 'bronze': return 'from-orange-700 to-amber-600'
    case 'silver': return 'from-gray-400 to-slate-300'
    case 'gold': return 'from-yellow-500 to-amber-400'
    case 'platinum': return 'from-gray-200 to-white'
    case 'diamond': return 'from-cyan-400 to-blue-300'
  }
}
