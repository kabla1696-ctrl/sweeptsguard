'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'

type MemberRole = 'admin' | 'member' | 'viewer'
type WalletStatus = 'safe' | 'warning' | 'compromised' | 'unknown'

interface FamilyMember {
  id: string
  address: string
  label: string
  role: MemberRole
  avatarEmoji: string
  chains: number[]
  walletStatus: WalletStatus
  lastActivity: string
  securityScore: number
  addedAt: string
}

interface FamilyAlert {
  id: string
  memberId: string
  memberLabel: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  chainName: string
  timestamp: string
  read: boolean
}

const AVATAR_EMOJIS = ['👤', '👩', '👨', '🧑', '👴', '👵', '🧒', '🦊', '🐱', '🐶', '🐼', '🦁', '🐸', '🦉']
const ROLE_COLORS: Record<MemberRole, { bg: string; text: string; border: string }> = {
  admin: { bg: 'bg-[#00ff87]/10', text: 'text-[#00ff87]', border: 'border-[#00ff87]/20' },
  member: { bg: 'bg-[#00e5ff]/10', text: 'text-[#00e5ff]', border: 'border-[#00e5ff]/20' },
  viewer: { bg: 'bg-white/5', text: 'text-white/50', border: 'border-white/10' },
}
const STATUS_STYLES: Record<WalletStatus, { icon: string; color: string; bg: string }> = {
  safe: { icon: '🟢', color: 'text-[#00ff87]', bg: 'bg-[#00ff87]/10' },
  warning: { icon: '🟡', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  compromised: { icon: '🔴', color: 'text-[#ff3b3b]', bg: 'bg-[#ff3b3b]/10' },
  unknown: { icon: '⚪', color: 'text-white/40', bg: 'bg-white/5' },
}
const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-[#ff3b3b]/10', text: 'text-[#ff3b3b]', border: 'border-[#ff3b3b]/20' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  low: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
}

export default function FamilyProtectionPage() {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [alerts, setAlerts] = useState<FamilyAlert[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterRole, setFilterRole] = useState<MemberRole | 'all'>('all')
  const [newMember, setNewMember] = useState({ label: '', address: '', role: 'member' as MemberRole, avatar: '👤' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFamily = useCallback(async () => {
    try {
      const res = await fetch('/api/family')
      if (!res.ok) throw new Error('Failed to load family data')
      const data = await res.json()
      setMembers(data.members || [])
      setAlerts(data.alerts || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFamily() }, [fetchFamily])

  const familyScore = members.length > 0 ? Math.round(members.reduce((s, m) => s + m.securityScore, 0) / members.length) : 0
  const unreadAlerts = alerts.filter(a => !a.read).length
  const compromisedCount = members.filter(m => m.walletStatus === 'compromised').length

  const handleAddMember = useCallback(async () => {
    if (!newMember.label || !newMember.address) return
    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', address: newMember.address, label: newMember.label, role: newMember.role, avatarEmoji: newMember.avatar }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add member')
      }
      setShowAddModal(false)
      setNewMember({ label: '', address: '', role: 'member', avatar: '👤' })
      await fetchFamily()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member')
    }
  }, [newMember, fetchFamily])

  const handleRemoveMember = useCallback(async (id: string) => {
    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', id }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove member')
      }
      await fetchFamily()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }, [fetchFamily])

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markRead', id }),
      })
      if (!res.ok) throw new Error('Failed to mark alert')
      await fetchFamily()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark alert')
    }
  }, [fetchFamily])

  const filteredMembers = filterRole === 'all' ? members : members.filter(m => m.role === filterRole)

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-[#00ff87]/3 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#00e5ff]/3 rounded-full blur-[150px]" />
      </div>

      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05] relative z-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-[#00ff87] to-[#00e5ff] bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-green-400 transition-colors">Dashboard</Link>
          <Link href="/family" className="text-sm text-[#00ff87] font-medium">Family Protection</Link>
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00ff87]/10 border border-[#00ff87]/20 text-[#00ff87] text-xs font-medium mb-4">
              👨‍👩‍👧‍👦 FAMILY SHIELD
            </div>
            <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">Family Protection</h1>
            <p className="text-white/40">Protect your entire family&apos;s wallets under one security umbrella</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-[#00ff87] to-[#00e5ff] rounded-xl text-sm font-bold text-black hover:shadow-[0_0_30px_rgba(0,255,135,0.2)] transition-all"
          >
            + Add Member
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-white/30">Loading family data...</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Family Score', value: familyScore, suffix: '/100', color: familyScore > 80 ? '#00ff87' : familyScore > 50 ? '#ffd700' : '#ff3b3b', icon: '🛡️' },
                { label: 'Members', value: members.length, suffix: '', color: '#00e5ff', icon: '👥' },
                { label: 'Active Alerts', value: unreadAlerts, suffix: '', color: unreadAlerts > 0 ? '#ffd700' : '#00ff87', icon: '🔔' },
                { label: 'Compromised', value: compromisedCount, suffix: '', color: compromisedCount > 0 ? '#ff3b3b' : '#00ff87', icon: '🚨' },
              ].map(stat => (
                <div key={stat.label} className="p-5 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl hover:border-white/[0.12] transition-all duration-300 group">
                  <span className="text-2xl">{stat.icon}</span>
                  <p className="text-3xl font-black mt-2" style={{ color: stat.color }}>
                    {stat.value}{stat.suffix}
                  </p>
                  <p className="text-white/30 text-xs mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Add Member Modal */}
            {showAddModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
                <div className="w-full max-w-md p-6 bg-[#0a0a0f] border border-white/[0.1] rounded-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
                  <h2 className="text-xl font-bold mb-6">Add Family Member</h2>

                  <div className="mb-4">
                    <label className="text-white/40 text-xs mb-2 block">Avatar</label>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => setNewMember(prev => ({ ...prev, avatar: emoji }))}
                          className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                            newMember.avatar === emoji ? 'bg-[#00ff87]/20 border border-[#00ff87]/40 scale-110' : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="text-white/40 text-xs mb-1 block">Name *</label>
                      <input
                        value={newMember.label}
                        onChange={e => setNewMember(prev => ({ ...prev, label: e.target.value }))}
                        placeholder="Mom&apos;s Wallet"
                        className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00ff87]/40"
                      />
                    </div>
                    <div>
                      <label className="text-white/40 text-xs mb-1 block">Address *</label>
                      <input
                        value={newMember.address}
                        onChange={e => setNewMember(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="0x..."
                        className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-[#00ff87]/40"
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="text-white/40 text-xs mb-2 block">Role</label>
                    <div className="flex gap-2">
                      {(['admin', 'member', 'viewer'] as const).map(role => (
                        <button
                          key={role}
                          onClick={() => setNewMember(prev => ({ ...prev, role }))}
                          className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all capitalize ${
                            newMember.role === role
                              ? `${ROLE_COLORS[role].bg} ${ROLE_COLORS[role].text} border ${ROLE_COLORS[role].border}`
                              : 'bg-white/[0.03] text-white/30 border border-white/[0.06] hover:border-white/[0.12]'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white/50 hover:text-white transition-all">
                      Cancel
                    </button>
                    <button
                      onClick={handleAddMember}
                      disabled={!newMember.label || !newMember.address}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#00ff87] to-[#00e5ff] rounded-xl text-sm font-bold text-black disabled:opacity-30 transition-all"
                    >
                      Add Member
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Role Filter */}
            <div className="flex gap-2 mb-6">
              {(['all', 'admin', 'member', 'viewer'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${
                    filterRole === role ? 'bg-white/10 text-white border border-white/20' : 'bg-white/[0.03] text-white/30 border border-white/[0.06] hover:text-white/60'
                  }`}
                >
                  {role === 'all' ? '🔍 All' : role}
                </button>
              ))}
            </div>

            {/* Member Cards */}
            <div className="grid gap-4 mb-10">
              {filteredMembers.map(member => {
                const statusStyle = STATUS_STYLES[member.walletStatus]
                const roleStyle = ROLE_COLORS[member.role]
                return (
                  <div key={member.id} className="p-5 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl hover:border-white/[0.12] hover:shadow-[0_0_30px_rgba(0,255,135,0.03)] transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] flex items-center justify-center text-3xl border border-white/[0.06]">
                          {member.avatarEmoji}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{member.label}</h3>
                          <p className="text-white/30 text-xs font-mono">{member.address.slice(0, 10)}...{member.address.slice(-6)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-medium ${roleStyle.bg} ${roleStyle.text} border ${roleStyle.border} capitalize`}>
                          {member.role}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-medium ${statusStyle.bg} ${statusStyle.color}`}>
                          {statusStyle.icon} {member.walletStatus}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div className="p-3 bg-white/[0.02] rounded-xl">
                        <span className="text-white/20 text-[10px]">Security Score</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{
                              width: `${member.securityScore}%`,
                              background: member.securityScore > 80 ? '#00ff87' : member.securityScore > 50 ? '#ffd700' : '#ff3b3b',
                            }} />
                          </div>
                          <span className="text-sm font-bold" style={{ color: member.securityScore > 80 ? '#00ff87' : member.securityScore > 50 ? '#ffd700' : '#ff3b3b' }}>
                            {member.securityScore}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 bg-white/[0.02] rounded-xl">
                        <span className="text-white/20 text-[10px]">Chains</span>
                        <p className="text-sm font-medium mt-1">{member.chains.length} active</p>
                      </div>
                      <div className="p-3 bg-white/[0.02] rounded-xl">
                        <span className="text-white/20 text-[10px]">Last Activity</span>
                        <p className="text-xs text-white/50 mt-1">{new Date(member.lastActivity).toLocaleDateString()}</p>
                      </div>
                      <div className="p-3 bg-white/[0.02] rounded-xl">
                        <span className="text-white/20 text-[10px]">Added</span>
                        <p className="text-xs text-white/50 mt-1">{new Date(member.addedAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-white/[0.04]">
                      <button className="px-3 py-1.5 bg-[#00e5ff]/10 border border-[#00e5ff]/20 rounded-lg text-xs text-[#00e5ff] hover:bg-[#00e5ff]/20 transition-all">
                        🔍 Scan
                      </button>
                      <button className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-xs text-white/40 hover:text-white/70 transition-all">
                        ✏️ Edit
                      </button>
                      {member.role !== 'admin' && (
                        <button onClick={() => handleRemoveMember(member.id)} className="px-3 py-1.5 bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 rounded-lg text-xs text-[#ff3b3b] hover:bg-[#ff3b3b]/20 transition-all">
                          🗑️ Remove
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Alerts */}
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                🔔 Family Alerts
                {unreadAlerts > 0 && <span className="px-2 py-0.5 rounded-full bg-[#ff3b3b]/20 text-[#ff3b3b] text-xs">{unreadAlerts}</span>}
              </h2>
              {alerts.length === 0 ? (
                <div className="p-8 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-center">
                  <span className="text-4xl block mb-3">🔔</span>
                  <p className="text-white/30 text-sm">No alerts — your family is safe!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map(alert => {
                    const sev = SEVERITY_COLORS[alert.severity]
                    return (
                      <div key={alert.id} className={`p-4 rounded-2xl border backdrop-blur-xl transition-all ${alert.read ? 'bg-white/[0.02] border-white/[0.06]' : `${sev.bg} ${sev.border}`}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{alert.severity === 'critical' ? '🚨' : alert.severity === 'high' ? '⚠️' : 'ℹ️'}</span>
                            <div>
                              <p className="text-sm font-medium">{alert.memberLabel}</p>
                              <p className="text-white/40 text-xs mt-0.5">{alert.message}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${sev.bg} ${sev.text} capitalize`}>{alert.severity}</span>
                            <p className="text-white/20 text-[10px] mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                        {!alert.read && (
                          <button onClick={() => handleMarkRead(alert.id)} className="mt-2 text-[10px] text-white/30 hover:text-white/60 transition-colors">
                            Mark as read
                          </button>
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
