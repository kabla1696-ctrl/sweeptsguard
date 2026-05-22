'use client'

import { useState, useEffect } from 'react'
import { CHAINS } from '@/lib/chains'

interface AnalyticsData {
  totalScans: number
  totalRecoveries: number
  successfulRecoveries: number
  failedRecoveries: number
  totalRecoveredUsd: number
  revenueUsd: number
  chainBreakdown: Record<number, number>
  recentActivity: { id: string; timestamp: number; chainId: number; address: string; result: string; recoveryAttempted: boolean; recoverySuccess: boolean; valueRecoveredUsd?: number }[]
  successRate: number
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics')
      const json = await res.json() as { success?: boolean; data?: AnalyticsData }
      if (json.success && json.data) {
        setData(json.data)
      }
    } catch {
      // Fallback: show empty data
      setData({
        totalScans: 0, totalRecoveries: 0, successfulRecoveries: 0, failedRecoveries: 0,
        totalRecoveredUsd: 0, revenueUsd: 0, chainBreakdown: {}, recentActivity: [], successRate: 0,
      })
    } finally {
      setLoading(false)
      setMounted(true)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  if (!mounted || loading || !data) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const stats = [
    { label: 'Total Scans', value: data.totalScans, icon: '🔍', color: 'text-blue-400' },
    { label: 'Recoveries', value: data.totalRecoveries, icon: '💰', color: 'text-green-400' },
    { label: 'Success Rate', value: `${data.successRate}%`, icon: '✅', color: 'text-emerald-400' },
    { label: 'Total Recovered', value: `$${data.totalRecoveredUsd.toLocaleString()}`, icon: '💵', color: 'text-yellow-400' },
    { label: 'Platform Revenue', value: `$${data.revenueUsd.toLocaleString()}`, icon: '🏦', color: 'text-purple-400' },
    { label: 'Failed', value: data.failedRecoveries, icon: '❌', color: 'text-red-400' },
  ]

  // Sort chains by scan count
  const topChains = Object.entries(data.chainBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">📊 Analytics Dashboard</h1>
            <p className="text-[var(--muted)] mt-1">Local analytics — no data leaves your device</p>
          </div>
          <button
            onClick={async () => {
              await fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'clear' }),
              })
              fetchAnalytics()
            }}
            className="px-4 py-2 text-sm bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
          >
            Clear Data
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4"
            >
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-[var(--muted)] mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Chain Breakdown */}
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">⛓️ Most Scanned Chains</h2>
            {topChains.length === 0 ? (
              <p className="text-[var(--muted)] text-sm">No data yet. Start scanning wallets!</p>
            ) : (
              <div className="space-y-3">
                {topChains.map(([chainId, count]) => {
                  const chain = CHAINS[Number(chainId)]
                  const maxCount = topChains[0][1]
                  const width = (count / maxCount) * 100
                  return (
                    <div key={chainId}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>
                          {chain?.icon || '🔗'} {chain?.name || `Chain ${chainId}`}
                        </span>
                        <span className="text-[var(--muted)]">{count} scans</span>
                      </div>
                      <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">🕐 Recent Activity</h2>
            {data.recentActivity.length === 0 ? (
              <p className="text-[var(--muted)] text-sm">No activity yet. Scan a wallet to get started!</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {data.recentActivity.map((event) => {
                  const chain = CHAINS[event.chainId]
                  const time = new Date(event.timestamp).toLocaleString()
                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 p-3 bg-[var(--background)] rounded-lg text-sm"
                    >
                      <span className="text-lg">{chain?.icon || '🔗'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-mono text-xs">{event.address || 'Unknown'}</div>
                        <div className="text-[var(--muted)] text-xs">{time}</div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          event.result === 'clean'
                            ? 'bg-green-500/10 text-green-400'
                            : event.result === 'compromised'
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {event.result}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-[var(--muted)] mt-8">
          🔒 Analytics aggregated server-side. Track events via the /api/analytics endpoint.
        </p>
      </div>
    </div>
  )
}
