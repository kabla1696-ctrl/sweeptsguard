'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface DrainerCluster {
  id: string
  label: string
  addresses: string[]
  chainIds: number[]
  totalStolen: number
  lastActive: number
  risk: 'high' | 'critical'
}

interface HeatmapEntry {
  chain: string
  chainId: number
  drainerCount: number
  stolenAmount: number
  riskLevel: number
}

interface RecentTx {
  hash: string
  from: string
  to: string
  value: string
  chain: string
  timestamp: number
}

export default function DrainerMapPage() {
  const [clusters, setClusters] = useState<DrainerCluster[]>([])
  const [heatmap, setHeatmap] = useState<HeatmapEntry[]>([])
  const [recentTx, setRecentTx] = useState<RecentTx[]>([])
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<unknown[]>([])
  const [activeView, setActiveView] = useState<'clusters' | 'heatmap' | 'transactions'>('clusters')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [statsRes, clustersRes, heatmapRes, txRes] = await Promise.all([
        fetch('/api/drainer-map?action=stats'),
        fetch('/api/drainer-map?action=clusters'),
        fetch('/api/drainer-map?action=heatmap'),
        fetch('/api/drainer-map?action=transactions&limit=20')
      ])

      const statsData = await statsRes.json()
      const clustersData = await clustersRes.json()
      const heatmapData = await heatmapRes.json()
      const txData = await txRes.json()

      if (statsRes.ok) setStats(statsData)
      if (clustersRes.ok) setClusters(Array.isArray(clustersData) ? clustersData : [])
      if (heatmapRes.ok) setHeatmap(Array.isArray(heatmapData) ? heatmapData : [])
      if (txRes.ok) setRecentTx(Array.isArray(txData) ? txData : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/drainer-map?action=search&query=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setSearchResults(Array.isArray(data) ? data : [])
    } catch {
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  const timeAgo = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000)
    if (s < 60) return `${s}s ago`
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    return `${Math.floor(s / 3600)}h ago`
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-red-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-orange-500/[0.03] rounded-full blur-[100px]" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🗺️ Live Drainer Map</h1>
        <p className="text-white/40 mb-8">Track and monitor known drainer clusters across chains</p>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/15 text-center">
              <p className="text-2xl font-bold text-red-400">{String(stats.totalDrainers ?? 0)}</p>
              <p className="text-white/30 text-xs">Known Drainers</p>
            </div>
            <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/15 text-center">
              <p className="text-2xl font-bold text-orange-400">{String(stats.totalClusters ?? 0)}</p>
              <p className="text-white/30 text-xs">Clusters</p>
            </div>
            <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/15 text-center">
              <p className="text-2xl font-bold text-yellow-400">${((stats.totalStolen as number) ?? 0).toLocaleString()}</p>
              <p className="text-white/30 text-xs">Total Stolen</p>
            </div>
            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/15 text-center">
              <p className="text-2xl font-bold text-purple-400">{String(stats.chainsMonitored ?? 0)}</p>
              <p className="text-white/30 text-xs">Chains</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex gap-3 mb-6">
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search drainer address or cluster..." className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 text-sm font-mono" />
          <button onClick={handleSearch} disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-semibold disabled:opacity-50">
            🔍 Search
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="text-sm font-semibold mb-3 text-white/60">Search Results</h3>
            <pre className="text-xs text-white/40 overflow-auto">{JSON.stringify(searchResults, null, 2)}</pre>
          </div>
        )}

        {/* View Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-white/[0.02] border border-white/[0.05] rounded-xl w-fit">
          {[{ key: 'clusters', label: '🎯 Clusters' }, { key: 'heatmap', label: '🌡️ Heatmap' }, { key: 'transactions', label: '💸 Recent TX' }].map(v => (
            <button key={v.key} onClick={() => setActiveView(v.key as typeof activeView)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === v.key ? 'bg-red-600/20 text-red-400' : 'text-white/40 hover:text-white/60'}`}>
              {v.label}
            </button>
          ))}
        </div>

        {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">{error}</div>}

        {loading && <div className="text-center py-8 text-white/40">Loading drainer intelligence...</div>}

        {/* Clusters View */}
        {activeView === 'clusters' && !loading && (
          <div className="space-y-3">
            {clusters.length > 0 ? clusters.map((c, i) => (
              <div key={c.id || i} className={`p-5 rounded-2xl border ${c.risk === 'critical' ? 'bg-red-500/[0.04] border-red-500/20' : 'bg-orange-500/[0.04] border-orange-500/20'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-red-400">🚨</span>
                    <div>
                      <div className="font-semibold">{c.label}</div>
                      <div className="text-xs text-white/40">{c.addresses.length} addresses · Chains: {c.chainIds.join(', ')}</div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.risk === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                    {c.risk.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                  <div><div className="text-white/40">Total Stolen</div><div className="text-red-400 font-bold">${c.totalStolen.toLocaleString()}</div></div>
                  <div><div className="text-white/40">Last Active</div><div>{timeAgo(c.lastActive)}</div></div>
                </div>
              </div>
            )) : <div className="text-center py-16 text-white/20"><div className="text-5xl mb-4">🎯</div><p>No drainer clusters detected</p></div>}
          </div>
        )}

        {/* Heatmap View */}
        {activeView === 'heatmap' && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {heatmap.length > 0 ? heatmap.map((h, i) => (
              <div key={h.chainId || i} className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{h.chain}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">Risk: {h.riskLevel}/100</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><div className="text-white/40">Drainers</div><div className="text-red-400 font-bold">{h.drainerCount}</div></div>
                  <div><div className="text-white/40">Stolen</div><div className="text-orange-400 font-bold">${h.stolenAmount.toLocaleString()}</div></div>
                </div>
                <div className="mt-3 w-full h-2 bg-white/[0.05] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full" style={{ width: `${h.riskLevel}%` }} />
                </div>
              </div>
            )) : <div className="text-center py-16 text-white/20 col-span-2"><div className="text-5xl mb-4">🌡️</div><p>No heatmap data available</p></div>}
          </div>
        )}

        {/* Transactions View */}
        {activeView === 'transactions' && !loading && (
          <div className="space-y-2">
            {recentTx.length > 0 ? recentTx.map((tx, i) => (
              <div key={tx.hash || i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-mono text-white/60">{tx.from?.slice(0, 10)}...→ {tx.to?.slice(0, 10)}...</div>
                    <div className="text-xs text-white/30">{tx.chain} · {timeAgo(tx.timestamp)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-red-400 font-bold">{tx.value}</div>
                  </div>
                </div>
              </div>
            )) : <div className="text-center py-16 text-white/20"><div className="text-5xl mb-4">💸</div><p>No recent drainer transactions</p></div>}
          </div>
        )}
      </div>
    </main>
  )
}
