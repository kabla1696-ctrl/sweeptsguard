'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'

type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
type AnalysisPhase = 'idle' | 'scanning' | 'complete'

interface ThreatResult {
  address: string
  chain: string
  riskLevel: RiskLevel
  confidence: number
  threats: { category: string; severity: RiskLevel; description: string; icon: string }[]
  riskFactors: { factor: string; impact: number; severity: RiskLevel }[]
  analyzedAt: string
}

const RISK_STYLES: Record<RiskLevel, { bg: string; text: string; border: string; glow: string; label: string }> = {
  low: { bg: 'bg-[#00ff87]/10', text: 'text-[#00ff87]', border: 'border-[#00ff87]/20', glow: 'shadow-[0_0_20px_rgba(0,255,135,0.1)]', label: 'Low Risk' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', glow: 'shadow-[0_0_20px_rgba(234,179,8,0.1)]', label: 'Medium Risk' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', glow: 'shadow-[0_0_20px_rgba(249,115,22,0.1)]', label: 'High Risk' },
  critical: { bg: 'bg-[#ff3b3b]/10', text: 'text-[#ff3b3b]', border: 'border-[#ff3b3b]/20', glow: 'shadow-[0_0_20px_rgba(255,59,59,0.15)]', label: 'Critical' },
}

const CHAINS = [
  { id: 1, name: 'Ethereum', icon: '⟠' },
  { id: 8453, name: 'Base', icon: '🔵' },
  { id: 42161, name: 'Arbitrum', icon: '🔷' },
  { id: 137, name: 'Polygon', icon: '🟣' },
  { id: 56, name: 'BSC', icon: '🟡' },
]

export default function AIThreatPage() {
  const [address, setAddress] = useState('')
  const [chain, setChain] = useState(1)
  const [phase, setPhase] = useState<AnalysisPhase>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ThreatResult | null>(null)
  const [history, setHistory] = useState<ThreatResult[]>([])

  const simulateAnalysis = useCallback(async (addr: string) => {
    setPhase('scanning')
    setProgress(0)
    setResult(null)

    for (let i = 0; i <= 100; i += 2) {
      await new Promise(r => setTimeout(r, 40))
      setProgress(i)
    }

    const riskLevel: RiskLevel = Math.random() > 0.7 ? 'critical' : Math.random() > 0.5 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low'
    const mockResult: ThreatResult = {
      address: addr,
      chain: CHAINS.find(c => c.id === chain)?.name || 'Ethereum',
      riskLevel,
      confidence: Math.round(70 + Math.random() * 28),
      threats: [
        { category: 'Drainer Contract', severity: 'critical' as RiskLevel, description: 'Known malicious bytecode pattern detected', icon: '🕷️' },
        { category: 'Unlimited Approvals', severity: 'high' as RiskLevel, description: 'Contract requests unlimited token spending', icon: '🔓' },
        { category: 'Honeypot Pattern', severity: 'medium' as RiskLevel, description: 'Token may prevent selling after purchase', icon: '🍯' },
        { category: 'Proxy Contract', severity: 'low' as RiskLevel, description: 'Upgradeable proxy — logic can change', icon: '🔄' },
      ].filter(() => Math.random() > 0.3),
      riskFactors: [
        { factor: 'Contract verified on Etherscan', impact: -15, severity: 'low' as RiskLevel },
        { factor: 'Deployed within last 24 hours', impact: 25, severity: 'high' as RiskLevel },
        { factor: 'High gas usage pattern', impact: 10, severity: 'medium' as RiskLevel },
        { factor: 'Known drainer signature match', impact: 40, severity: 'critical' as RiskLevel },
        { factor: 'Multiple chain deployments', impact: -5, severity: 'low' as RiskLevel },
      ].filter(() => Math.random() > 0.3),
      analyzedAt: new Date().toISOString(),
    }

    setResult(mockResult)
    setHistory(prev => [mockResult, ...prev].slice(0, 10))
    setPhase('complete')
  }, [chain])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (address.trim()) simulateAnalysis(address.trim())
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-[#a855f7]/3 rounded-full blur-[180px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#00e5ff]/3 rounded-full blur-[150px]" />
      </div>

      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05] relative z-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-[#00ff87] to-[#00e5ff] bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-green-400 transition-colors">Dashboard</Link>
          <Link href="/ai-threat" className="text-sm text-[#a855f7] font-medium">AI Threat</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#a855f7]/10 border border-[#a855f7]/20 text-[#a855f7] text-xs font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-[#a855f7] animate-pulse" />
            AI-POWERED ANALYSIS
          </div>
          <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-[#a855f7] via-[#c084fc] to-[#00e5ff] bg-clip-text text-transparent">
            🧠 AI Threat Intelligence
          </h1>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            Deep contract analysis powered by AI — detect drainers, honeypots, and malicious patterns
          </p>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="mb-10">
          <div className="p-6 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-3xl hover:border-[#a855f7]/20 transition-all duration-300">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Enter contract or wallet address (0x...)"
                  className="w-full px-5 py-4 bg-black/30 border border-white/[0.06] rounded-2xl text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-[#a855f7]/40 focus:shadow-[0_0_20px_rgba(168,85,247,0.1)] transition-all"
                />
              </div>
              <select
                value={chain}
                onChange={e => setChain(Number(e.target.value))}
                className="px-4 py-4 bg-black/30 border border-white/[0.06] rounded-2xl text-white text-sm focus:outline-none focus:border-[#a855f7]/40 appearance-none cursor-pointer"
              >
                {CHAINS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <button
                type="submit"
                disabled={!address.trim() || phase === 'scanning'}
                className="px-8 py-4 bg-gradient-to-r from-[#a855f7] to-[#c084fc] rounded-2xl font-bold text-sm disabled:opacity-30 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all"
              >
                {phase === 'scanning' ? '⏳ Analyzing...' : '🧠 Analyze'}
              </button>
            </div>
          </div>
        </form>

        {/* Scanning Progress */}
        {phase === 'scanning' && (
          <div className="mb-10">
            <div className="p-6 bg-white/[0.03] backdrop-blur-xl border border-[#a855f7]/20 rounded-3xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-[#a855f7]">🔍 Deep Contract Analysis</span>
                <span className="text-sm font-bold text-[#a855f7]">{progress}%</span>
              </div>
              <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#a855f7] to-[#c084fc] rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <svg className="animate-spin h-5 w-5 text-[#a855f7]" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-white/40 text-xs">
                  {progress < 30 ? 'Fetching contract bytecode...' : progress < 60 ? 'Analyzing function signatures...' : progress < 90 ? 'Cross-referencing threat database...' : 'Generating report...'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && phase === 'complete' && (
          <div className="space-y-6 mb-10">
            {/* Risk Overview */}
            <div className={`p-8 bg-white/[0.03] backdrop-blur-xl border rounded-3xl ${RISK_STYLES[result.riskLevel].border} ${RISK_STYLES[result.riskLevel].glow}`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black">{result.address.slice(0, 10)}...{result.address.slice(-6)}</h2>
                  <p className="text-white/30 text-sm">{result.chain} • Analyzed just now</p>
                </div>
                <div className={`px-6 py-3 rounded-2xl ${RISK_STYLES[result.riskLevel].bg} border ${RISK_STYLES[result.riskLevel].border}`}>
                  <span className={`text-2xl font-black ${RISK_STYLES[result.riskLevel].text}`}>{RISK_STYLES[result.riskLevel].label}</span>
                </div>
              </div>

              {/* Confidence Meter */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/40 text-xs">AI Confidence</span>
                  <span className="text-sm font-bold text-[#a855f7]">{result.confidence}%</span>
                </div>
                <div className="h-3 bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-[#a855f7] to-[#c084fc]"
                    style={{ width: `${result.confidence}%` }}
                  />
                </div>
              </div>

              {/* Threat Breakdown */}
              {result.threats.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold mb-3">🎯 Detected Threats</h3>
                  <div className="grid gap-3">
                    {result.threats.map((t, i) => (
                      <div key={i} className={`p-4 rounded-2xl border ${RISK_STYLES[t.severity].bg} ${RISK_STYLES[t.severity].border}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{t.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm">{t.category}</h4>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${RISK_STYLES[t.severity].bg} ${RISK_STYLES[t.severity].text} capitalize`}>{t.severity}</span>
                            </div>
                            <p className="text-white/40 text-xs mt-0.5">{t.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Risk Factors */}
            {result.riskFactors.length > 0 && (
              <div className="p-6 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-3xl">
                <h3 className="text-sm font-bold mb-4">📊 Risk Factors</h3>
                <div className="space-y-2">
                  {result.riskFactors.map((rf, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl">
                      <span className="text-sm text-white/70">{rf.factor}</span>
                      <span className={`text-sm font-bold ${rf.impact > 0 ? 'text-[#ff3b3b]' : 'text-[#00ff87]'}`}>
                        {rf.impact > 0 ? '+' : ''}{rf.impact}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4">📜 Analysis History</h2>
            <div className="space-y-3">
              {history.map((h, i) => {
                const style = RISK_STYLES[h.riskLevel]
                return (
                  <div key={i} className={`p-4 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl hover:border-white/[0.12] transition-all`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text} border ${style.border} capitalize`}>{h.riskLevel}</span>
                        <div>
                          <p className="font-mono text-sm">{h.address.slice(0, 10)}...{h.address.slice(-6)}</p>
                          <p className="text-white/20 text-xs">{h.chain} • {new Date(h.analyzedAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <span className="text-white/30 text-xs">{h.confidence}% conf.</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
