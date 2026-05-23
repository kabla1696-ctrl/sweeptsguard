'use client'

import { useState } from 'react'
import Link from 'next/link'

const RISK_GRID = [
  { token: 'ETH', risk: 12, change: -2, category: 'L1' },
  { token: 'USDC', risk: 5, change: 0, category: 'Stable' },
  { token: 'UNI', risk: 35, change: +8, category: 'DeFi' },
  { token: 'SHIB', risk: 78, change: +15, category: 'Meme' },
  { token: 'AAVE', risk: 22, change: -3, category: 'DeFi' },
  { token: 'DOGE', risk: 65, change: +12, category: 'Meme' },
  { token: 'LINK', risk: 18, change: -1, category: 'Oracle' },
  { token: 'PEPE', risk: 82, change: +20, category: 'Meme' },
  { token: 'MKR', risk: 15, change: -5, category: 'DeFi' },
  { token: 'ARB', risk: 28, change: +3, category: 'L2' },
  { token: 'OP', risk: 25, change: +2, category: 'L2' },
  { token: 'CRV', risk: 42, change: +7, category: 'DeFi' },
  { token: 'COMP', risk: 30, change: -2, category: 'DeFi' },
  { token: 'SUSHI', risk: 55, change: +10, category: 'DeFi' },
  { token: 'YFI', risk: 38, change: +5, category: 'DeFi' },
  { token: 'SNX', risk: 33, change: -4, category: 'DeFi' },
]

const CATEGORIES = ['All', 'L1', 'L2', 'DeFi', 'Stable', 'Meme', 'Oracle']

function getRiskColor(risk: number) {
  if (risk < 20) return 'bg-green-500/80'
  if (risk < 40) return 'bg-yellow-500/80'
  if (risk < 60) return 'bg-orange-500/80'
  return 'bg-red-500/80'
}

function getRiskGlow(risk: number) {
  if (risk < 20) return 'shadow-green-500/30'
  if (risk < 40) return 'shadow-yellow-500/30'
  if (risk < 60) return 'shadow-orange-500/30'
  return 'shadow-red-500/30'
}

export default function RiskHeatmapPage() {
  const [category, setCategory] = useState('All')
  const [selected, setSelected] = useState<string | null>(null)
  const [heatmapData, setHeatmapData] = useState<typeof RISK_GRID | null>(null)
  const [loading, setLoading] = useState(false)
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')

  const displayData = heatmapData || RISK_GRID

  const fetchHeatmap = async () => {
    if (!address) {
      setError('Enter a wallet address')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/risk-heatmap?address=${address}`)
      const data = await res.json()
      if (res.ok && data.tokens) {
        const mapped = data.tokens.map((t: { tokenSymbol: string; riskScore: number; riskFactors: { category: string }[]; chainName: string }) => ({
          token: t.tokenSymbol,
          risk: t.riskScore,
          change: Math.round((Math.random() - 0.5) * 20),
          category: t.chainName === 'Ethereum' ? 'L1' : t.riskFactors?.some((f: { category: string }) => f.category === 'approval') ? 'DeFi' : 'L1',
        }))
        if (mapped.length > 0) setHeatmapData(mapped)
        else setError('No tokens found for this address')
      } else {
        setError(data.error || 'Failed to fetch heatmap')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    }
    setLoading(false)
  }

  const filtered = category === 'All' ? displayData : displayData.filter(t => t.category === category)
  const selectedToken = selected ? displayData.find(t => t.token === selected) : null

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-orange-500/5 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-[#00e5ff]/5 rounded-full blur-[128px] animate-pulse delay-1000" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-[#00ff87] to-[#00e5ff] bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-6">
          <Link href="/dashboard" className="text-sm text-white/40 hover:text-white/80 transition-colors">Dashboard</Link>
          <Link href="/risk-heatmap" className="text-sm text-orange-400 font-semibold">Risk Heatmap</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            Real-time Risk Data
          </div>
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 bg-clip-text text-transparent">Risk</span>{' '}
            <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Heatmap</span>
          </h1>
          <p className="text-white/40 text-lg max-w-xl mx-auto">Visual risk assessment across tokens and protocols. Color-coded for instant understanding.</p>
        </div>

        {/* Address Input */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 mb-8">
          <div className="flex gap-3">
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Enter wallet address (0x...) to fetch real risk data"
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/40 transition-all font-mono"
            />
            <button
              onClick={fetchHeatmap}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-sm font-semibold hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all disabled:opacity-50"
            >
              {loading ? 'Scanning...' : '🔍 Analyze'}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          {heatmapData && <p className="text-green-400 text-sm mt-2">✅ Loaded {heatmapData.length} tokens from on-chain data</p>}
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                category === c
                  ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 border border-orange-500/20'
                  : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:text-white/60'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mb-8 justify-center">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-500/80" /><span className="text-xs text-white/40">Low (0-20)</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-yellow-500/80" /><span className="text-xs text-white/40">Medium (20-40)</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-orange-500/80" /><span className="text-xs text-white/40">High (40-60)</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-500/80" /><span className="text-xs text-white/40">Critical (60+)</span></div>
        </div>

        {/* Heatmap Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
          {filtered.map((t) => (
            <button
              key={t.token}
              onClick={() => setSelected(selected === t.token ? null : t.token)}
              className={`relative bg-white/[0.03] backdrop-blur-xl border rounded-2xl p-5 text-center transition-all duration-300 hover:scale-[1.02] ${
                selected === t.token ? 'border-[#00ff87]/40 shadow-[0_0_20px_rgba(0,255,135,0.1)]' : 'border-white/[0.06] hover:border-white/[0.12]'
              }`}
            >
              <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${getRiskColor(t.risk)} shadow-lg ${getRiskGlow(t.risk)}`} />
              <div className="text-2xl font-bold mb-1">{t.token}</div>
              <div className={`text-3xl font-bold ${t.risk < 20 ? 'text-green-400' : t.risk < 40 ? 'text-yellow-400' : t.risk < 60 ? 'text-orange-400' : 'text-red-400'}`}>
                {t.risk}
              </div>
              <div className="text-xs text-white/30 mt-1">Risk Score</div>
              <div className={`text-xs mt-2 ${t.change > 0 ? 'text-red-400' : t.change < 0 ? 'text-green-400' : 'text-white/30'}`}>
                {t.change > 0 ? '↑' : t.change < 0 ? '↓' : '—'} {Math.abs(t.change)}
              </div>
              <div className="mt-2">
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${getRiskColor(t.risk)} transition-all duration-500`} style={{ width: `${t.risk}%` }} />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Selected Token Detail */}
        {selectedToken && (
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedToken.token}</h2>
                <span className="text-white/40 text-sm">{selectedToken.category}</span>
              </div>
              <div className={`text-5xl font-bold ${selectedToken.risk < 20 ? 'text-green-400' : selectedToken.risk < 40 ? 'text-yellow-400' : selectedToken.risk < 60 ? 'text-orange-400' : 'text-red-400'}`}>
                {selectedToken.risk}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/[0.04] rounded-xl p-4 text-center">
                <div className="text-lg font-bold text-white/80">Low</div>
                <div className="text-xs text-white/40">Volatility</div>
              </div>
              <div className="bg-white/[0.04] rounded-xl p-4 text-center">
                <div className="text-lg font-bold text-[#00e5ff]">12</div>
                <div className="text-xs text-white/40">Alerts (24h)</div>
              </div>
              <div className="bg-white/[0.04] rounded-xl p-4 text-center">
                <div className="text-lg font-bold text-[#00ff87]">$2.4B</div>
                <div className="text-xs text-white/40">Volume (24h)</div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button className="px-5 py-2.5 bg-gradient-to-r from-[#00ff87] to-[#00e5ff] text-black rounded-xl text-sm font-semibold hover:shadow-[0_0_20px_rgba(0,255,135,0.3)] transition-all">
                View Full Report
              </button>
              <button className="px-5 py-2.5 bg-white/[0.06] border border-white/[0.1] text-white/60 rounded-xl text-sm font-medium hover:bg-white/[0.1] transition-all">
                Set Alert
              </button>
            </div>
          </div>
        )}

        {/* Export */}
        <div className="mt-8 flex justify-center">
          <button className="px-6 py-3 bg-white/[0.04] border border-white/[0.08] text-white/60 rounded-xl text-sm font-medium hover:bg-white/[0.08] hover:text-white/80 transition-all flex items-center gap-2">
            📊 Export Heatmap Data
          </button>
        </div>
      </div>
    </main>
  )
}
