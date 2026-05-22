'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  riskHeatmap,
  type HeatmapData,
  type TokenRisk,
  type RiskLevel,
  type RiskReport,
} from '@/lib/riskHeatmap'

const RISK_STYLES: Record<RiskLevel, { bg: string; text: string; border: string; glow: string; label: string; emoji: string }> = {
  safe: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', glow: 'shadow-green-500/10', label: 'Safe', emoji: '✅' },
  warning: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', glow: 'shadow-yellow-500/10', label: 'Warning', emoji: '⚠️' },
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', glow: 'shadow-red-500/10', label: 'Critical', emoji: '🚨' },
}

type TrendPeriod = '7d' | '30d'

export default function RiskHeatmapPage() {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<HeatmapData | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<RiskLevel | 'all'>('all')
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('7d')
  const [revoking, setRevoking] = useState<Set<string>>(new Set())
  const [revoked, setRevoked] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  const scan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      setError('Please enter a valid EVM address')
      return
    }
    setLoading(true)
    setError('')
    setData(null)
    try {
      const result = await riskHeatmap.generateHeatmap(address)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate risk heatmap')
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = useCallback(async (token: TokenRisk, spender: string) => {
    const key = `${token.tokenAddress}-${spender}`
    setRevoking(prev => new Set(prev).add(key))
    try {
      const tx = riskHeatmap.buildRevokeTransaction(token.tokenAddress, spender, token.chainId)
      // In production: send tx via wallet
      console.log('Revoke tx:', tx)
      await new Promise(r => setTimeout(r, 1500))
      setRevoked(prev => new Set(prev).add(key))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revoke failed')
    } finally {
      setRevoking(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }, [])

  const handleExport = useCallback(async () => {
    if (!data) return
    setExporting(true)
    try {
      const report = riskHeatmap.generateReport(data)
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `risk-report-${address.slice(0, 10)}-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }, [data, address])

  const filteredTokens = data?.tokens.filter(t => filter === 'all' || t.riskLevel === filter) ?? []
  const trend = data?.trend[trendPeriod] ?? []
  const maxTrendScore = Math.max(...trend.map(t => t.overallScore), 1)

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
          <Link href="/risk-heatmap" className="text-sm text-emerald-400 font-medium">Risk Heatmap</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🔥 Portfolio Risk Heatmap</h1>
        <p className="text-white/40 mb-8">
          Visual risk breakdown per token with one-click approval revocation and trend tracking
        </p>

        {/* Scan Form */}
        <form onSubmit={scan} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Enter wallet address (0x...)"
              className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/40 text-sm font-mono"
            />
            <select className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white focus:outline-none text-sm">
              <option>All Chains</option>
              <option>Ethereum</option>
              <option>Base</option>
              <option>BNB Chain</option>
              <option>Arbitrum</option>
              <option>Polygon</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl font-semibold text-sm disabled:opacity-50 hover:from-emerald-500 hover:to-green-500 transition-all"
            >
              {loading ? 'Scanning...' : '🔥 Generate Heatmap'}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/40">Scanning portfolio risk across chains...</span>
              <span className="text-emerald-400">Analyzing</span>
            </div>
            <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-600 to-green-600 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        )}

        {/* Results */}
        {data && (
          <div className="space-y-8">
            {/* Overall Score */}
            <div className={`p-6 rounded-2xl border backdrop-blur-xl ${RISK_STYLES[data.overallRiskLevel].bg} ${RISK_STYLES[data.overallRiskLevel].border}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">Overall Risk Score</h2>
                  <p className="text-white/40 text-sm">{data.summary.total} tokens across {new Set(data.tokens.map(t => t.chainId)).size} chains</p>
                </div>
                <div className="text-right">
                  <div className={`text-5xl font-bold ${RISK_STYLES[data.overallRiskLevel].text}`}>{data.overallRiskScore}</div>
                  <div className="text-white/40 text-xs">/ 100</div>
                </div>
              </div>
              <div className="h-3 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    data.overallRiskLevel === 'critical' ? 'bg-red-500' : data.overallRiskLevel === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${data.overallRiskScore}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-white/30">
                <span>Safe</span><span>Warning</span><span>Critical</span>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Total Tokens', value: data.summary.total, color: 'text-white' },
                { label: 'Safe', value: data.summary.safe, color: 'text-green-400' },
                { label: 'Warning', value: data.summary.warning, color: 'text-yellow-400' },
                { label: 'Critical', value: data.summary.critical, color: 'text-red-400' },
                { label: 'Total Value', value: `$${data.summary.totalValueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: 'text-emerald-400' },
              ].map(card => (
                <div key={card.label} className="p-4 bg-white/[0.03] border border-white/[0.05] rounded-xl backdrop-blur-xl">
                  <span className="text-white/30 text-xs">{card.label}</span>
                  <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Risk Trend Chart */}
            <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">📈 Risk Trend</h2>
                <div className="flex gap-2">
                  {(['7d', '30d'] as TrendPeriod[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setTrendPeriod(p)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        trendPeriod === p ? 'bg-emerald-600 text-white' : 'bg-white/[0.05] text-white/40 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              {/* Simple bar chart */}
              <div className="flex items-end gap-1 h-32">
                {trend.map((point, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t transition-all ${
                        point.overallScore >= 60 ? 'bg-red-500/60' : point.overallScore >= 30 ? 'bg-yellow-500/60' : 'bg-green-500/60'
                      }`}
                      style={{ height: `${(point.overallScore / maxTrendScore) * 100}%`, minHeight: '4px' }}
                    />
                    {i % Math.ceil(trend.length / 7) === 0 && (
                      <span className="text-[9px] text-white/20 -rotate-45 origin-top-left">{point.date.slice(5)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Filter & Export */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {(['all', 'safe', 'warning', 'critical'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filter === f ? 'bg-white/10 text-white' : 'bg-white/[0.03] text-white/40 hover:text-white'
                    }`}
                  >
                    {f === 'all' ? '🔍 All' : `${RISK_STYLES[f].emoji} ${RISK_STYLES[f].label}`}
                    {f !== 'all' && ` (${data.summary[f]})`}
                  </button>
                ))}
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                {exporting ? 'Exporting...' : '📄 Export Report'}
              </button>
            </div>

            {/* Heatmap Grid */}
            <div className="grid gap-4">
              {filteredTokens.map(token => {
                const style = RISK_STYLES[token.riskLevel]
                const dangerousApprovals = token.approvals.filter(a => a.isUnlimited || a.riskLevel === 'critical')

                return (
                  <div
                    key={`${token.chainId}-${token.tokenAddress}`}
                    className={`p-5 rounded-2xl border backdrop-blur-xl ${style.bg} ${style.border} hover:${style.glow} transition-all`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                          token.riskLevel === 'critical' ? 'bg-red-500/20' : token.riskLevel === 'warning' ? 'bg-yellow-500/20' : 'bg-green-500/20'
                        }`}>
                          {style.emoji}
                        </div>
                        <div>
                          <h3 className="font-bold">{token.tokenSymbol}</h3>
                          <p className="text-white/40 text-xs">{token.tokenName} • {token.chainName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${style.text}`}>{token.riskScore}</div>
                        <div className="text-white/30 text-[10px]">/ 100</div>
                      </div>
                    </div>

                    {/* Risk bar */}
                    <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all ${
                          token.riskLevel === 'critical' ? 'bg-red-500' : token.riskLevel === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${token.riskScore}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="p-2 bg-white/[0.03] rounded-lg">
                        <span className="text-white/30 text-[10px]">Balance</span>
                        <p className="text-sm font-medium">{token.balanceFormatted} {token.tokenSymbol}</p>
                      </div>
                      <div className="p-2 bg-white/[0.03] rounded-lg">
                        <span className="text-white/30 text-[10px]">Value</span>
                        <p className="text-sm font-medium">${token.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                      </div>
                      <div className="p-2 bg-white/[0.03] rounded-lg">
                        <span className="text-white/30 text-[10px]">Chain</span>
                        <p className="text-sm font-medium">{token.chainName}</p>
                      </div>
                    </div>

                    {/* Risk Factors */}
                    {token.riskFactors.length > 0 && token.riskFactors[0].severity !== 'safe' && (
                      <div className="space-y-1 mb-3">
                        {token.riskFactors.map((factor, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              factor.severity === 'critical' ? 'bg-red-400' : factor.severity === 'warning' ? 'bg-yellow-400' : 'bg-green-400'
                            }`} />
                            <span className="text-white/50">{factor.description}</span>
                            <span className="text-white/20 ml-auto">+{factor.score}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Dangerous Approvals */}
                    {dangerousApprovals.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/[0.05]">
                        <span className="text-white/30 text-[10px] mb-2 block">⚠️ Dangerous Approvals</span>
                        {dangerousApprovals.map((approval, i) => {
                          const revokeKey = `${token.tokenAddress}-${approval.spender}`
                          const isRevoked = revoked.has(revokeKey)
                          const isRevoking = revoking.has(revokeKey)

                          return (
                            <div key={i} className="flex items-center justify-between p-2 bg-red-500/5 rounded-lg mt-1">
                              <div className="flex-1 min-w-0">
                                <span className="text-xs text-red-300 font-mono truncate block">
                                  {approval.spenderLabel || `${approval.spender.slice(0, 10)}...${approval.spender.slice(-6)}`}
                                </span>
                                <span className="text-[10px] text-white/30">
                                  {approval.isUnlimited ? 'Unlimited' : 'Limited'} approval
                                </span>
                              </div>
                              <button
                                onClick={() => handleRevoke(token, approval.spender)}
                                disabled={isRevoking || isRevoked}
                                className={`ml-3 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                  isRevoked
                                    ? 'bg-green-500/20 text-green-400'
                                    : isRevoking
                                      ? 'bg-white/10 text-white/40'
                                      : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                }`}
                              >
                                {isRevoked ? '✓ Revoked' : isRevoking ? 'Revoking...' : 'Revoke'}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {filteredTokens.length === 0 && (
                <div className="text-center py-12 text-white/30">
                  <span className="text-4xl block mb-4">🔍</span>
                  <p>No tokens match the selected filter</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center text-white/20 text-xs">
              Scanned at {new Date(data.scannedAt).toLocaleString()} • Address: {data.address}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
