'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface WhaleTx {
  id: string
  hash: string
  from: string
  to: string
  valueUsd: number
  chainId: number
  token: string
  timestamp: number
  type: string
}

export default function WhaleAlertsPage() {
  const [alerts, setAlerts] = useState<WhaleTx[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/whale-alerts?action=alerts&limit=50')
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch alerts')
      setAlerts(data.alerts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/whale-alerts?action=stats')
      const data = await res.json()
      if (res.ok) setStats(data)
    } catch { /* ok */ }
  }, [])

  useEffect(() => {
    fetchAlerts()
    fetchStats()
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [fetchAlerts, fetchStats])

  const formatUsd = (v: number) => v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(1)}K` : `$${v.toFixed(2)}`
  const formatAddr = (a: string) => a.length > 14 ? `${a.slice(0, 6)}...${a.slice(-4)}` : a
  const timeAgo = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000)
    if (s < 60) return `${s}s ago`
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    return `${Math.floor(s / 3600)}h ago`
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/3 w-[500px] h-[500px] bg-blue-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-cyan-500/[0.03] rounded-full blur-[100px]" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">Dashboard</Link>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">🐋 Whale Alerts</h1>
            <p className="text-white/40 text-sm mt-1">Real-time monitoring of large on-chain transfers</p>
          </div>
          <button onClick={fetchAlerts} disabled={loading} className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm hover:bg-white/[0.08] transition-all disabled:opacity-50">
            {loading ? '⏳ Scanning...' : '🔄 Refresh'}
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Alerts', value: String((stats as Record<string, unknown>).totalAlerts || 0), icon: '🐋' },
              { label: 'Last 24h', value: String((stats as Record<string, unknown>).last24h || 0), icon: '📊' },
              { label: 'Largest Tx', value: formatUsd(Number((stats as Record<string, unknown>).largestUsd || 0)), icon: '💰' },
              { label: 'Chains Monitored', value: String((stats as Record<string, unknown>).chainsMonitored || 0), icon: '⛓️' },
            ].map(s => (
              <div key={s.label} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <span className="text-lg">{s.icon}</span>
                <p className="text-xl font-bold mt-1">{s.value}</p>
                <p className="text-white/30 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">❌ {error}</div>
        )}

        {loading && alerts.length === 0 && (
          <div className="text-center py-12">
            <svg className="animate-spin h-8 w-8 text-[#00e5ff] mx-auto mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-white/40 text-sm">Scanning for whale transactions...</p>
          </div>
        )}

        <div className="space-y-3">
          {alerts.map(alert => (
            <div key={alert.id} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:border-white/[0.12] transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🐋</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{formatAddr(alert.from)}</span>
                      <span className="text-white/30">→</span>
                      <span className="font-mono text-sm">{formatAddr(alert.to)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-white/40 text-xs">{alert.token}</span>
                      <span className="text-white/20 text-xs">•</span>
                      <span className="text-white/30 text-xs">{timeAgo(alert.timestamp)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#00e5ff]">{formatUsd(alert.valueUsd)}</p>
                  <p className="text-white/30 text-xs">{alert.type}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!loading && alerts.length === 0 && !error && (
          <div className="text-center py-16 text-white/20">
            <div className="text-5xl mb-4">🐋</div>
            <p>No whale alerts detected yet. Monitoring active.</p>
          </div>
        )}
      </div>
    </main>
  )
}
