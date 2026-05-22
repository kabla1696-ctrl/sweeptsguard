'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  getChainActivity,
  getRecentTransactions,
  getHeatmapData,
  getDrainerClusters,
  getDrainerMapStats,
  getStatsByPeriod,
  getStolenByChain,
  searchDrainer,
  formatUsd,
  formatRelativeTime,
  getRiskColor,
  type ChainActivity,
  type DrainerTransaction,
  type DrainerCluster,
  type DrainerMapStats,
  type HeatmapDataPoint,
} from '@/lib/drainerMap'

type View = 'map' | 'feed' | 'clusters' | 'stats'

export default function DrainerMapPage() {
  const [view, setView] = useState<View>('map')
  const [stats, setStats] = useState<DrainerMapStats | null>(null)
  const [chainActivity, setChainActivity] = useState<ChainActivity[]>([])
  const [transactions, setTransactions] = useState<DrainerTransaction[]>([])
  const [clusters, setClusters] = useState<DrainerCluster[]>([])
  const [heatmap, setHeatmap] = useState<HeatmapDataPoint[]>([])
  const [stolenByChain, setStolenByChain] = useState<{ chainId: number; chainName: string; icon: string; totalUsd: number; percentage: number }[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ drainers: any[]; clusters: DrainerCluster[] } | null>(null)
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h')
  const [periodStats, setPeriodStats] = useState<ReturnType<typeof getStatsByPeriod> | null>(null)
  const [selectedChain, setSelectedChain] = useState<number | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const loadData = useCallback(() => {
    setStats(getDrainerMapStats())
    setChainActivity(getChainActivity())
    setTransactions(getRecentTransactions(30))
    setClusters(getDrainerClusters())
    setHeatmap(getHeatmapData())
    setStolenByChain(getStolenByChain())
    setPeriodStats(getStatsByPeriod(period))
  }, [period])

  useEffect(() => {
    loadData()
    if (autoRefresh) {
      intervalRef.current = setInterval(loadData, 30000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [loadData, autoRefresh])

  useEffect(() => {
    setPeriodStats(getStatsByPeriod(period))
  }, [period])

  const handleSearch = () => {
    if (!searchQuery.trim()) { setSearchResults(null); return }
    setSearchResults(searchDrainer(searchQuery))
  }

  const filteredTransactions = selectedChain
    ? transactions.filter(t => t.chainId === selectedChain)
    : transactions

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/scan" className="text-sm text-white/50 hover:text-white transition-colors">Scan</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">🗺️ Live Drainer Map</h1>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="text-xs text-white/40 hover:text-white transition-colors"
            >
              {autoRefresh ? 'Live' : 'Paused'}
            </button>
          </div>
        </div>
        <p className="text-white/40 mb-8">Real-time drainer activity across {stats?.activeChains || 0} chains</p>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-xs text-white/30">Stolen (24h)</p>
              <p className="text-xl font-bold text-red-400">{formatUsd(stats.totalDrainedUsd24h)}</p>
            </div>
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <p className="text-xs text-white/30">Stolen (7d)</p>
              <p className="text-xl font-bold text-orange-400">{formatUsd(stats.totalDrainedUsd7d)}</p>
            </div>
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <p className="text-xs text-white/30">Stolen (30d)</p>
              <p className="text-xl font-bold text-yellow-400">{formatUsd(stats.totalDrainedUsd30d)}</p>
            </div>
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <p className="text-xs text-white/30">Active Drainers</p>
              <p className="text-xl font-bold text-purple-400">{stats.activeDrainers}</p>
            </div>
          </div>
        )}

        {/* Period Selector */}
        <div className="flex items-center gap-2 mb-6">
          {(['24h', '7d', '30d'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p
                  ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                  : 'bg-white/[0.03] border border-white/[0.05] text-white/50 hover:bg-white/[0.06]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-6">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search drainer address or name..."
            className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/40 text-sm font-mono"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-semibold text-sm hover:brightness-110 transition-all"
          >
            🔍
          </button>
        </div>

        {/* Search Results */}
        {searchResults && (
          <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl mb-6">
            <h3 className="text-sm font-semibold mb-3">Search Results</h3>
            {searchResults.drainers.length === 0 && searchResults.clusters.length === 0 && (
              <p className="text-white/30 text-sm">No results found</p>
            )}
            {searchResults.drainers.map((d, i) => (
              <div key={i} className="p-3 bg-red-500/5 rounded-lg mb-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-red-400">{d.name}</span>
                  <span className="text-xs text-white/30">{d.type}</span>
                </div>
                <p className="text-xs text-white/40 font-mono mt-1">{d.address}</p>
                <p className="text-xs text-white/30 mt-1">Reports: {d.reportCount} • Chains: {d.chains.length}</p>
              </div>
            ))}
            {searchResults.clusters.map((c, i) => (
              <div key={i} className="p-3 bg-orange-500/5 rounded-lg mb-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-orange-400">{c.name}</span>
                  <span className="text-xs text-white/30">Risk: {c.riskScore}/100</span>
                </div>
                <p className="text-xs text-white/40 mt-1">Addresses: {c.addresses.length} • Drained: {formatUsd(c.totalDrainedUsd)}</p>
              </div>
            ))}
          </div>
        )}

        {/* View Tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { id: 'map', label: '🗺️ Chain Heatmap' },
            { id: 'feed', label: '📡 Live Feed' },
            { id: 'clusters', label: '🔗 Drainer Clusters' },
            { id: 'stats', label: '📊 Stats' },
          ] as { id: View; label: string }[]).map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                view === v.id
                  ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                  : 'bg-white/[0.03] border border-white/[0.05] text-white/50 hover:bg-white/[0.06]'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* ── Chain Heatmap View ────────────────────────── */}
        {view === 'map' && (
          <div className="space-y-6">
            {/* Heatmap Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {heatmap.map(point => (
                <button
                  key={point.chainId}
                  onClick={() => setSelectedChain(selectedChain === point.chainId ? null : point.chainId)}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    selectedChain === point.chainId
                      ? 'border-red-500/60 bg-red-500/15'
                      : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                  style={{
                    boxShadow: `0 0 ${point.value * 30}px rgba(239, 68, 68, ${point.value * 0.3})`,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{chainActivity.find(a => a.chainId === point.chainId)?.chainIcon || '🔗'}</span>
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getRiskColor(chainActivity.find(a => a.chainId === point.chainId)?.riskLevel || 'low') }}
                    />
                  </div>
                  <p className="text-sm font-semibold">{point.chainName}</p>
                  <p className="text-red-400 font-bold text-sm">{formatUsd(point.totalUsd)}</p>
                  <p className="text-white/30 text-xs">{point.txCount} txs</p>
                  <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                      style={{ width: `${point.value * 100}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>

            {/* Chain Detail */}
            {selectedChain && (
              <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                {(() => {
                  const activity = chainActivity.find(a => a.chainId === selectedChain)
                  if (!activity) return null
                  return (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">{activity.chainIcon}</span>
                        <div>
                          <h3 className="text-lg font-semibold">{activity.chainName}</h3>
                          <p className="text-white/30 text-xs">Region: {activity.region}</p>
                        </div>
                        <span
                          className="ml-auto px-3 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: `${getRiskColor(activity.riskLevel)}20`,
                            color: getRiskColor(activity.riskLevel),
                            border: `1px solid ${getRiskColor(activity.riskLevel)}40`,
                          }}
                        >
                          {activity.riskLevel.toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-red-500/10 rounded-lg">
                          <p className="text-xs text-white/30">Total Drained</p>
                          <p className="font-bold text-red-400">{formatUsd(activity.totalDrainedUsd)}</p>
                        </div>
                        <div className="p-3 bg-orange-500/10 rounded-lg">
                          <p className="text-xs text-white/30">Transactions</p>
                          <p className="font-bold text-orange-400">{activity.transactionCount}</p>
                        </div>
                        <div className="p-3 bg-purple-500/10 rounded-lg">
                          <p className="text-xs text-white/30">Active Drainers</p>
                          <p className="font-bold text-purple-400">{activity.activeDrainers}</p>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                          <p className="text-xs text-white/30">Trend</p>
                          <p className="font-bold text-blue-400">{activity.trend === 'rising' ? '📈 Rising' : activity.trend === 'falling' ? '📉 Falling' : '➡️ Stable'}</p>
                        </div>
                      </div>
                      <p className="text-white/40 text-xs mt-3">Top drainer: {activity.topDrainer}</p>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Stolen by Chain Bar */}
            <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
              <h3 className="text-lg font-semibold mb-4">💰 Stolen by Chain (30d)</h3>
              <div className="space-y-3">
                {stolenByChain.slice(0, 10).map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 text-center">{item.icon}</span>
                    <span className="text-sm w-24 truncate">{item.chainName}</span>
                    <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono w-20 text-right">{formatUsd(item.totalUsd)}</span>
                    <span className="text-xs text-white/30 w-12 text-right">{item.percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Live Feed View ────────────────────────────── */}
        {view === 'feed' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-sm text-white/40">Live drainer transactions ({filteredTransactions.length})</span>
            </div>
            {filteredTransactions.map((tx, i) => (
              <div
                key={i}
                className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{tx.chainIcon}</span>
                    <span className="text-sm font-semibold">{tx.chainName}</span>
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">{tx.method}</span>
                  </div>
                  <span className="text-xs text-white/30">{formatRelativeTime(tx.timestamp)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-white/30">Drainer: </span>
                    <span className="text-red-400 font-mono">{tx.from.slice(0, 14)}...</span>
                  </div>
                  <div>
                    <span className="text-white/30">Victim: </span>
                    <span className="text-white/60 font-mono">{tx.to.slice(0, 14)}...</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-red-400 font-semibold">{formatUsd(tx.valueUsd)}</span>
                  <span className="text-white/30 text-xs">{tx.drainerName}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Clusters View ─────────────────────────────── */}
        {view === 'clusters' && (
          <div className="space-y-4">
            {clusters.map((cluster, i) => (
              <div key={i} className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-red-400">{cluster.name}</h3>
                    <p className="text-white/30 text-xs">Type: {cluster.type} • First seen: {new Date(cluster.firstSeen).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-400">{cluster.riskScore}</p>
                    <p className="text-xs text-white/30">Risk Score</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div className="p-2 bg-red-500/10 rounded-lg text-center">
                    <p className="text-xs text-white/30">Total Drained</p>
                    <p className="font-bold text-red-400">{formatUsd(cluster.totalDrainedUsd)}</p>
                  </div>
                  <div className="p-2 bg-orange-500/10 rounded-lg text-center">
                    <p className="text-xs text-white/30">Transactions</p>
                    <p className="font-bold text-orange-400">{cluster.transactionCount}</p>
                  </div>
                  <div className="p-2 bg-purple-500/10 rounded-lg text-center">
                    <p className="text-xs text-white/30">Addresses</p>
                    <p className="font-bold text-purple-400">{cluster.addresses.length}</p>
                  </div>
                  <div className="p-2 bg-blue-500/10 rounded-lg text-center">
                    <p className="text-xs text-white/30">Chains</p>
                    <p className="font-bold text-blue-400">{cluster.chains.length}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {cluster.chains.map(chainId => {
                    const chain = chainActivity.find(a => a.chainId === chainId)
                    return (
                      <span key={chainId} className="px-2 py-0.5 bg-white/[0.05] rounded-full text-xs text-white/40">
                        {chain?.chainIcon || '🔗'} {chain?.chainName || chainId}
                      </span>
                    )
                  })}
                </div>
                <p className="text-white/30 text-xs">Last active: {formatRelativeTime(cluster.lastActive)}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Stats View ───────────────────────────────── */}
        {view === 'stats' && periodStats && (
          <div className="space-y-6">
            <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
              <h3 className="text-lg font-semibold mb-4">📊 Period Summary ({periodStats.period})</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-red-500/10 rounded-lg text-center">
                  <p className="text-xs text-white/30">Total Stolen</p>
                  <p className="text-xl font-bold text-red-400">{formatUsd(periodStats.totalUsd)}</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-lg text-center">
                  <p className="text-xs text-white/30">Transactions</p>
                  <p className="text-xl font-bold text-orange-400">{periodStats.txCount}</p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-lg text-center">
                  <p className="text-xs text-white/30">Top Chain</p>
                  <p className="text-sm font-bold text-purple-400">{periodStats.topChain.name}</p>
                  <p className="text-xs text-white/40">{formatUsd(periodStats.topChain.usd)}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg text-center">
                  <p className="text-xs text-white/30">Top Drainer</p>
                  <p className="text-sm font-bold text-blue-400">{periodStats.topDrainer.name}</p>
                  <p className="text-xs text-white/40">{formatUsd(periodStats.topDrainer.usd)}</p>
                </div>
              </div>
            </div>

            {/* Method Breakdown */}
            <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
              <h3 className="text-lg font-semibold mb-4">🔧 Drain Methods</h3>
              <div className="space-y-3">
                {[
                  { method: 'EIP-7702 Delegation', pct: 35, color: 'red' },
                  { method: 'Approval Scam', pct: 25, color: 'orange' },
                  { method: 'Permit Signature', pct: 20, color: 'yellow' },
                  { method: 'Seaport Order', pct: 10, color: 'purple' },
                  { method: 'Multicall Drain', pct: 7, color: 'blue' },
                  { method: 'Direct Sweep', pct: 3, color: 'green' },
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm w-40">{m.method}</span>
                    <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-${m.color}-500`}
                        style={{ width: `${m.pct}%`, backgroundColor: `var(--color-${m.color}-500, #ef4444)` }}
                      />
                    </div>
                    <span className="text-sm font-mono w-12 text-right">{m.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chain Risk Distribution */}
            <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
              <h3 className="text-lg font-semibold mb-4">🎯 Risk Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { level: 'Critical', count: chainActivity.filter(a => a.riskLevel === 'critical').length, color: '#ef4444' },
                  { level: 'High', count: chainActivity.filter(a => a.riskLevel === 'high').length, color: '#f97316' },
                  { level: 'Medium', count: chainActivity.filter(a => a.riskLevel === 'medium').length, color: '#eab308' },
                  { level: 'Low', count: chainActivity.filter(a => a.riskLevel === 'low').length, color: '#22c55e' },
                ].map((r, i) => (
                  <div key={i} className="p-3 rounded-xl text-center" style={{ backgroundColor: `${r.color}15`, border: `1px solid ${r.color}30` }}>
                    <p className="text-2xl font-bold" style={{ color: r.color }}>{r.count}</p>
                    <p className="text-xs text-white/40">{r.level}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
