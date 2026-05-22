'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'

type RiskLevel = 'low' | 'medium' | 'high'

interface Session {
  id: string
  device: string
  ip: string
  location: string
  lastActive: string
  current: boolean
  risk: RiskLevel
  createdAt: string
}

const RISK_COLORS: Record<string, string> = {
  low: 'text-green-400 bg-green-500/10 border-green-500/20',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  high: 'text-red-400 bg-red-500/10 border-red-500/20',
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [disconnectingAll, setDisconnectingAll] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions')
      if (!res.ok) throw new Error('Failed to load sessions')
      const data = await res.json()
      setSessions(data.sessions || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const handleDisconnect = async (id: string) => {
    setDisconnecting(id)
    setError(null)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect', id }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to disconnect')
      }
      await fetchSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect')
    } finally {
      setDisconnecting(null)
    }
  }

  const handleDisconnectAll = async () => {
    setDisconnectingAll(true)
    setError(null)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnectAll' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to disconnect sessions')
      }
      await fetchSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect sessions')
    } finally {
      setDisconnectingAll(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#00e5ff]/5 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/5 rounded-full blur-[128px] animate-pulse delay-1000" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-[#00ff87] to-[#00e5ff] bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-6">
          <Link href="/dashboard" className="text-sm text-white/40 hover:text-white/80 transition-colors">Dashboard</Link>
          <Link href="/sessions" className="text-sm text-[#00e5ff] font-semibold">Sessions</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/20 text-[#00e5ff] text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
            Session Management
          </div>
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-[#00e5ff] via-blue-400 to-purple-400 bg-clip-text text-transparent">Session</span>{' '}
            <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Manager</span>
          </h1>
          <p className="text-white/40 text-lg max-w-xl mx-auto">Monitor and control active sessions. Disconnect suspicious access instantly.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 rounded-xl text-sm text-[#ff3b3b]">
            {error}
            <button onClick={() => setError(null)} className="ml-3 text-xs underline">dismiss</button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-white/30">Loading sessions...</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 text-center">
                <div className="text-3xl font-bold text-[#00e5ff]">{sessions.length}</div>
                <div className="text-xs text-white/40 mt-1">Active Sessions</div>
              </div>
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 text-center">
                <div className="text-3xl font-bold text-green-400">{sessions.filter(s => s.risk === 'low').length}</div>
                <div className="text-xs text-white/40 mt-1">Trusted</div>
              </div>
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 text-center">
                <div className="text-3xl font-bold text-red-400">{sessions.filter(s => s.risk === 'high').length}</div>
                <div className="text-xs text-white/40 mt-1">Suspicious</div>
              </div>
            </div>

            {/* Sessions List */}
            <div className="space-y-4">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={`bg-white/[0.03] backdrop-blur-xl border rounded-2xl p-5 transition-all duration-300 hover:border-white/[0.12] ${
                    s.current ? 'border-[#00e5ff]/30 shadow-[0_0_20px_rgba(0,229,255,0.05)]' : 'border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                        s.current ? 'bg-[#00e5ff]/10' : 'bg-white/[0.04]'
                      }`}>
                        {s.device.includes('Chrome') ? '🌐' : s.device.includes('Firefox') ? '🦊' : s.device.includes('Safari') ? '🧭' : '💻'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white/90">{s.device}</span>
                          {s.current && (
                            <span className="px-2 py-0.5 bg-[#00e5ff]/10 border border-[#00e5ff]/20 text-[#00e5ff] rounded text-[10px] font-medium">
                              CURRENT
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                          <span>{s.ip}</span>
                          <span>•</span>
                          <span>{s.location}</span>
                          <span>•</span>
                          <span>{s.lastActive}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-lg text-xs border ${RISK_COLORS[s.risk]}`}>
                        {s.risk}
                      </span>
                      {!s.current && (
                        <button
                          onClick={() => handleDisconnect(s.id)}
                          disabled={disconnecting === s.id}
                          className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-all disabled:opacity-50"
                        >
                          {disconnecting === s.id ? 'Disconnecting...' : 'Disconnect'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Disconnect All */}
            {sessions.filter(s => !s.current).length > 0 && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleDisconnectAll}
                  disabled={disconnectingAll}
                  className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  🔒 {disconnectingAll ? 'Disconnecting...' : 'Disconnect All Other Sessions'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
