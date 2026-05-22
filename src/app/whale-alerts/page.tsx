'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { isValidAddress } from '@/lib/validation'
import {
  whaleAlerts,
  type WhaleAlert,
  type WhaleTransaction,
  type WhaleWallet,
  type WhaleAlertConfig,
  DEFAULT_WHALE_CONFIG,
} from '@/lib/whaleAlert'

type Tab = 'alerts' | 'transactions' | 'watchlist' | 'settings'

export default function WhaleAlertsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('alerts')
  const [alerts, setAlerts] = useState<WhaleAlert[]>([])
  const [transactions, setTransactions] = useState<WhaleTransaction[]>([])
  const [watchlist, setWatchlist] = useState<WhaleWallet[]>([])
  const [config, setConfig] = useState<WhaleAlertConfig>(DEFAULT_WHALE_CONFIG)
  const [stats, setStats] = useState({ totalWhales: 0, totalAlerts: 0, unreadAlerts: 0, recentTxCount: 0 })
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Add wallet form
  const [newAddr, setNewAddr] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newCategory, setNewCategory] = useState<WhaleWallet['category']>('individual')
  const [newEstValue, setNewEstValue] = useState('')

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refreshData = useCallback(() => {
    setAlerts(whaleAlerts.getAlerts(100))
    setTransactions(whaleAlerts.getRecentTransactions(100))
    setWatchlist(whaleAlerts.getWatchlist())
    setConfig(whaleAlerts.getConfig())
    setStats(whaleAlerts.getStats())
  }, [])

  useEffect(() => {
    refreshData()
    // Auto-refresh every 5s
    pollingRef.current = setInterval(refreshData, 5000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [refreshData])

  const handleScan = async () => {
    setScanning(true)
    setError('')
    try {
      await whaleAlerts.scanAllChains()
      refreshData()
      setSuccess('Scan complete')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      setError('Scan failed. Check RPC connections.')
    } finally {
      setScanning(false)
    }
  }

  const handleAddWallet = () => {
    setError('')
    if (!newAddr || !isValidAddress(newAddr)) {
      setError('Invalid wallet address')
      return
    }
    if (!newLabel.trim()) {
      setError('Label is required')
      return
    }

    const wallet: WhaleWallet = {
      address: newAddr.trim(),
      label: newLabel.trim(),
      estimatedValue: parseFloat(newEstValue) || 0,
      chains: [1, 8453, 42161],
      lastActivity: new Date().toISOString(),
      category: newCategory,
    }

    whaleAlerts.addWatchlistWallet(wallet)
    setNewAddr('')
    setNewLabel('')
    setNewEstValue('')
    setSuccess(`Added "${wallet.label}" to watchlist`)
    setTimeout(() => setSuccess(''), 2000)
    refreshData()
  }

  const handleRemoveWallet = (addr: string) => {
    whaleAlerts.removeWatchlistWallet(addr)
    setSuccess('Removed from watchlist')
    setTimeout(() => setSuccess(''), 2000)
    refreshData()
  }

  const handleConfigUpdate = (updates: Partial<WhaleAlertConfig>) => {
    whaleAlerts.updateConfig(updates)
    setConfig(whaleAlerts.getConfig())
    setSuccess('Settings updated')
    setTimeout(() => setSuccess(''), 2000)
  }

  const markAllRead = () => {
    whaleAlerts.markAllRead()
    refreshData()
  }

  const getTimeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  const formatUSD = (val: number) => {
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
    return `$${val.toFixed(0)}`
  }

  const alertLevelColors = {
    info: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: '🐋' },
    warning: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', icon: '⚠️' },
    critical: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: '🚨' },
  }

  const txTypeColors = {
    buy: 'text-green-400 bg-green-500/15',
    sell: 'text-red-400 bg-red-500/15',
    transfer: 'text-blue-400 bg-blue-500/15',
    approve: 'text-yellow-400 bg-yellow-500/15',
  }

  const categoryIcons = {
    fund: '🏦',
    exchange: '🏛️',
    defi: '🔮',
    individual: '👤',
    unknown: '❓',
  }

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
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🐋</span>
            <div>
              <h1 className="text-3xl font-bold">Whale Alerts</h1>
              <p className="text-white/40">Track whale wallets and get alerted on suspicious token movements</p>
            </div>
          </div>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-semibold text-sm disabled:opacity-50 hover:from-blue-500 hover:to-cyan-500 transition-all flex items-center gap-2"
          >
            {scanning ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                Scanning...
              </>
            ) : '🔍 Scan Now'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-white/40 text-xs mb-1">Tracked Whales</p>
            <p className="text-2xl font-bold text-blue-400">{stats.totalWhales}</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-white/40 text-xs mb-1">Total Alerts</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.totalAlerts}</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-white/40 text-xs mb-1">Unread</p>
            <p className="text-2xl font-bold text-red-400">{stats.unreadAlerts}</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-white/40 text-xs mb-1">Recent Transactions</p>
            <p className="text-2xl font-bold text-green-400">{stats.recentTxCount}</p>
          </div>
        </div>

        {/* Toasts */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6 flex items-center gap-2">
            <span>❌</span> {error}
            <button onClick={() => setError('')} className="ml-auto text-red-400/50 hover:text-red-400">✕</button>
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm mb-6 flex items-center gap-2">
            <span>✅</span> {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 bg-white/[0.02] border border-white/[0.05] rounded-xl w-fit">
          {(['alerts', 'transactions', 'watchlist', 'settings'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all relative ${
                activeTab === tab
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {tab === 'alerts' ? '🔔 Alerts' : tab === 'transactions' ? '📊 Transactions' : tab === 'watchlist' ? '👁️ Watchlist' : '⚙️ Settings'}
              {tab === 'alerts' && stats.unreadAlerts > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">{stats.unreadAlerts}</span>
              )}
            </button>
          ))}
        </div>

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            {alerts.length > 0 && (
              <div className="flex justify-end mb-2">
                <button onClick={markAllRead} className="text-xs text-white/30 hover:text-white/60 transition-colors">Mark all read</button>
              </div>
            )}
            {alerts.length > 0 ? alerts.map(alert => {
              const colors = alertLevelColors[alert.level]
              return (
                <div key={alert.id} className={`p-5 rounded-xl ${colors.bg} border ${colors.border} ${!alert.read ? 'ring-1 ring-blue-500/20' : ''} transition-all`}>
                  <div className="flex items-start gap-4">
                    <span className="text-2xl">{colors.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{alert.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>{alert.level}</span>
                        {!alert.read && <span className="w-2 h-2 bg-blue-400 rounded-full" />}
                      </div>
                      <p className="text-white/60 text-sm mb-2">{alert.message}</p>
                      <div className="flex items-center gap-4 text-xs text-white/30">
                        <span className="font-mono">{alert.whaleLabel}</span>
                        <span>{alert.chainName}</span>
                        <span>{alert.amount} {alert.tokenSymbol}</span>
                        {alert.usdValue > 0 && <span className="text-green-400/60">{formatUSD(alert.usdValue)}</span>}
                        <a href={`https://etherscan.io/tx/${alert.txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400/50 hover:text-blue-400 transition-colors">
                          {alert.txHash.slice(0, 10)}... ↗
                        </a>
                        <span className="ml-auto">{getTimeAgo(alert.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-center">
                <span className="text-4xl block mb-3">🔔</span>
                <p className="text-white/40 text-sm">No alerts yet</p>
                <p className="text-white/20 text-xs mt-1">Whale alerts will appear here when suspicious activity is detected</p>
              </div>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-3">
            {transactions.length > 0 ? transactions.map((tx, i) => (
              <div key={`${tx.hash}-${i}`} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all">
                <div className="flex items-center gap-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${txTypeColors[tx.type]}`}>
                    {tx.type.toUpperCase()}
                  </span>
                  {tx.suspicious && <span className="text-xs px-2 py-1 rounded-full bg-red-500/15 text-red-400">⚠️ SUSPICIOUS</span>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-white/70 font-medium">{tx.fromLabel}</span>
                      <span className="text-white/20">→</span>
                      <span className="text-white/70 font-medium">{tx.toLabel}</span>
                    </div>
                    <p className="text-white/30 text-xs mt-0.5">
                      {tx.amountFormatted} {tx.tokenSymbol} on {tx.chainName}
                      {tx.suspiciousReasons.length > 0 && (
                        <span className="text-red-400/60 ml-2">({tx.suspiciousReasons.join(', ')})</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-white/20 text-xs">{getTimeAgo(tx.timestamp)}</span>
                    <a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="block text-blue-400/40 text-xs hover:text-blue-400 transition-colors mt-0.5">
                      {tx.hash.slice(0, 8)}... ↗
                    </a>
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-center">
                <span className="text-4xl block mb-3">📊</span>
                <p className="text-white/40 text-sm">No transactions recorded</p>
                <p className="text-white/20 text-xs mt-1">Run a scan to detect whale activity</p>
              </div>
            )}
          </div>
        )}

        {/* Watchlist Tab */}
        {activeTab === 'watchlist' && (
          <div className="space-y-6">
            {/* Add wallet form */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-4">Add Whale to Watchlist</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  value={newAddr}
                  onChange={e => setNewAddr(e.target.value)}
                  placeholder="Wallet address (0x...)"
                  className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 text-sm font-mono"
                />
                <input
                  type="text"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="Label (e.g. Whale Fund #1)"
                  className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as WhaleWallet['category'])}
                  className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white/70 focus:outline-none focus:border-blue-500/40 text-sm appearance-none cursor-pointer"
                >
                  <option value="individual" className="bg-[#0a0a0f]">👤 Individual</option>
                  <option value="fund" className="bg-[#0a0a0f]">🏦 Fund</option>
                  <option value="exchange" className="bg-[#0a0a0f]">🏛️ Exchange</option>
                  <option value="defi" className="bg-[#0a0a0f]">🔮 DeFi</option>
                  <option value="unknown" className="bg-[#0a0a0f]">❓ Unknown</option>
                </select>
                <input
                  type="text"
                  value={newEstValue}
                  onChange={e => setNewEstValue(e.target.value)}
                  placeholder="Est. value USD (optional)"
                  className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 text-sm"
                />
                <button
                  onClick={handleAddWallet}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-semibold text-sm hover:from-blue-500 hover:to-cyan-500 transition-all"
                >
                  + Add to Watchlist
                </button>
              </div>
            </div>

            {/* Watchlist */}
            <div className="space-y-3">
              {watchlist.map(whale => (
                <div key={whale.address} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-blue-500/20 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{categoryIcons[whale.category]}</span>
                      <div>
                        <p className="font-medium text-sm">{whale.label}</p>
                        <p className="text-white/30 text-xs font-mono">{whale.address.slice(0, 10)}...{whale.address.slice(-8)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-blue-400">{formatUSD(whale.estimatedValue)}</p>
                        <p className="text-white/20 text-xs capitalize">{whale.category}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveWallet(whale.address)}
                        className="text-red-400/40 hover:text-red-400 text-xs transition-colors px-2 py-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-4">Alert Configuration</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl cursor-pointer hover:border-blue-500/20 transition-all">
                  <div>
                    <p className="text-sm font-medium">Enable Alerts</p>
                    <p className="text-white/30 text-xs">Receive whale activity alerts</p>
                  </div>
                  <button
                    onClick={() => handleConfigUpdate({ enabled: !config.enabled })}
                    className={`w-12 h-6 rounded-full transition-all ${config.enabled ? 'bg-green-500' : 'bg-white/10'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </label>

                <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                  <label className="text-sm font-medium block mb-2">Minimum Transaction Value (USD)</label>
                  <div className="flex items-center gap-3">
                    <span className="text-white/30 text-sm">$</span>
                    <input
                      type="number"
                      value={config.minValueUSD}
                      onChange={e => handleConfigUpdate({ minValueUSD: Number(e.target.value) })}
                      className="flex-1 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/40"
                    />
                    <span className="text-white/30 text-xs">USD</span>
                  </div>
                  <p className="text-white/20 text-xs mt-1">Only alert on transactions above this value</p>
                </div>

                {[
                  { key: 'alertOnBuy' as const, label: 'Alert on Whale Buys', desc: 'Notify when whales buy tokens' },
                  { key: 'alertOnSell' as const, label: 'Alert on Whale Sells', desc: 'Notify when whales sell tokens' },
                  { key: 'alertOnTransfer' as const, label: 'Alert on Transfers', desc: 'Notify on large whale transfers' },
                  { key: 'suspiciousTokenAlerts' as const, label: 'Suspicious Token Alerts', desc: 'Alert when whales buy new/suspicious tokens' },
                  { key: 'watchlistOnly' as const, label: 'Watchlist Only', desc: 'Only alert on watchlisted wallets' },
                ].map(({ key, label, desc }) => (
                  <label key={key} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl cursor-pointer hover:border-blue-500/20 transition-all">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-white/30 text-xs">{desc}</p>
                    </div>
                    <button
                      onClick={() => handleConfigUpdate({ [key]: !config[key] })}
                      className={`w-12 h-6 rounded-full transition-all ${config[key] ? 'bg-green-500' : 'bg-white/10'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${config[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
