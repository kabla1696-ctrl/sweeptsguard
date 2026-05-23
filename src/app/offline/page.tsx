'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface PendingTransaction {
  id: string
  to: string
  value: string
  data: string
  chainId: number
  nonce: number | null
  gasLimit: string | null
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'
  createdAt: string
  submittedAt: string | null
  confirmedAt: string | null
  txHash: string | null
  error: string | null
}

interface QueueStats {
  total: number
  pending: number
  submitted: number
  confirmed: number
  failed: number
}

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)
  const [transactions, setTransactions] = useState<PendingTransaction[]>([])
  const [stats, setStats] = useState<QueueStats>({ total: 0, pending: 0, submitted: 0, confirmed: 0, failed: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [toAddress, setToAddress] = useState('')
  const [txValue, setTxValue] = useState('')
  const [txChainId, setTxChainId] = useState(1)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/offline')
      const json = await res.json() as { success?: boolean; data?: { transactions: PendingTransaction[]; stats: QueueStats } }
      if (json.success && json.data) {
        setTransactions(json.data.transactions)
        setStats(json.data.stats)
      }
    } catch {
      // silently fail when offline
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchQueue()
  }, [fetchQueue])

  const handleQueueTx = async () => {
    if (!toAddress || !/^0x[0-9a-fA-F]{40}$/.test(toAddress.trim())) {
      setError('Please enter a valid address')
      return
    }
    if (!txValue) {
      setError('Please enter a value')
      return
    }

    setError('')
    try {
      const res = await fetch('/api/offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'queue',
          to: toAddress.trim(),
          value: txValue,
          chainId: txChainId,
        }),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to queue transaction')
        return
      }
      setSuccess('Transaction queued!')
      setToAddress('')
      setTxValue('')
      setShowForm(false)
      setTimeout(() => setSuccess(''), 3000)
      fetchQueue()
    } catch {
      setError('Failed to queue transaction')
    }
  }

  const handleSubmit = async (txId: string) => {
    setError('')
    try {
      const res = await fetch('/api/offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', transactionId: txId }),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to submit')
        return
      }
      setSuccess('Transaction submitted!')
      setTimeout(() => setSuccess(''), 3000)
      fetchQueue()
    } catch {
      setError('Failed to submit transaction')
    }
  }

  const handleSubmitAll = async () => {
    setError('')
    try {
      const res = await fetch('/api/offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submitAll' }),
      })
      const json = await res.json() as { success?: boolean; data?: { count: number }; error?: string }
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to submit')
        return
      }
      setSuccess(`${json.data?.count || 0} transactions submitted!`)
      setTimeout(() => setSuccess(''), 3000)
      fetchQueue()
    } catch {
      setError('Failed to submit transactions')
    }
  }

  const handleCancel = async (txId: string) => {
    try {
      await fetch(`/api/offline?id=${txId}`, { method: 'DELETE' })
      fetchQueue()
    } catch {
      // silently fail
    }
  }

  const handleClear = async () => {
    try {
      await fetch('/api/offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' }),
      })
      fetchQueue()
    } catch {
      // silently fail
    }
  }

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.href = '/'
    } else {
      window.location.reload()
    }
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    submitted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    confirmed: 'bg-green-500/10 text-green-400 border-green-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gray-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-white-500/[0.03] rounded-full blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/scan" className="text-sm text-white/50 hover:text-green-400 transition-colors">Scan</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-green-400 transition-colors">Dashboard</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <span className="text-4xl">🛡️</span>
          <div>
            <h1 className="text-3xl font-bold">Offline Transaction Queue</h1>
            <p className="text-white/40">Queue transactions for when you&apos;re back online</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-8 ${
          isOnline
            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`} />
          {isOnline ? 'Online' : 'Offline'}
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Total', value: stats.total, icon: '📊', color: 'text-blue-400' },
            { label: 'Pending', value: stats.pending, icon: '⏳', color: 'text-yellow-400' },
            { label: 'Submitted', value: stats.submitted, icon: '📤', color: 'text-blue-400' },
            { label: 'Confirmed', value: stats.confirmed, icon: '✅', color: 'text-green-400' },
            { label: 'Failed', value: stats.failed, icon: '❌', color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
              <span className="text-xl">{s.icon}</span>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              <p className="text-white/40 text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-8 flex-wrap">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-semibold text-sm hover:from-purple-500 hover:to-indigo-500 transition-all"
          >
            + Queue Transaction
          </button>
          {stats.pending > 0 && (
            <button
              onClick={handleSubmitAll}
              className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm hover:from-green-500 hover:to-emerald-500 transition-all"
            >
              📤 Submit All ({stats.pending})
            </button>
          )}
          {stats.total > 0 && (
            <button
              onClick={handleClear}
              className="px-5 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-sm text-white/50 hover:text-white/70 transition-all"
            >
              🗑️ Clear All
            </button>
          )}
          <button
            onClick={fetchQueue}
            className="px-5 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-sm text-white/50 hover:text-white/70 transition-all"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Queue Form */}
        {showForm && (
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm mb-8">
            <h3 className="text-lg font-semibold mb-4">Queue Transaction</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                value={toAddress}
                onChange={e => setToAddress(e.target.value)}
                placeholder="To address (0x...)"
                className="md:col-span-2 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/40 text-sm font-mono"
              />
              <input
                type="text"
                value={txValue}
                onChange={e => setTxValue(e.target.value)}
                placeholder="Value (e.g., 0.1 ETH)"
                className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/40 text-sm"
              />
              <select
                value={txChainId}
                onChange={e => setTxChainId(Number(e.target.value))}
                className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white/70 focus:outline-none text-sm appearance-none cursor-pointer"
              >
                <option value={1} className="bg-[#0a0a0f]">Ethereum</option>
                <option value={8453} className="bg-[#0a0a0f]">Base</option>
                <option value={42161} className="bg-[#0a0a0f]">Arbitrum</option>
                <option value={137} className="bg-[#0a0a0f]">Polygon</option>
              </select>
            </div>
            <button
              onClick={handleQueueTx}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-semibold text-sm hover:from-purple-500 hover:to-indigo-500 transition-all"
            >
              Add to Queue
            </button>
          </div>
        )}

        {/* Transaction List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map(tx => (
              <div key={tx.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs border ${statusColors[tx.status]}`}>
                      {tx.status.toUpperCase()}
                    </span>
                    <span className="text-sm font-mono text-white/70">{tx.to.slice(0, 10)}...{tx.to.slice(-8)}</span>
                  </div>
                  <span className="text-xs text-white/30">{new Date(tx.createdAt).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-white/40 mb-3">
                  <div><span className="text-white/20">Value:</span> {tx.value}</div>
                  <div><span className="text-white/20">Chain:</span> {tx.chainId}</div>
                  <div><span className="text-white/20">ID:</span> {tx.id.slice(0, 12)}...</div>
                </div>
                {tx.txHash && (
                  <p className="text-xs text-green-400/60 font-mono mb-2">TX: {tx.txHash.slice(0, 18)}...</p>
                )}
                <div className="flex gap-2">
                  {tx.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleSubmit(tx.id)}
                        className="px-3 py-1.5 bg-green-600/20 text-green-400 rounded-lg text-xs hover:bg-green-600/30 transition-colors"
                      >
                        📤 Submit
                      </button>
                      <button
                        onClick={() => handleCancel(tx.id)}
                        className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-xs hover:bg-red-600/30 transition-colors"
                      >
                        ✕ Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-center">
            <span className="text-4xl block mb-3">📦</span>
            <p className="text-white/40 text-sm">No transactions in queue</p>
            <p className="text-white/20 text-xs mt-1">Queue transactions while offline, submit when back online</p>
          </div>
        )}

        {/* Offline hint */}
        {!isOnline && (
          <div className="mt-8 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
            <p className="text-white/30 text-xs font-semibold mb-2">📦 Available Offline:</p>
            <ul className="text-white/20 text-xs space-y-1">
              <li>• Previously visited pages</li>
              <li>• Cached scan results</li>
              <li>• Transaction queue (will submit when online)</li>
            </ul>
            <button
              onClick={handleRetry}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl font-semibold text-sm hover:from-violet-500 hover:to-purple-500 transition-all"
            >
              ↻ Retry Connection
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
