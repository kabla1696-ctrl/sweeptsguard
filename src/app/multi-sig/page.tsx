'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'

type GuardianStatus = 'pending' | 'active' | 'revoked'
type RecoveryStatus = 'pending' | 'approved' | 'executed' | 'expired' | 'cancelled'
type AuthMethod = 'wallet' | 'google-authenticator' | 'email'

interface Guardian {
  id: string
  address: string
  label: string
  email?: string
  authMethod: AuthMethod
  addedAt: string
  status: GuardianStatus
  lastConfirmedAt?: string
}

interface RecoveryRequest {
  id: string
  newOwnerAddress: string
  createdAt: string
  expiresAt: string
  status: RecoveryStatus
  confirmations: { guardianLabel: string; confirmedAt: string }[]
  requiredConfirmations: number
  totalGuardians: number
}

const AUTH_ICONS: Record<AuthMethod, string> = {
  wallet: '🔑',
  'google-authenticator': '📱',
  email: '📧',
}
const STATUS_STYLES: Record<GuardianStatus, { bg: string; text: string; border: string; icon: string }> = {
  active: { bg: 'bg-[#00ff87]/10', text: 'text-[#00ff87]', border: 'border-[#00ff87]/20', icon: '🟢' },
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', icon: '🟡' },
  revoked: { bg: 'bg-white/5', text: 'text-white/30', border: 'border-white/10', icon: '⚫' },
}
const RECOVERY_STYLES: Record<RecoveryStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  approved: { bg: 'bg-[#00e5ff]/10', text: 'text-[#00e5ff]' },
  executed: { bg: 'bg-[#00ff87]/10', text: 'text-[#00ff87]' },
  expired: { bg: 'bg-white/5', text: 'text-white/30' },
  cancelled: { bg: 'bg-[#ff3b3b]/10', text: 'text-[#ff3b3b]' },
}

export default function MultiSigRecoveryPage() {
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [threshold, setThreshold] = useState(2)
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>([])
  const [showAddGuardian, setShowAddGuardian] = useState(false)
  const [showRecoveryForm, setShowRecoveryForm] = useState(false)
  const [newGuardian, setNewGuardian] = useState({ label: '', address: '', email: '', authMethod: 'wallet' as AuthMethod })
  const [recoveryAddress, setRecoveryAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/multi-sig')
      if (!res.ok) throw new Error('Failed to load data')
      const data = await res.json()
      setGuardians(data.guardians || [])
      setThreshold(data.threshold || 2)
      setRecoveryRequests(data.recoveryRequests || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const activeGuardians = guardians.filter(g => g.status === 'active')

  const handleAddGuardian = useCallback(async () => {
    if (!newGuardian.label || !newGuardian.address) return
    try {
      const res = await fetch('/api/multi-sig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addGuardian', ...newGuardian }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add guardian')
      }
      setShowAddGuardian(false)
      setNewGuardian({ label: '', address: '', email: '', authMethod: 'wallet' })
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add guardian')
    }
  }, [newGuardian, fetchData])

  const handleRevoke = useCallback(async (id: string) => {
    try {
      const res = await fetch('/api/multi-sig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revokeGuardian', id }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to revoke guardian')
      }
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke guardian')
    }
  }, [fetchData])

  const handleSetThreshold = useCallback(async (value: number) => {
    try {
      const res = await fetch('/api/multi-sig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setThreshold', value }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to set threshold')
      }
      setThreshold(value)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set threshold')
    }
  }, [])

  const handleStartRecovery = useCallback(async () => {
    if (!recoveryAddress) return
    try {
      const res = await fetch('/api/multi-sig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'startRecovery', newOwnerAddress: recoveryAddress }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start recovery')
      }
      setShowRecoveryForm(false)
      setRecoveryAddress('')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recovery')
    }
  }, [recoveryAddress, fetchData])

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#00e5ff]/3 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-[#00ff87]/3 rounded-full blur-[150px]" />
      </div>

      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05] relative z-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-[#00ff87] to-[#00e5ff] bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-green-400 transition-colors">Dashboard</Link>
          <Link href="/multi-sig" className="text-sm text-[#00e5ff] font-medium">Multi-Sig Recovery</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 relative z-10">
        {error && (
          <div className="mb-6 p-4 bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 rounded-xl text-sm text-[#ff3b3b]">
            {error}
            <button onClick={() => setError(null)} className="ml-3 text-xs underline">dismiss</button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/20 text-[#00e5ff] text-xs font-medium mb-4">
              🔐 SOCIAL RECOVERY
            </div>
            <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">Multi-Sig Recovery</h1>
            <p className="text-white/40">Designate trusted guardians who can help recover your wallet</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAddGuardian(true)} className="px-5 py-2.5 bg-gradient-to-r from-[#00ff87] to-[#00e5ff] rounded-xl text-sm font-bold text-black hover:shadow-[0_0_30px_rgba(0,255,135,0.2)] transition-all">
              + Add Guardian
            </button>
            <button onClick={() => setShowRecoveryForm(true)} className="px-5 py-2.5 bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 rounded-xl text-sm font-bold text-[#ff3b3b] hover:bg-[#ff3b3b]/20 transition-all">
              🚨 Start Recovery
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-white/30">Loading guardian data...</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Active Guardians', value: activeGuardians.length, icon: '👥', color: '#00ff87' },
                { label: 'Threshold', value: `${threshold} of ${activeGuardians.length}`, icon: '🎯', color: '#00e5ff' },
                { label: 'Lock Period', value: '48h', icon: '⏰', color: '#ffd700' },
                { label: 'Total Guardians', value: guardians.length, icon: '🔐', color: '#a855f7' },
              ].map(s => (
                <div key={s.label} className="p-5 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl hover:border-white/[0.12] transition-all">
                  <span className="text-2xl">{s.icon}</span>
                  <p className="text-2xl font-black mt-2" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-white/30 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Threshold Selector */}
            <div className="p-6 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl mb-8">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2">🎯 Recovery Threshold</h3>
              <div className="flex items-center gap-4">
                <span className="text-white/30 text-sm">Require</span>
                <div className="flex gap-2">
                  {Array.from({ length: Math.max(activeGuardians.length, 1) }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      onClick={() => handleSetThreshold(n)}
                      className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                        threshold === n
                          ? 'bg-gradient-to-r from-[#00ff87] to-[#00e5ff] text-black shadow-[0_0_20px_rgba(0,255,135,0.2)]'
                          : 'bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/70 hover:border-white/[0.12]'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <span className="text-white/30 text-sm">guardians to confirm</span>
              </div>
              <p className="text-white/20 text-xs mt-3">Minimum {threshold} guardian{threshold > 1 ? 's' : ''} must approve within 48 hours to execute recovery</p>
            </div>

            {/* Add Guardian Modal */}
            {showAddGuardian && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAddGuardian(false)}>
                <div className="w-full max-w-md p-6 bg-[#0a0a0f] border border-white/[0.1] rounded-3xl" onClick={e => e.stopPropagation()}>
                  <h2 className="text-xl font-bold mb-6">Add Guardian</h2>
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="text-white/40 text-xs mb-1 block">Name *</label>
                      <input value={newGuardian.label} onChange={e => setNewGuardian(p => ({ ...p, label: e.target.value }))} placeholder="Alex&apos;s Wallet" className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00e5ff]/40" />
                    </div>
                    <div>
                      <label className="text-white/40 text-xs mb-1 block">Address *</label>
                      <input value={newGuardian.address} onChange={e => setNewGuardian(p => ({ ...p, address: e.target.value }))} placeholder="0x..." className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-[#00e5ff]/40" />
                    </div>
                    <div>
                      <label className="text-white/40 text-xs mb-1 block">Email (optional)</label>
                      <input value={newGuardian.email} onChange={e => setNewGuardian(p => ({ ...p, email: e.target.value }))} placeholder="guardian@email.com" className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00e5ff]/40" />
                    </div>
                  </div>
                  <div className="mb-6">
                    <label className="text-white/40 text-xs mb-2 block">Auth Method</label>
                    <div className="flex gap-2">
                      {(['wallet', 'google-authenticator', 'email'] as AuthMethod[]).map(method => (
                        <button
                          key={method}
                          onClick={() => setNewGuardian(p => ({ ...p, authMethod: method }))}
                          className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 capitalize ${
                            newGuardian.authMethod === method
                              ? 'bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff]'
                              : 'bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/60'
                          }`}
                        >
                          <span>{AUTH_ICONS[method]}</span>
                          {method === 'google-authenticator' ? 'Auth App' : method}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowAddGuardian(false)} className="flex-1 px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white/50 hover:text-white transition-all">Cancel</button>
                    <button onClick={handleAddGuardian} disabled={!newGuardian.label || !newGuardian.address} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#00ff87] to-[#00e5ff] rounded-xl text-sm font-bold text-black disabled:opacity-30 transition-all">Add Guardian</button>
                  </div>
                </div>
              </div>
            )}

            {/* Recovery Request Modal */}
            {showRecoveryForm && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowRecoveryForm(false)}>
                <div className="w-full max-w-md p-6 bg-[#0a0a0f] border border-[#ff3b3b]/20 rounded-3xl" onClick={e => e.stopPropagation()}>
                  <h2 className="text-xl font-bold mb-2 flex items-center gap-2">🚨 Initiate Recovery</h2>
                  <p className="text-white/30 text-sm mb-6">This will send a recovery request to all active guardians</p>
                  <div className="mb-4">
                    <label className="text-white/40 text-xs mb-1 block">New Owner Address *</label>
                    <input value={recoveryAddress} onChange={e => setRecoveryAddress(e.target.value)} placeholder="0x..." className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-[#ff3b3b]/40" />
                  </div>
                  <div className="p-4 bg-[#ff3b3b]/5 border border-[#ff3b3b]/10 rounded-xl mb-6">
                    <p className="text-white/40 text-xs">⚠️ Recovery requires <strong className="text-white">{threshold}</strong> guardian confirmations within <strong className="text-white">48 hours</strong>. A 48-hour lock period applies after threshold is met.</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowRecoveryForm(false)} className="flex-1 px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white/50 hover:text-white transition-all">Cancel</button>
                    <button onClick={handleStartRecovery} disabled={!recoveryAddress} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#ff3b3b] to-[#cc0000] rounded-xl text-sm font-bold disabled:opacity-30 transition-all">Send Request</button>
                  </div>
                </div>
              </div>
            )}

            {/* Guardian List */}
            <div className="mb-10">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">👥 Guardians</h2>
              <div className="space-y-3">
                {guardians.map(g => {
                  const style = STATUS_STYLES[g.status]
                  return (
                    <div key={g.id} className={`p-5 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl hover:border-white/[0.12] transition-all duration-300 ${g.status === 'revoked' ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${style.bg} border ${style.border}`}>
                            {AUTH_ICONS[g.authMethod]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold">{g.label}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text} border ${style.border} capitalize`}>{g.status}</span>
                            </div>
                            <p className="text-white/30 text-xs font-mono mt-0.5">{g.address}</p>
                            {g.email && <p className="text-white/20 text-xs mt-0.5">📧 {g.email}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right mr-4">
                            <p className="text-white/20 text-[10px]">Added {new Date(g.addedAt).toLocaleDateString()}</p>
                            {g.lastConfirmedAt && <p className="text-[#00ff87]/40 text-[10px]">Last confirmed {new Date(g.lastConfirmedAt).toLocaleDateString()}</p>}
                          </div>
                          {g.status === 'active' && (
                            <button onClick={() => handleRevoke(g.id)} className="px-3 py-1.5 bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 rounded-lg text-xs text-[#ff3b3b] hover:bg-[#ff3b3b]/20 transition-all">
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recovery History */}
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">📊 Recovery History</h2>
              {recoveryRequests.length === 0 ? (
                <div className="p-8 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-center">
                  <span className="text-4xl block mb-3">📋</span>
                  <p className="text-white/30 text-sm">No recovery requests have been initiated</p>
                  <p className="text-white/20 text-xs mt-1">Recovery history will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recoveryRequests.map(req => {
                    const rs = RECOVERY_STYLES[req.status]
                    return (
                      <div key={req.id} className="p-5 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${rs.bg} ${rs.text} capitalize`}>{req.status}</span>
                            <p className="text-white/50 text-xs mt-1 font-mono">→ {req.newOwnerAddress}</p>
                          </div>
                          <div className="text-right text-xs text-white/30">
                            <p>Confirmations: {req.confirmations.length}/{req.requiredConfirmations}</p>
                            <p>Expires: {new Date(req.expiresAt).toLocaleString()}</p>
                          </div>
                        </div>
                        {req.confirmations.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {req.confirmations.map((c, i) => (
                              <span key={i} className="px-2 py-1 bg-[#00ff87]/10 border border-[#00ff87]/20 rounded text-[10px] text-[#00ff87]">
                                ✓ {c.guardianLabel}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
