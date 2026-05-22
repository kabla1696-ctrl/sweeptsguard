'use client'

import { useState } from 'react'
import Link from 'next/link'

const MOCK_SESSIONS = [
  { id: '1', device: 'Chrome — MacOS', ip: '192.168.1.1', location: 'New York, US', lastActive: '2 min ago', current: true, risk: 'low' },
  { id: '2', device: 'Firefox — Windows', ip: '10.0.0.45', location: 'London, UK', lastActive: '1 hour ago', current: false, risk: 'low' },
  { id: '3', device: 'Safari — iOS', ip: '172.16.0.8', location: 'Tokyo, JP', lastActive: '3 hours ago', current: false, risk: 'medium' },
  { id: '4', device: 'Unknown — Linux', ip: '203.0.113.42', location: 'Unknown', lastActive: '1 day ago', current: false, risk: 'high' },
  { id: '5', device: 'Chrome — Android', ip: '198.51.100.7', location: 'Berlin, DE', lastActive: '2 days ago', current: false, risk: 'low' },
]

const RISK_COLORS: Record<string, string> = {
  low: 'text-green-400 bg-green-500/10 border-green-500/20',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  high: 'text-red-400 bg-red-500/10 border-red-500/20',
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState(MOCK_SESSIONS)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const handleDisconnect = async (id: string) => {
    setDisconnecting(id)
    await new Promise(r => setTimeout(r, 1000))
    setSessions(prev => prev.filter(s => s.id !== id))
    setDisconnecting(null)
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
        <div className="mt-8 flex justify-center">
          <button className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-all flex items-center gap-2">
            🔒 Disconnect All Other Sessions
          </button>
        </div>
      </div>
    </main>
  )
}
