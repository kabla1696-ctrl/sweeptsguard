'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  aiThreatEngine,
  type ThreatAnalysis,
  type RiskLevel,
} from '@/lib/aiThreat'

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string; bar: string }> = {
  low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', bar: 'bg-green-500' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', bar: 'bg-yellow-500' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', bar: 'bg-orange-500' },
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', bar: 'bg-red-500' },
}

const SEVERITY_ICONS: Record<string, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  danger: '🔶',
  critical: '🚨',
}

export default function AIThreatPage() {
  const [address, setAddress] = useState('')
  const [chainId, setChainId] = useState(1)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<ThreatAnalysis | null>(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)

  const analyzeContract = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      setError('Please enter a valid EVM address')
      return
    }

    setAnalyzing(true)
    setError('')
    setResult(null)
    setProgress(0)

    // Simulate progress while analysis runs
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + Math.random() * 15, 90))
    }, 500)

    try {
      const analysis = await aiThreatEngine.analyze(address, chainId)
      setProgress(100)
      setResult(analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      clearInterval(progressInterval)
      setAnalyzing(false)
    }
  }

  const riskColors = result ? RISK_COLORS[result.riskLevel] : RISK_COLORS.low

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
          <Link href="/ai-threat" className="text-sm text-green-400 font-medium">AI Threat</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🧠 AI Threat Intelligence</h1>
        <p className="text-white/40 mb-8">
          AI-powered contract analysis with drainer detection, risk scoring, and behavioral pattern matching
        </p>

        {/* Analysis Form */}
        <form onSubmit={analyzeContract} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter contract or wallet address (0x...)"
              className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/40 text-sm font-mono"
            />
            <select
              value={chainId}
              onChange={(e) => setChainId(Number(e.target.value))}
              className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white focus:outline-none focus:border-purple-500/40 text-sm"
            >
              <option value={1}>⟠ Ethereum</option>
              <option value={8453}>🔵 Base</option>
              <option value={56}>🟡 BNB Chain</option>
              <option value={42161}>🔵 Arbitrum</option>
              <option value={137}>🟣 Polygon</option>
              <option value={10}>🔴 Optimism</option>
            </select>
            <button
              type="submit"
              disabled={analyzing}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-semibold text-sm disabled:opacity-50 hover:from-purple-500 hover:to-indigo-500 transition-all"
            >
              {analyzing ? 'Analyzing...' : '🧠 Analyze'}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Progress Bar */}
        {analyzing && (
          <div className="mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/40">Analyzing bytecode & patterns...</span>
              <span className="text-purple-400">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/30">
              <span className={progress > 10 ? 'text-purple-400' : ''}>✓ Fetching bytecode</span>
              <span className={progress > 30 ? 'text-purple-400' : ''}>✓ Drainer pattern matching</span>
              <span className={progress > 50 ? 'text-purple-400' : ''}>✓ Method signature analysis</span>
              <span className={progress > 70 ? 'text-purple-400' : ''}>✓ Behavioral analysis</span>
              <span className={progress > 90 ? 'text-purple-400' : ''}>✓ Risk scoring</span>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Risk Score Card */}
            <div className={`p-6 rounded-2xl border ${riskColors.bg} ${riskColors.border}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">Risk Assessment</h2>
                  <p className="text-white/40 text-sm">
                    {result.isContract ? 'Smart Contract' : 'Externally Owned Account'} • Chain {result.chainId}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${riskColors.text}`}>{result.riskScore}</div>
                  <div className="text-white/40 text-xs">/ 100</div>
                </div>
              </div>

              {/* Visual Score Bar */}
              <div className="mb-4">
                <div className="h-4 bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${riskColors.bar}`}
                    style={{ width: `${result.riskScore}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-white/30">
                  <span>Low Risk</span>
                  <span>Medium</span>
                  <span>High</span>
                  <span>Critical</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/[0.03] rounded-lg">
                  <span className="text-white/30 text-xs">Risk Level</span>
                  <p className={`font-bold text-lg ${riskColors.text} uppercase`}>{result.riskLevel}</p>
                </div>
                <div className="p-3 bg-white/[0.03] rounded-lg">
                  <span className="text-white/30 text-xs">Confidence</span>
                  <p className="font-bold text-lg text-white">{result.confidence}%</p>
                </div>
              </div>
            </div>

            {/* Drainer Match */}
            {result.drainerMatch && (
              <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-2xl">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">🚨</span>
                  <div className="flex-1">
                    <h3 className="text-red-400 font-bold text-lg">{result.drainerMatch.name}</h3>
                    <p className="text-white/40 text-sm mt-1">
                      Family: <span className="text-red-300 capitalize">{result.drainerMatch.family}</span> •
                      Confidence: <span className="text-red-300">{result.drainerMatch.confidence}%</span>
                    </p>
                    <div className="mt-3 space-y-1">
                      {result.drainerMatch.matchedPatterns.map((pattern, i) => (
                        <div key={i} className="text-xs text-red-300/80 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          {pattern}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Findings */}
            {result.findings.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">🔍 Analysis Findings ({result.findings.length})</h2>
                <div className="space-y-3">
                  {result.findings.map((finding) => {
                    const sevColor = finding.severity === 'critical' ? 'border-red-500/30 bg-red-500/5'
                      : finding.severity === 'danger' ? 'border-orange-500/30 bg-orange-500/5'
                      : finding.severity === 'warning' ? 'border-yellow-500/30 bg-yellow-500/5'
                      : 'border-white/[0.05] bg-white/[0.02]'
                    return (
                      <div key={finding.id} className={`p-4 rounded-xl border ${sevColor}`}>
                        <div className="flex items-start gap-3">
                          <span className="text-lg">{SEVERITY_ICONS[finding.severity] || 'ℹ️'}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm">{finding.title}</h4>
                              <span className="text-white/30 text-xs">{finding.confidence}% conf.</span>
                            </div>
                            <p className="text-white/50 text-xs mt-1">{finding.description}</p>
                            <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] bg-white/[0.05] text-white/40 capitalize">
                              {finding.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Method Signatures */}
            {result.methodSignatures.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">📋 Detected Method Signatures ({result.methodSignatures.length})</h2>
                <div className="grid gap-2">
                  {result.methodSignatures.map((sig, i) => {
                    const sigRisk = RISK_COLORS[sig.risk]
                    return (
                      <div key={i} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                        <div className="flex items-center gap-3">
                          <code className="text-xs text-purple-400 font-mono">{sig.selector}</code>
                          <span className="text-sm font-medium">{sig.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-white/40 capitalize">{sig.category}</span>
                        </div>
                        <span className={`text-xs font-semibold uppercase ${sigRisk.text}`}>{sig.risk}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                <h3 className="text-blue-400 font-bold mb-3">🛡️ Recommendations</h3>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="text-white/60 text-sm flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">→</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-white/20 text-xs">
              Analyzed at {new Date(result.analyzedAt).toLocaleString()} • Address: {result.address}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
