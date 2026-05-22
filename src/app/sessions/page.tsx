'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  sessionManager,
  type ManagedSession,
  type SessionManagerResult,
  type SessionStatus,
  type SessionHistoryEntry,
} from '@/lib/sessionManager'

const STATUS_STYLES: Record<SessionStatus, { bg: string; text: string; border: string; label: string; emoji: string }> = {
  active: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', label: 'Active', emoji: '🟢' },
  idle: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', label: 'Idle', emoji: '🟡' },
  suspicious: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', label: 'Suspicious', emoji: '🚨' },
  expired: { bg: 'bg-white/5', text: 'text-white/40', border: 'border-white/10', label: 'Expired', emoji: '⚫' },
}

const REPUTATION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  trusted: { bg: 'bg-green-500/10', text: 'text-green-400', label: '✅ Trusted' },
  neutral: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: '🔵 Neutral' },
  suspicious: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: '⚠️ Suspicious' },
  malicious: { bg: 'bg-red-500/10', text: 'text-red-400', label: '🚨 Malicious' },
}

export default function SessionsPage() {
  const [data, setData] = useState<SessionManagerResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [disconnecting, setDisconnecting] = useState<Set<string>>(new Set())
  const [disconnected, setDisconnected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<SessionStatus | 'all'>('all')
  const [showHistory, setShowHistory] = useState(false)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    try {
      const result = await sessionManager.getSessions()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSessions() }, [loadSessions])

  const handleDisconnect = useCallback(async (sessionId: string) => {
    setDisconnecting(prev => new Set(prev).add(sessionId))
    try {
      const result = await sessionManager.disconnectSession(sessionId)
      if (result.success) {
        setDisconnected(prev => new Set(prev).add(sessionId))
        await loadSessions()
      } else {
        setError(result.error || 'Disconnect failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed')
    } finally {
      setDisconnecting(prev => {
        const next = new Set(prev)
        next.delete(sessionId)
        return next
      })
    }
  }, [loadSessions])

  const handleDisconnectSuspicious = useCallback(async () => {
    try {
      const result = await sessionManager.disconnectSuspicious()
      if (result.disconnected > 0) {
        await loadSessions()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk disconnect failed')
    }
  }, [loadSessions])

  const handleAutoDisconnect = useCallback(async () => {
    try {
      const result = await sessionManager.autoDisconnectIdle()
      if (result.disconnected > 0) {
        await loadSessions()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-disconnect failed')
    }
  }, [loadSessions])

  const filteredSessions = data?.sessions.filter(s => filter === 'all' || s.status === filter) ?? []

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
          <Link href="/sessions" className="text-sm text-blue-400 font-medium">Sessions</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🔗 WalletConnect Session Manager</h1>
        <p className="text-white/40 mb-8">
          Monitor, manage, and disconnect dApp sessions. Auto-disconnect idle connections.
        </p>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
            {error}
            <button onClick={() => setError('')} className="ml-3 text-red-300 hover:text-red-200">Dismiss</button>
          </div>
        )}

        {loading && !data && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-blue-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading sessions...
            </div>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Sessions', value: data.stats.total, color: 'text-white' },
                { label: 'Active', value: data.stats.active, color: 'text-green-400' },
                { label: 'Idle', value: data.stats.idle, color: 'text-yellow-400' },
                { label: 'Suspicious', value: data.stats.suspicious, color: 'text-red-400' },
              ].map(card => (
                <div key={card.label} className="p-4 bg-white/[0.03] border border-white/[0.05] rounded-xl backdrop-blur-xl">
                  <span className="text-white/30 text-xs">{card.label}</span>
                  <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDisconnectSuspicious}
                className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 hover:bg-red-500/20 transition-all"
              >
                🚨 Disconnect All Suspicious
              </button>
              <button
                onClick={handleAutoDisconnect}
                className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-sm text-yellow-400 hover:bg-yellow-500/20 transition-all"
              >
                ⏱️ Auto-Disconnect Idle (24h+)
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white/60 hover:text-white transition-all"
              >
                📜 {showHistory ? 'Hide' : 'Show'} History
              </button>
              <button
                onClick={loadSessions}
                className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white/60 hover:text-white transition-all"
              >
                🔄 Refresh
              </button>
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              {(['all', 'active', 'idle', 'suspicious', 'expired'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter === f ? 'bg-white/10 text-white' : 'bg-white/[0.03] text-white/40 hover:text-white'
                  }`}
                >
                  {f === 'all' ? '🔍 All' : `${STATUS_STYLES[f].emoji} ${STATUS_STYLES[f].label}`}
                </button>
              ))}
            </div>

            {/* Session Cards */}
            <div className="grid gap-4">
              {filteredSessions.map(session => {
                const statusStyle = STATUS_STYLES[session.status]
                const repStyle = REPUTATION_STYLES[session.reputation.level] || REPUTATION_STYLES.neutral
                const isDisconnecting = disconnecting.has(session.id)
                const isDisconnected = disconnected.has(session.id)

                return (
                  <div
                    key={session.id}
                    className={`p-5 rounded-2xl border backdrop-blur-xl ${statusStyle.bg} ${statusStyle.border} transition-all`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{session.dAppIcon}</div>
                        <div>
                          <h3 className="font-bold text-lg">{session.dAppName}</h3>
                          <p className="text-white/40 text-xs">{session.dAppUrl} • {session.dAppDescription}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDisconnect(session.id)}
                        disabled={isDisconnecting || isDisconnected}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          isDisconnected
                            ? 'bg-green-500/20 text-green-400'
                            : isDisconnecting
                              ? 'bg-white/10 text-white/40'
                              : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20'
                        }`}
                      >
                        {isDisconnected ? '✓ Disconnected' : isDisconnecting ? 'Disconnecting...' : '🔌 Disconnect'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div className="p-2 bg-white/[0.03] rounded-lg">
                        <span className="text-white/30 text-[10px]">Status</span>
                        <p className={`text-sm font-medium ${statusStyle.text}`}>{statusStyle.emoji} {statusStyle.label}</p>
                      </div>
                      <div className="p-2 bg-white/[0.03] rounded-lg">
                        <span className="text-white/30 text-[10px]">Reputation</span>
                        <p className={`text-sm font-medium ${repStyle.text}`}>{repStyle.label} ({session.reputation.score})</p>
                      </div>
                      <div className="p-2 bg-white/[0.03] rounded-lg">
                        <span className="text-white/30 text-[10px]">Connected</span>
                        <p className="text-sm font-medium text-white/80">{new Date(session.connectedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="p-2 bg-white/[0.03] rounded-lg">
                        <span className="text-white/30 text-[10px]">Last Activity</span>
                        <p className="text-sm font-medium text-white/80">
                          {session.idleMinutes < 60 ? `${session.idleMinutes}m ago` : `${Math.floor(session.idleMinutes / 60)}h ago`}
                        </p>
                      </div>
                    </div>

                    {/* Reputation Factors */}
                    {session.reputation.factors.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {session.reputation.factors.map((factor, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white/[0.05] rounded text-[10px] text-white/40">
                            {factor}
                          </span>
                        ))}
                        {session.reputation.verified && (
                          <span className="px-2 py-0.5 bg-green-500/10 rounded text-[10px] text-green-400">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                    )}

                    {/* Permissions */}
                    <div className="mt-3 pt-3 border-t border-white/[0.05]">
                      <span className="text-white/30 text-[10px] mb-2 block">Permissions Granted</span>
                      <div className="flex flex-wrap gap-2">
                        {session.permissions.map((perm, i) => (
                          <span
                            key={i}
                            className={`px-2 py-1 rounded-lg text-[10px] border ${
                              perm.risk === 'high'
                                ? 'bg-red-500/10 border-red-500/20 text-red-300'
                                : perm.risk === 'medium'
                                  ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
                                  : 'bg-white/[0.03] border-white/[0.05] text-white/40'
                            }`}
                            title={perm.description}
                          >
                            {perm.method}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Connected Accounts */}
                    <div className="mt-3 pt-3 border-t border-white/[0.05]">
                      <span className="text-white/30 text-[10px] mb-1 block">Connected Accounts</span>
                      <div className="flex flex-wrap gap-2">
                        {session.connectedAccounts.map((acc, i) => (
                          <code key={i} className="text-xs text-blue-300 font-mono bg-blue-500/5 px-2 py-0.5 rounded">
                            {acc.slice(0, 8)}...{acc.slice(-6)}
                          </code>
                        ))}
                        <span className="text-[10px] text-white/20 ml-2">
                          Chains: {session.chainIds.join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {filteredSessions.length === 0 && (
                <div className="text-center py-12 text-white/30">
                  <span className="text-4xl block mb-4">🔗</span>
                  <p>No sessions match the selected filter</p>
                </div>
              )}
            </div>

            {/* History */}
            {showHistory && data.history.length > 0 && (
              <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-xl">
                <h2 className="text-lg font-semibold mb-4">📜 Session History</h2>
                <div className="space-y-2">
                  {data.history.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {entry.action === 'connected' ? '🟢' : entry.action === 'disconnected' ? '🔴' : entry.action === 'auto-disconnected' ? '⏱️' : '🚫'}
                        </span>
                        <div>
                          <span className="text-sm font-medium">{entry.dAppName}</span>
                          <p className="text-white/30 text-xs">{entry.reason}</p>
                        </div>
                      </div>
                      <span className="text-white/20 text-xs">{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
