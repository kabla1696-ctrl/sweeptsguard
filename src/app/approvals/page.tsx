'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  approvalDashboard,
  type ApprovalDashboardResult,
  type TokenApproval,
  type ApprovalRiskLevel,
} from '@/lib/approvalDashboard'

const RISK_STYLES: Record<ApprovalRiskLevel, { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', label: '🚨 Critical' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', label: '🔶 High' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', label: '⚠️ Medium' },
  low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', label: '✅ Low' },
}

export default function ApprovalsPage() {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ApprovalDashboardResult | null>(null)
  const [error, setError] = useState('')
  const [revoking, setRevoking] = useState<Set<string>>(new Set())
  const [revoked, setRevoked] = useState<Set<string>>(new Set())
  const [batchRevoking, setBatchRevoking] = useState(false)
  const [filter, setFilter] = useState<ApprovalRiskLevel | 'all'>('all')

  const fetchApprovals = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      setError('Please enter a valid EVM address')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const data = await approvalDashboard.getApprovals(address)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch approvals')
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = useCallback(async (approval: TokenApproval) => {
    const key = approval.id
    setRevoking(prev => new Set(prev).add(key))

    try {
      const txData = approvalDashboard.buildRevokeTransaction(
        approval.tokenAddress,
        approval.spender,
        approval.chainId
      )

      // In production, this would send the tx via the user's wallet (e.g., wagmi/sendTransaction)
      // For now, we simulate the revoke
      console.log('Revoke tx:', txData)

      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1500))

      setRevoked(prev => new Set(prev).add(key))
    } catch (err) {
      setError(`Failed to revoke ${approval.tokenSymbol} approval: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setRevoking(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }, [])

  const handleBatchRevoke = useCallback(async () => {
    if (!result) return
    const dangerous = filteredApprovals.filter(a => !revoked.has(a.id) && (a.riskLevel === 'critical' || a.riskLevel === 'high'))
    if (dangerous.length === 0) return

    setBatchRevoking(true)
    for (const approval of dangerous) {
      await handleRevoke(approval)
    }
    setBatchRevoking(false)
  }, [result, revoked, handleRevoke])

  const filteredApprovals = result
    ? filter === 'all'
      ? result.approvals
      : result.approvals.filter(a => a.riskLevel === filter)
    : []

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
          <Link href="/approvals" className="text-sm text-green-400 font-medium">Approvals</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🔓 Token Approval Dashboard</h1>
        <p className="text-white/40 mb-8">
          View, analyze, and revoke token approvals across all chains. Unlimited approvals let contracts spend your tokens freely.
        </p>

        {/* Form */}
        <form onSubmit={fetchApprovals} className="flex gap-2 mb-8">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter wallet address (0x...)"
            className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/40 text-sm font-mono"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl font-semibold text-sm disabled:opacity-50 hover:from-orange-500 hover:to-red-500 transition-all"
          >
            {loading ? 'Scanning...' : '🔓 Scan Approvals'}
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
            <div className="inline-flex items-center gap-3 text-orange-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scanning token approvals across chains...
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl text-center">
                <div className="text-2xl font-bold">{result.summary.total}</div>
                <div className="text-white/40 text-xs">Total</div>
              </div>
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-center">
                <div className="text-2xl font-bold text-red-400">{result.summary.unlimited}</div>
                <div className="text-white/40 text-xs">Unlimited</div>
              </div>
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-center">
                <div className="text-2xl font-bold text-red-400">{result.summary.critical}</div>
                <div className="text-white/40 text-xs">Critical</div>
              </div>
              <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl text-center">
                <div className="text-2xl font-bold text-orange-400">{result.summary.high}</div>
                <div className="text-white/40 text-xs">High</div>
              </div>
              <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl text-center">
                <div className="text-2xl font-bold text-yellow-400">{result.summary.medium + result.summary.low}</div>
                <div className="text-white/40 text-xs">Medium/Low</div>
              </div>
            </div>

            {/* Filters + Batch Revoke */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1">
                {(['all', 'critical', 'high', 'medium', 'low'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filter === f
                        ? 'bg-orange-600 text-white'
                        : 'bg-white/[0.05] text-white/50 hover:text-white'
                    }`}
                  >
                    {f === 'all' ? 'All' : RISK_STYLES[f].label}
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              {(result.summary.critical > 0 || result.summary.high > 0) && (
                <button
                  onClick={handleBatchRevoke}
                  disabled={batchRevoking}
                  className="px-4 py-2 bg-red-600/20 border border-red-500/30 rounded-lg text-sm text-red-400 font-medium hover:bg-red-600/30 transition-all disabled:opacity-50"
                >
                  {batchRevoking ? 'Revoking...' : `🚨 Revoke All Dangerous (${result.summary.critical + result.summary.high})`}
                </button>
              )}
            </div>

            {/* Approval List */}
            <div className="space-y-3">
              {filteredApprovals.length === 0 ? (
                <div className="text-center py-12 text-white/30">
                  <p className="text-lg mb-2">No approvals found</p>
                  <p className="text-sm">
                    {filter === 'all' ? 'This wallet has no active token approvals.' : `No ${filter} risk approvals.`}
                  </p>
                </div>
              ) : (
                filteredApprovals.map((approval) => {
                  const style = RISK_STYLES[approval.riskLevel]
                  const isRevoking = revoking.has(approval.id)
                  const isRevoked = revoked.has(approval.id)

                  return (
                    <div
                      key={approval.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isRevoked ? 'bg-green-500/5 border-green-500/20 opacity-60' : `${style.bg} ${style.border}`
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{approval.tokenSymbol}</span>
                            <span className="text-white/30 text-xs">{approval.chainName}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                              {style.label}
                            </span>
                            {approval.isUnlimited && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">
                                ♾️ Unlimited
                              </span>
                            )}
                            {isRevoked && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">
                                ✅ Revoked
                              </span>
                            )}
                          </div>
                          <p className="text-white/40 text-xs mt-1">
                            Spender: {approval.spenderLabel || (
                              <code className="text-white/50">{approval.spender.slice(0, 10)}...{approval.spender.slice(-8)}</code>
                            )}
                          </p>
                          <p className="text-white/30 text-xs mt-0.5">
                            Amount: {approval.amountFormatted} {approval.tokenSymbol}
                          </p>
                          {approval.riskReasons.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {approval.riskReasons.map((reason, i) => (
                                <span key={i} className="text-[10px] text-white/30">• {reason}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!isRevoked && (
                            <button
                              onClick={() => handleRevoke(approval)}
                              disabled={isRevoking}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                                approval.riskLevel === 'critical' || approval.riskLevel === 'high'
                                  ? 'bg-red-600 text-white hover:bg-red-500'
                                  : 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                              }`}
                            >
                              {isRevoking ? 'Revoking...' : 'Revoke'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Info */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-blue-400 text-xs font-semibold mb-1">💡 About Token Approvals</p>
              <p className="text-white/40 text-xs">
                When you approve a token, the spender contract can transfer up to the approved amount at any time.
                <strong className="text-white/60"> Unlimited approvals</strong> are especially dangerous — revoke them if you no longer use the protocol.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
