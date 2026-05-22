'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { isValidAddress } from '@/lib/validation'
import {
  auditContract,
  downloadReport,
  generateReportText,
  getAuditHistory,
  CHAIN_NAMES,
  type AuditReport,
  type AuditHistoryEntry,
} from '@/lib/contractAudit'

const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400' },
  high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-400' },
  medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400' },
  low: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', badge: 'bg-green-500/20 text-green-400' },
  informational: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-400' },
}

const RISK_COLORS = {
  safe: 'text-green-400',
  low: 'text-green-400',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
}

export default function AuditBotPage() {
  const [address, setAddress] = useState('')
  const [chainId, setChainId] = useState(1)
  const [report, setReport] = useState<AuditReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<AuditHistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [copiedReport, setCopiedReport] = useState(false)
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setHistory(getAuditHistory())
    return () => { abortRef.current?.abort() }
  }, [])

  const handleAudit = useCallback(async (addr: string) => {
    const trimmed = addr.trim()
    if (!trimmed) { setError('Please enter a contract address.'); return }
    if (!isValidAddress(trimmed)) { setError('Invalid address. Must be 0x + 40 hex characters.'); return }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError('')
    setReport(null)
    try {
      const result = await auditContract(trimmed, chainId)
      if (!controller.signal.aborted) {
        setReport(result)
        setHistory(getAuditHistory())
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('Audit failed. Please try again.')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [chainId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleAudit(address)
  }

  const handleCopyReport = async () => {
    if (!report) return
    await navigator.clipboard.writeText(generateReportText(report))
    setCopiedReport(true)
    setTimeout(() => setCopiedReport(false), 2000)
  }

  const ScoreRing = ({ score }: { score: number }) => {
    const circumference = 2 * Math.PI * 54
    const strokeDashoffset = circumference - (score / 100) * circumference
    const color = score >= 85 ? '#22c55e' : score >= 70 ? '#84cc16' : score >= 50 ? '#eab308' : score >= 30 ? '#f97316' : '#ef4444'

    return (
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <circle cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>{score}</span>
          <span className="text-white/30 text-xs">/100</span>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/scan" className="text-sm text-white/50 hover:text-white transition-colors">Scan</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">Dashboard</Link>
          <Link href="/security-quests" className="text-sm text-white/50 hover:text-white transition-colors">Quests</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🤖</span>
            <div>
              <h1 className="text-3xl font-bold">Smart Contract Audit Bot</h1>
              <p className="text-white/40">Instant vulnerability detection, gas optimization, and audit scoring</p>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-3 mb-3">
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Enter contract address (0x...)"
              className="flex-1 px-4 py-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
            />
            <select
              value={chainId}
              onChange={e => setChainId(Number(e.target.value))}
              className="px-4 py-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white/70 focus:outline-none focus:border-green-500/40 text-sm appearance-none cursor-pointer"
            >
              {Object.entries(CHAIN_NAMES).map(([id, name]) => (
                <option key={id} value={id} className="bg-[#0a0a0f]">{name}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50 hover:from-green-500 hover:to-emerald-500 transition-all whitespace-nowrap"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                  Analyzing...
                </span>
              ) : '🔍 Audit Contract'}
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', '0xdAC17F958D2ee523a2206206994597C13D831ec7', '0x514910771AF9Ca656af840dff83E8264EcF986CA'].map((addr) => (
              <button key={addr} type="button" onClick={() => { setAddress(addr); handleAudit(addr) }}
                className="text-xs px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-full text-white/30 hover:text-white/60 hover:border-white/[0.12] transition-all font-mono">
                {addr.slice(0, 6)}...{addr.slice(-4)}
              </button>
            ))}
          </div>
        </form>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6 flex items-center gap-2">
            <span>❌</span> {error}
          </div>
        )}

        {/* Report */}
        {report && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Score Card */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <ScoreRing score={report.auditScore} />
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl font-bold mb-1">
                    Audit Score: <span className={RISK_COLORS[report.riskLevel]}>{report.auditScore}/100</span>
                  </h2>
                  <p className="text-white/40 text-sm mb-3">
                    Risk Level: <span className={`font-semibold uppercase ${RISK_COLORS[report.riskLevel]}`}>{report.riskLevel}</span>
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    {Object.entries(report.summary).map(([sev, count]) => count > 0 && (
                      <span key={sev} className={`px-3 py-1 rounded-full text-xs font-medium ${SEVERITY_COLORS[sev as keyof typeof SEVERITY_COLORS].badge}`}>
                        {count} {sev}
                      </span>
                    ))}
                  </div>
                  {report.contractName && <p className="text-white/20 text-xs mt-3 font-mono">{report.contractName} • {report.compiler}</p>}
                  {report.isProxy && (
                    <div className="mt-3 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-xs">
                      ⚠️ Proxy contract detected — Implementation: <span className="font-mono">{report.proxyImplementation?.slice(0, 10)}...</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => downloadReport(report)} className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-sm font-semibold hover:from-green-500 hover:to-emerald-500 transition-all">
                    📥 Download Report
                  </button>
                  <button onClick={handleCopyReport} className="px-5 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white/60 hover:text-white transition-all">
                    {copiedReport ? '✅ Copied!' : '📋 Copy Report'}
                  </button>
                </div>
              </div>
            </div>

            {/* Findings */}
            {report.findings.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">🔎 Vulnerability Findings <span className="text-white/30 text-sm font-normal">({report.findings.length})</span></h3>
                <div className="space-y-3">
                  {report.findings.map((finding) => (
                    <div key={finding.id}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${SEVERITY_COLORS[finding.severity].bg} ${SEVERITY_COLORS[finding.severity].border} hover:border-opacity-60`}
                      onClick={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${SEVERITY_COLORS[finding.severity].badge} whitespace-nowrap mt-0.5`}>
                            {finding.severity}
                          </span>
                          <div>
                            <h4 className="font-semibold text-sm">{finding.title}</h4>
                            <p className="text-white/40 text-xs mt-0.5">{finding.category}{finding.cweId ? ` • ${finding.cweId}` : ''}{finding.line ? ` • Line ~${finding.line}` : ''}</p>
                          </div>
                        </div>
                        <span className="text-white/20 text-lg">{expandedFinding === finding.id ? '−' : '+'}</span>
                      </div>
                      {expandedFinding === finding.id && (
                        <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-2">
                          <p className="text-white/60 text-sm">{finding.description}</p>
                          <div className="px-3 py-2 bg-green-500/5 border border-green-500/10 rounded-lg">
                            <p className="text-green-400/80 text-xs"><span className="font-semibold">Recommendation:</span> {finding.recommendation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pass Checks */}
            {report.passChecks.length > 0 && (
              <div className="p-5 rounded-xl bg-green-500/5 border border-green-500/10">
                <h3 className="text-sm font-semibold text-green-400 mb-3">✅ Passed Checks ({report.passChecks.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {report.passChecks.map((check, i) => (
                    <p key={i} className="text-green-400/60 text-xs flex items-center gap-2">
                      <span className="text-green-500">✓</span> {check}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Gas Optimizations */}
            {report.gasOptimizations.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">⛽ Gas Optimizations <span className="text-white/30 text-sm font-normal">({report.gasOptimizations.length})</span></h3>
                <div className="space-y-2">
                  {report.gasOptimizations.map((opt, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm">{opt.title}</h4>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${opt.priority === 'high' ? 'bg-orange-500/20 text-orange-400' : opt.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {opt.priority}
                          </span>
                          <span className="text-green-400 text-xs font-mono">{opt.estimatedSavings}</span>
                        </div>
                      </div>
                      <p className="text-white/40 text-xs">{opt.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="mt-12">
            <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors mb-4">
              <span>{showHistory ? '▼' : '▶'}</span> Audit History ({history.length})
            </button>
            {showHistory && (
              <div className="space-y-2">
                {history.map((entry, i) => (
                  <button key={i} onClick={() => { setAddress(entry.contractAddress); handleAudit(entry.contractAddress) }}
                    className="w-full p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all flex items-center justify-between text-left">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${RISK_COLORS[entry.riskLevel as keyof typeof RISK_COLORS]}`}>{entry.auditScore}</span>
                      <div>
                        <p className="text-sm font-mono text-white/70">{entry.contractAddress.slice(0, 8)}...{entry.contractAddress.slice(-6)}</p>
                        <p className="text-white/30 text-xs">{CHAIN_NAMES[entry.chainId] || `Chain ${entry.chainId}`} • {entry.findingsCount} findings</p>
                      </div>
                    </div>
                    <span className="text-white/20 text-xs">{new Date(entry.timestamp).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
