'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'

type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

interface TokenApproval {
  id: string
  chainName: string
  tokenSymbol: string
  tokenName: string
  spender: string
  spenderLabel: string
  amountFormatted: string
  isUnlimited: boolean
  riskLevel: RiskLevel
  riskReasons: string[]
  timestamp: string | null
}

const RISK_STYLES: Record<RiskLevel, { bg: string; text: string; border: string; icon: string }> = {
  low: { bg: 'bg-[#00ff87]/10', text: 'text-[#00ff87]', border: 'border-[#00ff87]/20', icon: '🟢' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', icon: '🟡' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', icon: '🟠' },
  critical: { bg: 'bg-[#ff3b3b]/10', text: 'text-[#ff3b3b]', border: 'border-[#ff3b3b]/20', icon: '🔴' },
}

const MOCK_APPROVALS: TokenApproval[] = [
  { id: '1', chainName: 'Ethereum', tokenSymbol: 'USDT', tokenName: 'Tether USD', spender: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', spenderLabel: 'Uniswap V2 Router', amountFormatted: 'Unlimited', isUnlimited: true, riskLevel: 'medium', riskReasons: ['Unlimited approval', 'Known safe spender'], timestamp: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: '2', chainName: 'Ethereum', tokenSymbol: 'USDC', tokenName: 'USD Coin', spender: '0xcce0a2ebe17c5e532802896fc8afcaab8abd8ba0', spenderLabel: '🚨 Inferno Drainer', amountFormatted: 'Unlimited', isUnlimited: true, riskLevel: 'critical', riskReasons: ['Known drainer contract', 'Unlimited approval', 'Recently deployed'], timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', chainName: 'Base', tokenSymbol: 'ETH', tokenName: 'Ether', spender: '0x1111111254fb6c44bac0bed2854e76f90643097d', spenderLabel: '1inch V4 Router', amountFormatted: '0.5 ETH', isUnlimited: false, riskLevel: 'low', riskReasons: ['Limited amount', 'Known DEX'], timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: '4', chainName: 'Arbitrum', tokenSymbol: 'ARB', tokenName: 'Arbitrum', spender: '0x000000000022d473030f116ddee9f6b43ac78ba3', spenderLabel: 'Permit2 (Uniswap)', amountFormatted: 'Unlimited', isUnlimited: true, riskLevel: 'low', riskReasons: ['Standard Permit2 contract'], timestamp: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: '5', chainName: 'Polygon', tokenSymbol: 'MATIC', tokenName: 'Polygon', spender: '0x56a645ef8cc03631a28be1fc6c803eda7bfbbc5a', spenderLabel: '🚨 Inferno Drainer (Polygon)', amountFormatted: 'Unlimited', isUnlimited: true, riskLevel: 'critical', riskReasons: ['Known drainer', 'Unlimited approval'], timestamp: new Date(Date.now() - 7200000).toISOString() },
]

export default function ApprovalsPage() {
  const [address, setAddress] = useState('')
  const [approvals, setApprovals] = useState<TokenApproval[]>([])
  const [loading, setLoading] = useState(false)
  const [filterRisk, setFilterRisk] = useState<RiskLevel | 'all'>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [revoking, setRevoking] = useState<Set<string>>(new Set())

  const scanApprovals = useCallback(async (addr: string) => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setApprovals(MOCK_APPROVALS)
    setLoading(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (address.trim()) scanApprovals(address.trim())
  }

  const handleRevoke = useCallback(async (id: string) => {
    setRevoking(prev => new Set(prev).add(id))
    await new Promise(r => setTimeout(r, 1500))
    setApprovals(prev => prev.filter(a => a.id !== id))
    setRevoking(prev => { const n = new Set(prev); n.delete(id); return n })
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
  }, [])

  const handleBatchRevoke = useCallback(async () => {
    for (const id of selected) {
      await handleRevoke(id)
    }
  }, [selected, handleRevoke])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const filtered = filterRisk === 'all' ? approvals : approvals.filter(a => a.riskLevel === filterRisk)
  const summary = {
    total: approvals.length,
    critical: approvals.filter(a => a.riskLevel === 'critical').length,
    high: approvals.filter(a => a.riskLevel === 'high').length,
    unlimited: approvals.filter(a => a.isUnlimited).length,
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#ff3b3b]/3 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-[#00e5ff]/3 rounded-full blur-[150px]" />
      </div>

      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05] relative z-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-[#00ff87] to-[#00e5ff] bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-green-400 transition-colors">Dashboard</Link>
          <Link href="/approvals" className="text-sm text-[#00e5ff] font-medium">Approvals</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/20 text-[#00e5ff] text-xs font-medium mb-6">
            🔓 APPROVAL DASHBOARD
          </div>
          <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-[#00e5ff] via-[#00ff87] to-[#00e5ff] bg-clip-text text-transparent">
            🔓 Token Approvals
          </h1>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            View, manage, and revoke token approvals — protect your assets from drainers
          </p>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="mb-10">
          <div className="p-6 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-3xl">
            <div className="flex flex-col md:flex-row gap-3">
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter wallet address (0x...)" className="flex-1 px-5 py-4 bg-black/30 border border-white/[0.06] rounded-2xl text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00e5ff]/40 transition-all" />
              <button type="submit" disabled={!address.trim() || loading} className="px-8 py-4 bg-gradient-to-r from-[#00e5ff] to-[#00ff87] rounded-2xl font-bold text-sm text-black disabled:opacity-30 hover:shadow-[0_0_30px_rgba(0,229,255,0.3)] transition-all">
                {loading ? '⏳ Scanning...' : '🔍 Scan Approvals'}
              </button>
            </div>
          </div>
        </form>

        {loading && (
          <div className="text-center py-12">
            <svg className="animate-spin h-12 w-12 text-[#00e5ff] mx-auto mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-white/40 text-sm">Scanning all chains for approvals...</p>
          </div>
        )}

        {approvals.length > 0 && !loading && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Approvals', value: summary.total, color: '#00e5ff', icon: '📋' },
                { label: 'Unlimited', value: summary.unlimited, color: '#ffd700', icon: '♾️' },
                { label: 'Critical Risk', value: summary.critical, color: '#ff3b3b', icon: '🚨' },
                { label: 'High Risk', value: summary.high, color: '#ff8c00', icon: '⚠️' },
              ].map(s => (
                <div key={s.label} className="p-5 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl hover:border-white/[0.12] transition-all">
                  <span className="text-2xl">{s.icon}</span>
                  <p className="text-2xl font-black mt-2" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-white/30 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filter */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-2">
                {(['all', 'critical', 'high', 'medium', 'low'] as const).map(r => (
                  <button key={r} onClick={() => setFilterRisk(r)} className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${filterRisk === r ? 'bg-white/10 text-white border border-white/20' : 'bg-white/[0.03] text-white/30 border border-white/[0.06] hover:text-white/60'}`}>
                    {r === 'all' ? '🔍 All' : `${RISK_STYLES[r].icon} ${r}`}
                  </button>
                ))}
              </div>
              {selected.size > 0 && (
                <button onClick={handleBatchRevoke} className="px-5 py-2 bg-gradient-to-r from-[#ff3b3b] to-[#cc0000] rounded-xl text-sm font-bold hover:shadow-[0_0_20px_rgba(255,59,59,0.3)] transition-all">
                  🗑️ Revoke Selected ({selected.size})
                </button>
              )}
            </div>

            {/* Batch Actions Bar */}
            {selected.size > 0 && (
              <div className="mb-4 p-4 bg-[#ff3b3b]/5 border border-[#ff3b3b]/20 rounded-2xl flex items-center justify-between">
                <span className="text-sm text-[#ff3b3b] font-medium">{selected.size} approval{selected.size > 1 ? 's' : ''} selected</span>
                <div className="flex gap-2">
                  <button onClick={() => setSelected(new Set())} className="px-4 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-xs text-white/50 hover:text-white transition-all">Clear</button>
                  <button onClick={handleBatchRevoke} className="px-4 py-1.5 bg-[#ff3b3b]/20 border border-[#ff3b3b]/30 rounded-lg text-xs text-[#ff3b3b] font-bold hover:bg-[#ff3b3b]/30 transition-all">🗑️ Revoke All Selected</button>
                </div>
              </div>
            )}

            {/* Approval List */}
            <div className="space-y-3">
              {filtered.map(approval => {
                const style = RISK_STYLES[approval.riskLevel]
                const isRevoking = revoking.has(approval.id)
                const isSelected = selected.has(approval.id)
                return (
                  <div key={approval.id} className={`p-5 bg-white/[0.03] backdrop-blur-xl border rounded-2xl transition-all duration-300 ${isSelected ? 'border-[#00e5ff]/30 bg-[#00e5ff]/[0.02]' : 'border-white/[0.06] hover:border-white/[0.12]'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(approval.id)} className="mt-1 w-4 h-4 accent-[#00e5ff]" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold">{approval.tokenSymbol}</h4>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${style.bg} ${style.text} border ${style.border} capitalize`}>{approval.riskLevel}</span>
                            {approval.isUnlimited && <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">♾️ Unlimited</span>}
                            <span className="px-2 py-0.5 rounded text-[10px] bg-white/[0.05] text-white/30">{approval.chainName}</span>
                          </div>
                          <p className="text-white/40 text-xs">Spender: <span className="text-white/60">{approval.spenderLabel}</span></p>
                          <p className="text-white/20 text-[10px] font-mono mt-0.5">{approval.spender}</p>
                          {approval.riskReasons.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {approval.riskReasons.map((r, i) => (
                                <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-white/[0.03] text-white/30 border border-white/[0.06]">{r}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">{approval.amountFormatted}</p>
                          {approval.timestamp && <p className="text-white/20 text-[10px]">{new Date(approval.timestamp).toLocaleDateString()}</p>}
                        </div>
                        <button
                          onClick={() => handleRevoke(approval.id)}
                          disabled={isRevoking}
                          className="px-4 py-2 bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 rounded-xl text-xs font-bold text-[#ff3b3b] hover:bg-[#ff3b3b]/20 disabled:opacity-50 transition-all"
                        >
                          {isRevoking ? '⏳' : '🗑️ Revoke'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
