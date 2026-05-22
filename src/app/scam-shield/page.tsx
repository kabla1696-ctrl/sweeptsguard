'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  analyzeTransaction,
  analyzeBatch,
  DEFAULT_SCAM_SHIELD_CONFIG,
  type TransactionAnalysis,
  type RiskLevel,
  type ScamShieldConfig,
  type AnalysisDetail,
} from '@/lib/scamShield'

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string; glow: string }> = {
  safe: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', glow: 'shadow-green-500/20' },
  suspicious: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', glow: 'shadow-yellow-500/20' },
  dangerous: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', glow: 'shadow-orange-500/20' },
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', glow: 'shadow-red-500/20' },
}

const SEVERITY_ICONS: Record<string, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  danger: '🔶',
  critical: '🚨',
}

const CATEGORY_LABELS: Record<string, string> = {
  routing: 'Routing',
  value: 'Value',
  approval: 'Approval',
  contract: 'Contract',
  pattern: 'Pattern',
  gas: 'Gas',
}

export default function ScamShieldPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [value, setValue] = useState('')
  const [data, setData] = useState('')
  const [chainId, setChainId] = useState(1)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<TransactionAnalysis | null>(null)
  const [error, setError] = useState('')
  const [showSimulation, setShowSimulation] = useState(false)
  const [config, setConfig] = useState<ScamShieldConfig>(DEFAULT_SCAM_SHIELD_CONFIG)
  const [showConfig, setShowConfig] = useState(false)

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!from || !/^0x[0-9a-fA-F]{40}$/.test(from)) {
      setError('Please enter a valid "from" address')
      return
    }
    if (!to || !/^0x[0-9a-fA-F]{40}$/.test(to)) {
      setError('Please enter a valid "to" address')
      return
    }

    setAnalyzing(true)
    setError('')
    setResult(null)

    try {
      const analysis = await analyzeTransaction({
        from,
        to,
        value: value || '0x0',
        data: data || '0x',
        chainId,
      })
      setResult(analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const loadDemo = () => {
    setFrom('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18')
    setTo('0xdead000000000000000000000000000000000000')
    setValue('0x0')
    setData('0x095ea7b3000000000000000000000000dead000000000000000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
    setChainId(1)
  }

  const riskColors = result ? RISK_COLORS[result.riskLevel] : RISK_COLORS.safe

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
          <Link href="/scam-shield" className="text-sm text-green-400 font-medium">Scam Shield</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🛡️</span>
            <div>
              <h1 className="text-3xl font-bold">AI Scam Shield</h1>
              <p className="text-white/40">Real-time transaction guardian — analyze before you sign</p>
            </div>
          </div>
        </div>

        {/* Config Toggle */}
        <div className="mb-6">
          <button onClick={() => setShowConfig(!showConfig)} className="text-sm text-white/40 hover:text-white/70 transition-colors flex items-center gap-2">
            <span>{showConfig ? '▼' : '▶'}</span> ⚙️ Shield Configuration
          </button>
          {showConfig && (
            <div className="mt-3 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries({
                autoBlockCritical: 'Auto-block critical',
                warnOnSuspicious: 'Warn on suspicious',
                simulateTransactions: 'Simulate transactions',
                checkTokenApprovals: 'Check approvals',
              }).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config[key as keyof ScamShieldConfig] as boolean}
                    onChange={e => setConfig({ ...config, [key]: e.target.checked })}
                    className="rounded border-white/20 bg-white/[0.05]"
                  />
                  {label}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Transaction Input Form */}
        <form onSubmit={handleAnalyze} className="mb-8 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/30 mb-1 block">From Address</label>
              <input
                type="text"
                value={from}
                onChange={e => setFrom(e.target.value)}
                placeholder="0x... (sender)"
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-white/30 mb-1 block">To Address</label>
              <input
                type="text"
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="0x... (recipient/contract)"
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-white/30 mb-1 block">Value (hex wei, optional)</label>
              <input
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="0x0"
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-white/30 mb-1 block">Chain</label>
              <select
                value={chainId}
                onChange={e => setChainId(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white focus:outline-none focus:border-green-500/40 text-sm"
              >
                <option value={1}>⟠ Ethereum</option>
                <option value={8453}>🔵 Base</option>
                <option value={56}>🟡 BNB Chain</option>
                <option value={42161}>🔵 Arbitrum</option>
                <option value={137}>🟣 Polygon</option>
                <option value={10}>🔴 Optimism</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={analyzing}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50 hover:from-green-500 hover:to-emerald-500 transition-all"
              >
                {analyzing ? 'Analyzing...' : '🛡️ Analyze TX'}
              </button>
              <button
                type="button"
                onClick={loadDemo}
                className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white/40 hover:text-white/70 transition-all"
              >
                Demo
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-white/30 mb-1 block">Calldata (hex, optional)</label>
            <textarea
              value={data}
              onChange={e => setData(e.target.value)}
              placeholder="0x... (transaction data)"
              rows={2}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono resize-none"
            />
          </div>
        </form>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Verdict Banner */}
            <div className={`p-6 rounded-2xl border-2 ${riskColors.bg} ${riskColors.border} shadow-lg ${riskColors.glow}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    {result.verdict === 'block' ? '🛑 BLOCKED' : result.verdict === 'warn' ? '⚠️ WARNING' : '✅ ALLOWED'}
                  </h2>
                  <p className="text-white/40 text-sm mt-1">Transaction Analysis Result</p>
                </div>
                <div className="text-right">
                  <div className={`text-5xl font-bold ${riskColors.text}`}>{result.riskScore}</div>
                  <div className="text-white/40 text-xs">/ 100</div>
                </div>
              </div>

              {/* Risk Bar */}
              <div className="mb-4">
                <div className="h-3 bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      result.riskLevel === 'critical' ? 'bg-red-500' :
                      result.riskLevel === 'dangerous' ? 'bg-orange-500' :
                      result.riskLevel === 'suspicious' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${result.riskScore}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-white/30">
                  <span>Safe</span>
                  <span>Suspicious</span>
                  <span>Dangerous</span>
                  <span>Critical</span>
                </div>
              </div>

              <p className="text-white/70 text-sm">{result.summary}</p>
            </div>

            {/* Known Scam Match */}
            {result.knownScam && (
              <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-2xl">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">🚨</span>
                  <div className="flex-1">
                    <h3 className="text-red-400 font-bold text-lg">Known Scam: {result.knownScam.name}</h3>
                    <p className="text-white/40 text-sm mt-1">Category: <span className="text-red-300 capitalize">{result.knownScam.category}</span> • Reported {result.knownScam.reportedCount} times</p>
                    <p className="text-white/50 text-sm mt-2">{result.knownScam.description}</p>
                    <p className="text-white/30 text-xs mt-2">First seen: {result.knownScam.firstSeen}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Token Approval Analysis */}
            {result.tokenApproval && (
              <div className="p-5 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                <h3 className="text-orange-400 font-bold mb-3 flex items-center gap-2">🔓 Token Approval Analysis</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white/[0.03] rounded-lg">
                    <span className="text-white/30 text-xs">Spender</span>
                    <p className="text-sm font-mono text-white/70">{result.tokenApproval.spender.slice(0, 10)}...</p>
                  </div>
                  <div className="p-3 bg-white/[0.03] rounded-lg">
                    <span className="text-white/30 text-xs">Amount</span>
                    <p className={`text-sm font-bold ${result.tokenApproval.isUnlimited ? 'text-red-400' : 'text-white/70'}`}>
                      {result.tokenApproval.isUnlimited ? 'UNLIMITED' : result.tokenApproval.estimatedValue}
                    </p>
                  </div>
                </div>
                {result.tokenApproval.riskNotes.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {result.tokenApproval.riskNotes.map((note, i) => (
                      <p key={i} className="text-red-300/80 text-xs flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />{note}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Findings */}
            {result.details.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">🔍 Analysis Findings ({result.details.length})</h3>
                <div className="space-y-3">
                  {result.details.map((detail, i) => {
                    const sevColor = detail.severity === 'critical' ? 'border-red-500/30 bg-red-500/5'
                      : detail.severity === 'danger' ? 'border-orange-500/30 bg-orange-500/5'
                      : detail.severity === 'warning' ? 'border-yellow-500/30 bg-yellow-500/5'
                      : 'border-white/[0.05] bg-white/[0.02]'
                    return (
                      <div key={i} className={`p-4 rounded-xl border ${sevColor}`}>
                        <div className="flex items-start gap-3">
                          <span className="text-lg">{SEVERITY_ICONS[detail.severity]}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm">{detail.title}</h4>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-white/40">
                                {CATEGORY_LABELS[detail.category] || detail.category}
                              </span>
                            </div>
                            <p className="text-white/50 text-xs mt-1">{detail.description}</p>
                            {detail.impact && (
                              <p className="text-orange-300/60 text-xs mt-1">Impact: {detail.impact}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Transaction Simulation */}
            <div>
              <button
                onClick={() => setShowSimulation(!showSimulation)}
                className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors mb-3"
              >
                <span>{showSimulation ? '▼' : '▶'}</span> 🔮 Transaction Simulation
              </button>
              {showSimulation && (
                <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-4">
                  <p className="text-white/60 text-sm">{result.simulation.summary}</p>

                  {result.simulation.balanceChanges.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-white/70 mb-2">Balance Changes</h4>
                      <div className="space-y-2">
                        {result.simulation.balanceChanges.map((change, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">{change.symbol}</span>
                              <span className="text-white/30 text-xs">{change.before} → {change.after}</span>
                            </div>
                            <span className={`text-sm font-bold ${change.changePercent < 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {change.change} ({change.changePercent.toFixed(1)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.simulation.tokenTransfers.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-white/70 mb-2">Token Transfers</h4>
                      <div className="space-y-2">
                        {result.simulation.tokenTransfers.map((transfer, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                            <div className="text-xs">
                              <span className="text-white/40">From:</span> <span className="font-mono text-white/60">{transfer.from.slice(0, 8)}...</span>
                              <span className="text-white/40 ml-2">To:</span> <span className="font-mono text-white/60">{transfer.to.slice(0, 8)}...</span>
                            </div>
                            <span className="text-sm font-bold text-orange-400">{transfer.amount} {transfer.symbol}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-white/30 pt-2 border-t border-white/[0.05]">
                    <span>Gas: {result.simulation.gasEstimate}</span>
                    {result.simulation.priceImpact && <span>Price Impact: {result.simulation.priceImpact}</span>}
                    {result.simulation.valueLoss && <span className="text-red-400">Potential Loss: {result.simulation.valueLoss}</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center text-white/20 text-xs">
              Analyzed at {new Date(result.analyzedAt).toLocaleString()} • ID: {result.id}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
