'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Quest {
  id: string
  title: string
  description: string
  reward: number
  difficulty: 'easy' | 'medium' | 'hard'
  completed: boolean
  category: string
}

const QUESTS: Quest[] = [
  { id: 'scan-1', title: 'First Scan', description: 'Scan your first wallet address', reward: 10, difficulty: 'easy', completed: false, category: 'Security' },
  { id: 'scan-5', title: 'Scan Master', description: 'Scan 5 different addresses', reward: 50, difficulty: 'medium', completed: false, category: 'Security' },
  { id: 'approval-check', title: 'Approval Audit', description: 'Check token approvals for your wallet', reward: 20, difficulty: 'easy', completed: false, category: 'Security' },
  { id: 'revoke-1', title: 'First Revoke', description: 'Revoke a risky token approval', reward: 30, difficulty: 'medium', completed: false, category: 'Security' },
  { id: 'health-check', title: 'Health Check', description: 'Check your wallet health score', reward: 15, difficulty: 'easy', completed: false, category: 'Monitor' },
  { id: 'whale-watch', title: 'Whale Watcher', description: 'View whale alerts page', reward: 10, difficulty: 'easy', completed: false, category: 'Monitor' },
  { id: 'gas-saver', title: 'Gas Saver', description: 'Check gas prices across chains', reward: 15, difficulty: 'easy', completed: false, category: 'Tools' },
  { id: 'multi-chain', title: 'Multi-Chain Explorer', description: 'Check an address on 3+ chains', reward: 25, difficulty: 'medium', completed: false, category: 'Tools' },
  { id: 'nft-scan', title: 'NFT Guardian', description: 'Scan for NFTs on your wallet', reward: 20, difficulty: 'easy', completed: false, category: 'Recover' },
  { id: 'referral-1', title: 'Share the Love', description: 'Refer a friend to SweepGuard', reward: 100, difficulty: 'hard', completed: false, category: 'Social' },
  { id: 'dark-web-check', title: 'Dark Web Scan', description: 'Check if your address is on dark web', reward: 30, difficulty: 'medium', completed: false, category: 'Security' },
  { id: 'freeze-ready', title: 'Freeze Ready', description: 'Learn how to freeze stolen funds', reward: 20, difficulty: 'easy', completed: false, category: 'Recover' },
]

export default function SecurityQuestsPage() {
  const [quests, setQuests] = useState<Quest[]>(QUESTS)
  const [totalPoints, setTotalPoints] = useState(0)
  const [filter, setFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all')

  useEffect(() => {
    const saved = localStorage.getItem('sg-quests')
    if (saved) {
      try {
        const completedIds: string[] = JSON.parse(saved)
        setQuests(quests.map(q => ({ ...q, completed: completedIds.includes(q.id) })))
        setTotalPoints(completedIds.reduce((sum, id) => {
          const quest = QUESTS.find(q => q.id === id)
          return sum + (quest?.reward || 0)
        }, 0))
      } catch { /* ok */ }
    }
  }, [])

  const completeQuest = (id: string) => {
    const updated = quests.map(q => q.id === id ? { ...q, completed: true } : q)
    setQuests(updated)
    const completedIds = updated.filter(q => q.completed).map(q => q.id)
    localStorage.setItem('sg-quests', JSON.stringify(completedIds))
    setTotalPoints(updated.filter(q => q.completed).reduce((sum, q) => sum + q.reward, 0))
  }

  const filtered = quests.filter(q => filter === 'all' || q.difficulty === filter)
  const completedCount = quests.filter(q => q.completed).length

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-yellow-500/[0.04] rounded-full blur-[120px]" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
      </nav>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🏆 Security Quests</h1>
        <p className="text-white/40 mb-8">Complete security tasks and earn points</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-center">
            <div className="text-3xl font-bold text-yellow-400">{totalPoints}</div>
            <div className="text-sm text-white/40">Points</div>
          </div>
          <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-center">
            <div className="text-3xl font-bold text-green-400">{completedCount}/{quests.length}</div>
            <div className="text-sm text-white/40">Completed</div>
          </div>
          <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-center">
            <div className="text-3xl font-bold text-purple-400">{Math.round(completedCount / quests.length * 100)}%</div>
            <div className="text-sm text-white/40">Progress</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {(['all', 'easy', 'medium', 'hard'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? 'bg-yellow-600 text-white' : 'bg-white/[0.03] text-white/40'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Quests */}
        <div className="space-y-3">
          {filtered.map(quest => (
            <div key={quest.id} className={`p-5 rounded-2xl border transition-all ${
              quest.completed ? 'bg-green-500/[0.04] border-green-500/20' : 'bg-white/[0.02] border-white/[0.06]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{quest.completed ? '✅' : quest.difficulty === 'hard' ? '🔴' : quest.difficulty === 'medium' ? '🟡' : '🟢'}</span>
                  <div>
                    <div className={`font-semibold ${quest.completed ? 'line-through text-white/40' : ''}`}>{quest.title}</div>
                    <div className="text-xs text-white/40">{quest.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-yellow-400 font-bold">+{quest.reward}</span>
                  {!quest.completed && (
                    <button onClick={() => completeQuest(quest.id)}
                      className="px-4 py-2 bg-yellow-600/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm hover:bg-yellow-600/30">
                      Complete
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/30">
                <span className={`px-2 py-0.5 rounded-full ${
                  quest.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
                  quest.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>{quest.difficulty}</span>
                <span>{quest.category}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
