'use client'

import { useState } from 'react'
import Link from 'next/link'

const RISK_LEVELS = {
  safe: { bg: 'from-green-500/20 to-emerald-500/10', text: 'text-green-400', border: 'border-green-500/30', glow: 'shadow-green-500/20', icon: '✅', label: 'Safe' },
  suspicious: { bg: 'from-yellow-500/20 to-amber-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', glow: 'shadow-yellow-500/20', icon: '⚠️', label: 'Suspicious' },
  dangerous: { bg: 'from-orange-500/20 to-red-500/10', text: 'text-orange-400', border: 'border-orange-500/30', glow: 'shadow-orange-500/20', icon: '🔶', label: 'Dangerous' },
  critical: { bg: 'from-red-500/20 to-rose-500/10', text: 'text-red-400', border: 'border-red-500/30', glow: 'shadow-red-500/20', icon: '🚨', label: 'Critical' },
}

const MOCK_PATTERNS = [
  { type: 'Honeypot Detection', score: 95, status: 'clean' },
  { type: 'Rug Pull Pattern', score: 88, status: 'clean' },
  { type: 'Flash Loan Attack', score: 92, status: 'warning' },
  { type: 'Sandwich Attack', score: 78, status: 'clean' },
  { type: 'Phishing Signature', score: 99, status: 'danger' },
  { type: 'Approval Exploit', score: 85, status: 'clean' },
]

export default function ScamShieldPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [value, setValue] = useState('')
  const [data, setData] = useState('')
  const [chain, setChain] = useState('1')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [progress, setProgress] = useState(0)

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    setAnalyzing(true)
    setResult(null)
    setProgress(0)
    const interval = setInterval(() => setProgress(p => Math.min(p + Math.random() * 20, 95)), 300)
    await new Promise(r => setTimeout(r, 2500))
    clearInterval(interval)
    setProgress(100)
    setResult({
      riskLevel: 'suspicious',
      score: 72,
      patterns: MOCK_PATTERNS,
      recommendation: 'Exercise caution. The transaction shows signs of potential flash loan exploitation.',
      simulation: { gasEstimate: '142,350', stateChanges: 3, tokenTransfers: 2 },
    })
    setAnalyzing(false)
  }

  const risk = result ? RISK_LEVELS[result.riskLevel as keyof typeof RISK_LEVELS] : RISK_LEVELS.safe

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#00ff87]/5 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#00e5ff]/5 rounded-full blur-[128px] animate-pulse delay-1000" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-[#00ff87] to-[#00e5ff] bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-6">
          <Link href="/dashboard" className="text-sm text-white/40 hover:text-white/80 transition-colors">Dashboard</Link>
          <Link href="/scan" className="text-sm text-white/40 hover:text-white/80 transition-colors">Scan</Link>
          <Link href="/scam-shield" className="text-sm text-[#00ff87] font-semibold">Scam Shield</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00ff87]/10 border border-[#00ff87]/20 text-[#00ff87] text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff87] animate-pulse" />
            AI-Powered Protection
          </div>
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">Scam</span>{' '}
            <span className="bg-gradient-to-r from-[#00ff87] to-[#00e5ff] bg-clip-text text-transparent">Shield</span>
          </h1>
          <p className="text-white/40 text-lg max-w-xl mx-auto">Analyze transactions in real-time. Detect scams before they execute.</p>
        </div>

        {/* Analysis Form */}
        <form onSubmit={handleAnalyze} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 mb-8 hover:border-[#00ff87]/20 transition-all duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">From Address</label>
              <input
                value={from}
                onChange={e => setFrom(e.target.value)}
                placeholder="0x..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00ff87]/40 focus:shadow-[0_0_20px_rgba(0,255,135,0.1)] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">To Address</label>
              <input
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="0x..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00ff87]/40 focus:shadow-[0_0_20px_rgba(0,255,135,0.1)] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Value (ETH)</label>
              <input
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="0.0"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00ff87]/40 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Chain</label>
              <select
                value={chain}
                onChange={e => setChain(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#00ff87]/40 transition-all appearance-none"
              >
                <option value="1">Ethereum</option>
                <option value="56">BSC</option>
                <option value="137">Polygon</option>
                <option value="42161">Arbitrum</option>
              </select>
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Transaction Data (optional)</label>
            <textarea
              value={data}
              onChange={e => setData(e.target.value)}
              placeholder="0x..."
              rows={3}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00ff87]/40 transition-all resize-none font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={analyzing}
            className="w-full py-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#00ff87] to-[#00e5ff] text-black hover:shadow-[0_0_30px_rgba(0,255,135,0.3)] transition-all duration-300 disabled:opacity-50"
          >
            {analyzing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Analyzing... {Math.round(progress)}%
              </span>
            ) : '🛡️ Analyze Transaction'}
          </button>
          {analyzing && (
            <div className="mt-4 h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#00ff87] to-[#00e5ff] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          )}
        </form>

        {/* Results */}
        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Risk Score Card */}
            <div className={`bg-gradient-to-br ${risk.bg} backdrop-blur-xl border ${risk.border} rounded-2xl p-8 shadow-lg ${risk.glow}`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{risk.icon}</span>
                  <div>
                    <h2 className={`text-2xl font-bold ${risk.text}`}>{risk.label}</h2>
                    <p className="text-white/40 text-sm">Risk Assessment Complete</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-5xl font-bold ${risk.text}`}>{result.score}</div>
                  <p className="text-white/30 text-xs uppercase tracking-wider">Risk Score</p>
                </div>
              </div>
              <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden mb-4">
                <div className={`h-full rounded-full bg-gradient-to-r ${risk.bg.replace('/20', '/60').replace('/10', '/40')}`} style={{ width: `${result.score}%` }} />
              </div>
              <p className="text-white/60 text-sm">{result.recommendation}</p>
            </div>

            {/* Simulation */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-[#00e5ff]">⚡</span> Simulation Results
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/[0.04] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-[#00ff87]">{result.simulation.gasEstimate}</div>
                  <div className="text-xs text-white/40 mt-1">Gas Estimate</div>
                </div>
                <div className="bg-white/[0.04] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-[#00e5ff]">{result.simulation.stateChanges}</div>
                  <div className="text-xs text-white/40 mt-1">State Changes</div>
                </div>
                <div className="bg-white/[0.04] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-white">{result.simulation.tokenTransfers}</div>
                  <div className="text-xs text-white/40 mt-1">Token Transfers</div>
                </div>
              </div>
            </div>

            {/* Pattern Detection */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-[#00ff87]">🔍</span> Pattern Detection
              </h3>
              <div className="space-y-3">
                {result.patterns.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${p.status === 'clean' ? 'bg-green-400' : p.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                      <span className="text-sm text-white/80">{p.type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${p.status === 'clean' ? 'bg-green-400' : p.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${p.score}%` }} />
                      </div>
                      <span className="text-xs text-white/40 w-8 text-right">{p.score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendation */}
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-yellow-400 mb-2 flex items-center gap-2">💡 Recommendation</h3>
              <p className="text-white/60 text-sm leading-relaxed">{result.recommendation}</p>
              <div className="flex gap-3 mt-4">
                <button className="px-5 py-2.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-all">
                  🚫 Block Transaction
                </button>
                <button className="px-5 py-2.5 bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl text-sm font-medium hover:bg-green-500/30 transition-all">
                  ✅ Allow Transaction
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
