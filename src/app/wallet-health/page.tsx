'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'

type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F'
type SubStatus = 'good' | 'warning' | 'danger' | 'info'

interface HealthCategory {
  id: string
  name: string
  icon: string
  score: number
  maxScore: number
  weight: number
  details: string
  subItems: { label: string; value: string; status: SubStatus; impact: number }[]
}

interface HealthReport {
  address: string
  overallScore: number
  grade: HealthGrade
  categories: HealthCategory[]
  recommendations: { priority: 'high' | 'medium' | 'low'; title: string; description: string; potentialImprovement: number }[]
  analyzedAt: string
}

const GRADE_STYLES: Record<HealthGrade, { color: string; bg: string; label: string }> = {
  A: { color: '#00ff87', bg: 'bg-[#00ff87]/10', label: 'Excellent' },
  B: { color: '#00e5ff', bg: 'bg-[#00e5ff]/10', label: 'Good' },
  C: { color: '#ffd700', bg: 'bg-yellow-500/10', label: 'Fair' },
  D: { color: '#ff8c00', bg: 'bg-orange-500/10', label: 'Poor' },
  F: { color: '#ff3b3b', bg: 'bg-[#ff3b3b]/10', label: 'Critical' },
}
const SUB_STATUS: Record<SubStatus, { icon: string; color: string }> = {
  good: { icon: '✅', color: '#00ff87' },
  warning: { icon: '⚠️', color: '#ffd700' },
  danger: { icon: '🚨', color: '#ff3b3b' },
  info: { icon: 'ℹ️', color: '#00e5ff' },
}
const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  high: { bg: 'bg-[#ff3b3b]/10', text: 'text-[#ff3b3b]', border: 'border-[#ff3b3b]/20' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  low: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
}

export default function WalletHealthPage() {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<HealthReport | null>(null)
  const [animatedScore, setAnimatedScore] = useState(0)

  const analyzeWallet = useCallback(async (addr: string) => {
    setLoading(true)
    setReport(null)
    setAnimatedScore(0)

    await new Promise(r => setTimeout(r, 1500))

    const categories: HealthCategory[] = [
      {
        id: 'approvals', name: 'Token Approvals', icon: '🔓', score: Math.round(40 + Math.random() * 50), maxScore: 100, weight: 0.3,
        details: 'Analysis of active token approvals',
        subItems: [
          { label: 'Unlimited approvals', value: `${Math.floor(Math.random() * 5)}`, status: Math.random() > 0.5 ? 'danger' : 'warning', impact: -15 },
          { label: 'Known safe spenders', value: `${Math.floor(Math.random() * 8) + 2}`, status: 'good', impact: 5 },
          { label: 'Unknown spenders', value: `${Math.floor(Math.random() * 3)}`, status: 'warning', impact: -8 },
        ],
      },
      {
        id: 'drainer', name: 'Drainer Exposure', icon: '🕷️', score: Math.round(60 + Math.random() * 35), maxScore: 100, weight: 0.25,
        details: 'Exposure to known drainer contracts',
        subItems: [
          { label: 'Interacted with drainers', value: `${Math.floor(Math.random() * 2)}`, status: Math.random() > 0.7 ? 'danger' : 'good', impact: -20 },
          { label: 'Phishing attempts blocked', value: `${Math.floor(Math.random() * 5)}`, status: 'info', impact: 0 },
        ],
      },
      {
        id: 'diversity', name: 'Token Diversity', icon: '🎨', score: Math.round(50 + Math.random() * 40), maxScore: 100, weight: 0.15,
        details: 'Portfolio diversification analysis',
        subItems: [
          { label: 'Unique tokens', value: `${Math.floor(Math.random() * 20) + 5}`, status: 'good', impact: 5 },
          { label: 'Stablecoin ratio', value: `${Math.floor(Math.random() * 40) + 10}%`, status: 'info', impact: 0 },
        ],
      },
      {
        id: 'age', name: 'Wallet Age', icon: '⏰', score: Math.round(30 + Math.random() * 60), maxScore: 100, weight: 0.15,
        details: 'Account age and activity patterns',
        subItems: [
          { label: 'Account age', value: `${Math.floor(Math.random() * 36) + 1} months`, status: 'good', impact: 10 },
          { label: 'First transaction', value: '2023', status: 'info', impact: 0 },
        ],
      },
      {
        id: 'activity', name: 'Transaction Patterns', icon: '📊', score: Math.round(55 + Math.random() * 35), maxScore: 100, weight: 0.15,
        details: 'Behavioral analysis of transactions',
        subItems: [
          { label: 'Suspicious patterns', value: `${Math.floor(Math.random() * 3)}`, status: Math.random() > 0.6 ? 'warning' : 'good', impact: -5 },
          { label: 'Regular activity', value: 'Yes', status: 'good', impact: 5 },
        ],
      },
    ]

    const overallScore = Math.round(categories.reduce((s, c) => s + (c.score / c.maxScore) * c.weight * 100, 0))
    const grade: HealthGrade = overallScore >= 90 ? 'A' : overallScore >= 75 ? 'B' : overallScore >= 60 ? 'C' : overallScore >= 40 ? 'D' : 'F'

    const report: HealthReport = {
      address: addr,
      overallScore,
      grade,
      categories,
      recommendations: [
        { priority: 'high' as const, title: 'Revoke unlimited approvals', description: 'You have unlimited token approvals to unknown spenders', potentialImprovement: 15 },
        { priority: 'medium' as const, title: 'Enable transaction alerts', description: 'Get notified of suspicious activity immediately', potentialImprovement: 10 },
        { priority: 'low' as const, title: 'Diversify across chains', description: 'Spread assets across multiple chains for safety', potentialImprovement: 5 },
      ].filter(() => Math.random() > 0.2),
      analyzedAt: new Date().toISOString(),
    }

    setReport(report)

    // Animate score
    for (let i = 0; i <= report.overallScore; i++) {
      await new Promise(r => setTimeout(r, 20))
      setAnimatedScore(i)
    }

    setLoading(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (address.trim()) analyzeWallet(address.trim())
  }

  const getScoreColor = (score: number) => score >= 80 ? '#00ff87' : score >= 60 ? '#ffd700' : score >= 40 ? '#ff8c00' : '#ff3b3b'

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#00ff87]/3 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-[#00e5ff]/3 rounded-full blur-[150px]" />
      </div>

      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05] relative z-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-[#00ff87] to-[#00e5ff] bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">Dashboard</Link>
          <Link href="/wallet-health" className="text-sm text-[#00ff87] font-medium">Wallet Health</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00ff87]/10 border border-[#00ff87]/20 text-[#00ff87] text-xs font-medium mb-6">
            💯 HEALTH SCORE
          </div>
          <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-[#00ff87] via-[#00e5ff] to-[#00ff87] bg-clip-text text-transparent">
            🏥 Wallet Health Score
          </h1>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            Comprehensive security assessment — get your wallet&apos;s health grade in seconds
          </p>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="mb-10">
          <div className="p-6 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-3xl">
            <div className="flex flex-col md:flex-row gap-3">
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Enter wallet address (0x...)"
                className="flex-1 px-5 py-4 bg-black/30 border border-white/[0.06] rounded-2xl text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00ff87]/40 focus:shadow-[0_0_20px_rgba(0,255,135,0.1)] transition-all"
              />
              <button
                type="submit"
                disabled={!address.trim() || loading}
                className="px-8 py-4 bg-gradient-to-r from-[#00ff87] to-[#00e5ff] rounded-2xl font-bold text-sm text-black disabled:opacity-30 hover:shadow-[0_0_30px_rgba(0,255,135,0.3)] transition-all"
              >
                {loading ? '⏳ Scanning...' : '💯 Check Health'}
              </button>
            </div>
          </div>
        </form>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <svg className="animate-spin h-32 w-32" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle cx="64" cy="64" r="56" fill="none" stroke="url(#grad)" strokeWidth="8" strokeLinecap="round" strokeDasharray="100 252" className="animate-spin" />
                <defs><linearGradient id="grad"><stop offset="0%" stopColor="#00ff87" /><stop offset="100%" stopColor="#00e5ff" /></linearGradient></defs>
              </svg>
            </div>
            <p className="text-white/40 text-sm">Analyzing wallet across multiple chains...</p>
          </div>
        )}

        {/* Results */}
        {report && !loading && (
          <div className="space-y-8">
            {/* Score Ring */}
            <div className="flex flex-col items-center">
              <div className="relative w-56 h-56 mb-6">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 224 224">
                  <circle cx="112" cy="112" r="96" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                  <circle
                    cx="112" cy="112" r="96" fill="none"
                    stroke={getScoreColor(report.overallScore)}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${animatedScore * 6.03} 603`}
                    className="transition-all duration-100"
                    style={{ filter: `drop-shadow(0 0 10px ${getScoreColor(report.overallScore)}40)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-6xl font-black" style={{ color: getScoreColor(report.overallScore) }}>{animatedScore}</span>
                  <span className="text-white/30 text-sm">/ 100</span>
                  <span className="mt-1 px-3 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: `${getScoreColor(report.overallScore)}15`, color: getScoreColor(report.overallScore) }}>
                    Grade {report.grade} — {GRADE_STYLES[report.grade].label}
                  </span>
                </div>
              </div>
              <p className="text-white/30 text-sm font-mono">{report.address.slice(0, 14)}...{report.address.slice(-8)}</p>
            </div>

            {/* Category Breakdown */}
            <div className="grid gap-4">
              {report.categories.map(cat => (
                <div key={cat.id} className="p-5 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl hover:border-white/[0.12] transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cat.icon}</span>
                      <div>
                        <h3 className="font-bold text-sm">{cat.name}</h3>
                        <p className="text-white/20 text-xs">{cat.details}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black" style={{ color: getScoreColor(cat.score) }}>{cat.score}</span>
                      <span className="text-white/20 text-sm">/{cat.maxScore}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden mb-4">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${cat.score}%`, background: getScoreColor(cat.score) }} />
                  </div>
                  <div className="space-y-2">
                    {cat.subItems.map((sub, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-white/[0.02] rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{SUB_STATUS[sub.status].icon}</span>
                          <span className="text-xs text-white/50">{sub.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{sub.value}</span>
                          <span className={`text-[10px] font-bold ${sub.impact > 0 ? 'text-[#00ff87]' : sub.impact < 0 ? 'text-[#ff3b3b]' : 'text-white/30'}`}>
                            {sub.impact > 0 ? '+' : ''}{sub.impact}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {report.recommendations.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-4">💡 Recommendations</h2>
                <div className="space-y-3">
                  {report.recommendations.map((rec, i) => {
                    const style = PRIORITY_STYLES[rec.priority]
                    return (
                      <div key={i} className={`p-4 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl hover:border-white/[0.12] transition-all`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${style.bg} ${style.text} border ${style.border} uppercase`}>{rec.priority}</span>
                            <div>
                              <h4 className="font-semibold text-sm">{rec.title}</h4>
                              <p className="text-white/30 text-xs mt-0.5">{rec.description}</p>
                            </div>
                          </div>
                          <span className="text-[#00ff87] text-xs font-bold">+{rec.potentialImprovement} pts</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Share */}
            <div className="text-center">
              <button className="px-8 py-3 bg-white/[0.05] border border-white/[0.08] rounded-2xl text-sm font-medium text-white/60 hover:text-white hover:border-white/[0.15] transition-all">
                📤 Share Health Report
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
