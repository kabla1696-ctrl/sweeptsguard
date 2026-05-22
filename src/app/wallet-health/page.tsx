'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  walletHealthScorer,
  type WalletHealthReport,
  type HealthCategory,
} from '@/lib/walletHealth'

const GRADE_COLORS: Record<string, { text: string; bg: string }> = {
  A: { text: 'text-green-400', bg: 'bg-green-500' },
  B: { text: 'text-emerald-400', bg: 'bg-emerald-500' },
  C: { text: 'text-yellow-400', bg: 'bg-yellow-500' },
  D: { text: 'text-orange-400', bg: 'bg-orange-500' },
  F: { text: 'text-red-400', bg: 'bg-red-500' },
}

const STATUS_COLORS: Record<string, string> = {
  good: 'text-green-400',
  warning: 'text-yellow-400',
  danger: 'text-red-400',
  info: 'text-blue-400',
}

function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const gradeColor = GRADE_COLORS[grade] || GRADE_COLORS.F
  const circumference = 2 * Math.PI * 70
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative flex items-center justify-center">
      <svg width="180" height="180" viewBox="0 0 180 180">
        {/* Background circle */}
        <circle
          cx="90" cy="90" r="70"
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="12"
        />
        {/* Score arc */}
        <circle
          cx="90" cy="90" r="70"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          className={gradeColor.text}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className={`text-4xl font-bold ${gradeColor.text}`}>{score}</div>
        <div className="text-white/40 text-xs">/ 100</div>
        <div className={`text-2xl font-bold mt-1 ${gradeColor.text}`}>Grade {grade}</div>
      </div>
    </div>
  )
}

function CategoryBar({ category }: { category: HealthCategory }) {
  const pct = Math.round((category.score / category.maxScore) * 100)
  const barColor = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{category.icon}</span>
          <span className="font-semibold text-sm">{category.name}</span>
        </div>
        <span className="text-white/70 font-mono text-sm">{category.score}/{category.maxScore}</span>
      </div>
      <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-white/40 text-xs">{category.details}</p>

      {/* Sub items */}
      {category.subItems.length > 0 && (
        <div className="mt-3 space-y-1">
          {category.subItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-white/50">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className={STATUS_COLORS[item.status] || 'text-white/40'}>{item.value}</span>
                {item.impact !== 0 && (
                  <span className={`text-[10px] px-1 rounded ${item.impact > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {item.impact > 0 ? '+' : ''}{item.impact}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function WalletHealthPage() {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<WalletHealthReport | null>(null)
  const [error, setError] = useState('')

  const analyzeWallet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      setError('Please enter a valid EVM address')
      return
    }

    setLoading(true)
    setError('')
    setReport(null)

    try {
      const result = await walletHealthScorer.analyze(address)
      setReport(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const shareReport = () => {
    if (!report) return
    const text = `🛡️ Wallet Health Report\n\nAddress: ${report.address}\nScore: ${report.overallScore}/100 (Grade ${report.grade})\n\n${report.summary}\n\nAnalyzed at: ${new Date(report.analyzedAt).toLocaleString()}`
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            SweepGuard
          </span>
        </Link>
        <div className="flex gap-4">
          <Link href="/scan" className="text-sm text-white/50 hover:text-white transition-colors">Scan</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">Dashboard</Link>
          <Link href="/wallet-health" className="text-sm text-green-400 font-medium">Wallet Health</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">💚 Wallet Health Score</h1>
        <p className="text-white/40 mb-8">
          Comprehensive health analysis for your wallet — approval risk, drainer exposure, token diversity, and more
        </p>

        {/* Form */}
        <form onSubmit={analyzeWallet} className="flex gap-2 mb-8">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter wallet address (0x...)"
            className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50 hover:from-green-500 hover:to-emerald-500 transition-all"
          >
            {loading ? 'Analyzing...' : '💚 Check Health'}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center gap-3 text-green-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing wallet health across multiple chains...
            </div>
          </div>
        )}

        {/* Report */}
        {report && (
          <div className="space-y-8">
            {/* Score Gauge + Summary */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="flex justify-center">
                <ScoreGauge score={report.overallScore} grade={report.grade} />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-3">Health Summary</h2>
                <p className="text-white/60 text-sm leading-relaxed mb-4">{report.summary}</p>
                <div className="flex gap-3">
                  <button
                    onClick={shareReport}
                    className="px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-sm hover:bg-white/[0.08] transition-all"
                  >
                    📋 Copy Report
                  </button>
                  <Link
                    href={`/scan?address=${report.address}`}
                    className="px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-lg text-sm text-green-400 hover:bg-green-600/30 transition-all"
                  >
                    🔍 Full Scan
                  </Link>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div>
              <h2 className="text-lg font-semibold mb-4">📊 Category Breakdown</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {report.categories.map((category) => (
                  <CategoryBar key={category.id} category={category} />
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {report.recommendations.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">💡 Recommendations</h2>
                <div className="space-y-3">
                  {report.recommendations.map((rec, i) => {
                    const prioColor = rec.priority === 'high' ? 'border-red-500/30 bg-red-500/5'
                      : rec.priority === 'medium' ? 'border-yellow-500/30 bg-yellow-500/5'
                      : 'border-blue-500/30 bg-blue-500/5'
                    const prioLabel = rec.priority === 'high' ? '🔴 High' : rec.priority === 'medium' ? '🟡 Medium' : '🔵 Low'
                    return (
                      <div key={i} className={`p-4 rounded-xl border ${prioColor}`}>
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm">{rec.title}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-white/40">{prioLabel}</span>
                        </div>
                        <p className="text-white/50 text-xs mb-2">{rec.description}</p>
                        <p className="text-white/40 text-xs">
                          <span className="text-green-400">Action:</span> {rec.action}
                        </p>
                        <p className="text-green-400/60 text-[10px] mt-1">
                          Potential improvement: +{rec.potentialImprovement} points
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-white/20 text-xs">
              Analyzed at {new Date(report.analyzedAt).toLocaleString()} • Address: {report.address}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
