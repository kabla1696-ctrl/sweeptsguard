'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  QUESTS,
  BADGES,
  LEVEL_THRESHOLDS,
  initializeUser,
  getCurrentUser,
  getUserQuests,
  getUserBadges,
  completeQuest,
  getLeaderboard,
  getNextLevel,
  shareAchievement,
  getTierColor,
  getTierGradient,
  type UserProfile,
  type UserQuest,
  type Badge,
  type LeaderboardEntry,
  type BadgeTier,
  type QuestCategory,
} from '@/lib/gamification'

const CATEGORY_META: Record<QuestCategory, { label: string; icon: string; color: string }> = {
  onboarding: { label: 'Getting Started', icon: '🚀', color: 'from-blue-500 to-cyan-500' },
  security: { label: 'Security', icon: '🛡️', color: 'from-green-500 to-emerald-500' },
  monitoring: { label: 'Monitoring', icon: '📡', color: 'from-yellow-500 to-amber-500' },
  advanced: { label: 'Advanced', icon: '⚡', color: 'from-purple-500 to-violet-500' },
  social: { label: 'Social', icon: '🤝', color: 'from-pink-500 to-rose-500' },
}

const DIFFICULTY_COLORS = {
  easy: 'bg-green-500/20 text-green-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  hard: 'bg-orange-500/20 text-orange-400',
  expert: 'bg-red-500/20 text-red-400',
}

export default function SecurityQuestsPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [quests, setQuests] = useState<UserQuest[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [activeTab, setActiveTab] = useState<'quests' | 'badges' | 'leaderboard'>('quests')
  const [activeCategory, setActiveCategory] = useState<QuestCategory | 'all'>('all')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'badge' } | null>(null)
  const [showShareModal, setShowShareModal] = useState<string | null>(null)

  useEffect(() => {
    // Initialize with a demo address
    const demoAddress = '0xDemo...User'
    initializeUser(demoAddress)
    const u = getCurrentUser()!
    // Give some demo points
    u.totalPoints = 145
    u.streak = 3
    u.questsCompleted = ['connect-wallet', 'first-scan', 'check-allowances', 'set-alerts']
    u.level = 'bronze'
    setUser(u)
    setQuests(getUserQuests())
    setBadges(getUserBadges())
    setLeaderboard(getLeaderboard())
  }, [])

  const handleCompleteQuest = useCallback((questId: string) => {
    const result = completeQuest(questId)
    if (result.success) {
      setUser(getCurrentUser())
      setQuests(getUserQuests())
      setBadges(getUserBadges())
      setLeaderboard(getLeaderboard())
      setToast({ message: result.message, type: 'success' })
      if (result.newBadges.length > 0) {
        setTimeout(() => {
          setToast({ message: `🏆 Badge Unlocked: ${result.newBadges.join(', ')}!`, type: 'badge' })
        }, 2000)
      }
      setTimeout(() => setToast(null), 4000)
    }
  }, [])

  const handleShare = (questTitle: string, points: number) => {
    const text = shareAchievement(questTitle, points)
    if (navigator.share) {
      navigator.share({ title: 'SweepGuard Achievement', text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text)
      setToast({ message: 'Copied to clipboard!', type: 'success' })
      setTimeout(() => setToast(null), 2000)
    }
    setShowShareModal(null)
  }

  const nextLevel = getNextLevel()
  const filteredQuests = activeCategory === 'all' ? quests : quests.filter(q => q.category === activeCategory)

  const completedCount = quests.filter(q => q.completed).length
  const totalPoints = user?.totalPoints ?? 0

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">Dashboard</Link>
          <Link href="/audit-bot" className="text-sm text-white/50 hover:text-white transition-colors">Audit Bot</Link>
        </div>
      </nav>

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right duration-300">
          <div className={`px-5 py-3 rounded-xl border backdrop-blur-sm ${toast.type === 'badge' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
            {toast.message}
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🏆</span>
            <div>
              <h1 className="text-3xl font-bold">Security Quests</h1>
              <p className="text-white/40">Complete quests, earn points, level up your security</p>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
            <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">{totalPoints}</p>
            <p className="text-white/30 text-xs">Points</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
            <p className="text-2xl font-bold" style={{ color: getTierColor(user?.level ?? 'bronze') }}>
              {user?.level?.charAt(0).toUpperCase()}{user?.level?.slice(1)}
            </p>
            <p className="text-white/30 text-xs">Level</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
            <p className="text-2xl font-bold text-orange-400">🔥 {user?.streak ?? 0}</p>
            <p className="text-white/30 text-xs">Day Streak</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
            <p className="text-2xl font-bold text-green-400">{completedCount}/{quests.length}</p>
            <p className="text-white/30 text-xs">Quests</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
            <p className="text-2xl font-bold text-cyan-400">#{user?.rank ?? '-'}</p>
            <p className="text-white/30 text-xs">Rank</p>
          </div>
        </div>

        {/* Level Progress */}
        {nextLevel && nextLevel.next && (
          <div className="mb-8 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/50">Level Progress</span>
              <span className="text-sm text-white/50">{nextLevel.pointsNeeded} points to <span style={{ color: getTierColor(nextLevel.next) }}>{nextLevel.next}</span></span>
            </div>
            <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r ${getTierGradient(nextLevel.current)} transition-all duration-1000`}
                style={{ width: `${nextLevel.progress}%` }} />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-white/[0.02] rounded-xl border border-white/[0.05] w-fit">
          {([['quests', '🎯 Quests'], ['badges', '🏅 Badges'], ['leaderboard', '📊 Leaderboard']] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/60'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Quests Tab */}
        {activeTab === 'quests' && (
          <>
            {/* Category Filter */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <button onClick={() => setActiveCategory('all')}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${activeCategory === 'all' ? 'bg-white/[0.1] text-white' : 'bg-white/[0.03] text-white/40 hover:text-white/60'}`}>
                All
              </button>
              {Object.entries(CATEGORY_META).map(([cat, meta]) => (
                <button key={cat} onClick={() => setActiveCategory(cat as QuestCategory)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${activeCategory === cat ? 'bg-white/[0.1] text-white' : 'bg-white/[0.03] text-white/40 hover:text-white/60'}`}>
                  {meta.icon} {meta.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredQuests.map((quest) => (
                <div key={quest.id} className={`p-5 rounded-xl border transition-all ${quest.completed ? 'bg-green-500/5 border-green-500/15' : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{quest.icon}</span>
                      <div>
                        <h3 className="font-semibold text-sm">{quest.title}</h3>
                        <p className="text-white/40 text-xs mt-0.5">{quest.description}</p>
                      </div>
                    </div>
                    <span className="text-purple-400 font-bold text-sm whitespace-nowrap">+{quest.points}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[quest.difficulty]}`}>{quest.difficulty}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-white/30">{CATEGORY_META[quest.category].icon} {CATEGORY_META[quest.category].label}</span>
                      {quest.isRepeatable && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">🔄 Repeatable</span>}
                    </div>
                    {quest.completed ? (
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 text-xs">✅ Done</span>
                        <button onClick={() => setShowShareModal(quest.id)} className="text-white/20 hover:text-white/60 text-xs transition-colors">📣</button>
                      </div>
                    ) : (
                      <button onClick={() => handleCompleteQuest(quest.id)}
                        className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-violet-600 rounded-lg text-xs font-semibold hover:from-purple-500 hover:to-violet-500 transition-all">
                        Complete
                      </button>
                    )}
                  </div>
                  {!quest.completed && quest.progress > 0 && (
                    <div className="mt-3">
                      <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500/50 rounded-full transition-all" style={{ width: `${quest.progress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Badges Tab */}
        {activeTab === 'badges' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {badges.map((badge) => (
              <div key={badge.id} className={`p-5 rounded-xl border text-center transition-all ${badge.unlocked ? 'bg-white/[0.03] border-white/[0.1]' : 'bg-white/[0.01] border-white/[0.04] opacity-40'}`}>
                <div className="text-4xl mb-2">{badge.icon}</div>
                <h3 className="font-semibold text-sm mb-1">{badge.name}</h3>
                <p className="text-white/30 text-[10px] mb-2">{badge.description}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium`} style={{ backgroundColor: `${getTierColor(badge.tier)}20`, color: getTierColor(badge.tier) }}>
                  {badge.tier}
                </span>
                {badge.unlocked && <p className="text-green-400 text-[10px] mt-2">✅ Unlocked</p>}
                {!badge.unlocked && <p className="text-white/20 text-[10px] mt-2">🔒 {badge.requirement}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-2">
            {leaderboard.slice(0, 20).map((entry) => (
              <div key={entry.rank} className={`p-4 rounded-xl border flex items-center justify-between transition-all ${entry.address === user?.walletAddress ? 'bg-purple-500/10 border-purple-500/20' : 'bg-white/[0.02] border-white/[0.05]'}`}>
                <div className="flex items-center gap-4">
                  <span className={`text-lg font-bold w-8 text-center ${entry.rank <= 3 ? ['text-yellow-400', 'text-gray-300', 'text-orange-400'][entry.rank - 1] : 'text-white/20'}`}>
                    {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                  </span>
                  <div>
                    <p className="text-sm font-mono">{entry.address}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${getTierColor(entry.level)}20`, color: getTierColor(entry.level) }}>
                        {entry.level}
                      </span>
                      <span className="text-white/20 text-[10px]">🔥 {entry.streak}d</span>
                      <span className="text-white/20 text-[10px]">🏅 {entry.badges}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-purple-400 font-bold">{entry.points}</p>
                  <p className="text-white/20 text-[10px]">{entry.questsCompleted} quests</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowShareModal(null)}>
            <div className="bg-[#12121a] border border-white/[0.1] rounded-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-2">📣 Share Achievement</h3>
              <p className="text-white/40 text-sm mb-4">Share your progress with friends!</p>
              <div className="flex gap-2">
                <button onClick={() => { const q = quests.find(q => q.id === showShareModal); if (q) handleShare(q.title, q.points) }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl text-sm font-semibold">
                  Share
                </button>
                <button onClick={() => setShowShareModal(null)}
                  className="px-4 py-2.5 bg-white/[0.05] rounded-xl text-sm text-white/50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
