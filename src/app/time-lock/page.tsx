'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  timeLockManager,
  type TimeLockResult,
  type TimeLock,
  type LockStatus,
  type LockHistoryEntry,
  type DelayOption,
  DELAY_OPTIONS,
} from '@/lib/timeLock'

const STATUS_STYLES: Record<LockStatus, { bg: string; text: string; border: string; label: string; emoji: string }> = {
  active: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', label: 'Active (Locked)', emoji: '🔒' },
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', label: 'Pending (Ready)', emoji: '⏳' },
  completed: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', label: 'Completed', emoji: '✅' },
  cancelled: { bg: 'bg-white/5', text: 'text-white/40', border: 'border-white/10', label: 'Cancelled', emoji: '❌' },
  emergency: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', label: 'Emergency Override', emoji: '🚨' },
}

export default function TimeLockPage() {
  const [data, setData] = useState<TimeLockResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [filter, setFilter] = useState<LockStatus | 'all'>('all')
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())
  const [actionDone, setActionDone] = useState<Set<string>>(new Set())

  // Create form state
  const [createForm, setCreateForm] = useState({
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    targetAddress: '',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    tokenSymbol: 'ETH',
    amount: '',
    amountFormatted: '',
    chainId: 1,
    delayHours: 48 as DelayOption,
    notes: '',
  })

  // Emergency override form
  const [overrideForm, setOverrideForm] = useState({ lockId: '', reason: '' })
  const [showOverride, setShowOverride] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await timeLockManager.getTimeLocks()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load time locks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.targetAddress || !createForm.amount) {
      setError('Please fill in target address and amount')
      return
    }
    setActionLoading(prev => new Set(prev).add('create'))
    try {
      const result = await timeLockManager.createLock({
        ...createForm,
        amount: createForm.amount,
        amountFormatted: createForm.amountFormatted || createForm.amount,
      })
      if (result.success) {
        setShowCreate(false)
        setCreateForm({ ...createForm, targetAddress: '', amount: '', amountFormatted: '', notes: '' })
        await loadData()
      } else {
        setError(result.error || 'Failed to create lock')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lock')
    } finally {
      setActionLoading(prev => {
        const next = new Set(prev)
        next.delete('create')
        return next
      })
    }
  }, [createForm, loadData])

  const handleCancel = useCallback(async (lockId: string) => {
    setActionLoading(prev => new Set(prev).add(lockId))
    try {
      const result = await timeLockManager.cancelLock(lockId, '0x1234567890abcdef1234567890abcdef12345678')
      if (result.success) {
        setActionDone(prev => new Set(prev).add(lockId))
        await loadData()
      } else {
        setError(result.error || 'Cancel failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed')
    } finally {
      setActionLoading(prev => {
        const next = new Set(prev)
        next.delete(lockId)
        return next
      })
    }
  }, [loadData])

  const handleExtend = useCallback(async (lockId: string) => {
    setActionLoading(prev => new Set(prev).add(`extend-${lockId}`))
    try {
      const result = await timeLockManager.extendLock(lockId, 24, '0x1234567890abcdef1234567890abcdef12345678')
      if (result.success) {
        await loadData()
      } else {
        setError(result.error || 'Extend failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extend failed')
    } finally {
      setActionLoading(prev => {
        const next = new Set(prev)
        next.delete(`extend-${lockId}`)
        return next
      })
    }
  }, [loadData])

  const handleExecute = useCallback(async (lockId: string) => {
    setActionLoading(prev => new Set(prev).add(lockId))
    try {
      const result = await timeLockManager.executeWithdrawal(lockId)
      if (result.success) {
        setActionDone(prev => new Set(prev).add(lockId))
        await loadData()
      } else {
        setError(result.error || 'Execution failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed')
    } finally {
      setActionLoading(prev => {
        const next = new Set(prev)
        next.delete(lockId)
        return next
      })
    }
  }, [loadData])

  const handleEmergencyOverride = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!overrideForm.lockId || !overrideForm.reason) return
    setActionLoading(prev => new Set(prev).add('override'))
    try {
      const config = timeLockManager.getMultisigConfig()
      const result = await timeLockManager.emergencyOverride(
        {
          lockId: overrideForm.lockId,
          reason: overrideForm.reason,
          multisigSigners: config.signers.slice(0, config.requiredConfirmations),
          signatures: config.signers.slice(0, config.requiredConfirmations).map(() => '0xsig'),
        },
        '0x1234567890abcdef1234567890abcdef12345678'
      )
      if (result.success) {
        setShowOverride(false)
        setOverrideForm({ lockId: '', reason: '' })
        await loadData()
      } else {
        setError(result.error || 'Override failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Override failed')
    } finally {
      setActionLoading(prev => {
        const next = new Set(prev)
        next.delete('override')
        return next
      })
    }
  }, [overrideForm, loadData])

  const filteredLocks = data?.locks.filter(l => filter === 'all' || l.status === filter) ?? []

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
          <Link href="/time-lock" className="text-sm text-purple-400 font-medium">Time Lock</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🔒 Time-Locked Withdrawals</h1>
        <p className="text-white/40 mb-8">
          Delay-based protection for cold wallet withdrawals. Configurable delays with multi-sig emergency override.
        </p>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
            {error}
            <button onClick={() => setError('')} className="ml-3 text-red-300 hover:text-red-200">Dismiss</button>
          </div>
        )}

        {loading && !data && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-purple-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading time locks...
            </div>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Total Locks', value: data.stats.totalLocks, color: 'text-white' },
                { label: 'Active (Locked)', value: data.stats.activeLocks, color: 'text-blue-400' },
                { label: 'Pending', value: data.stats.pendingWithdrawals, color: 'text-yellow-400' },
                { label: 'Completed', value: data.stats.completedWithdrawals, color: 'text-green-400' },
                { label: 'Value Secured', value: `${data.stats.totalValueSecured} ETH`, color: 'text-purple-400' },
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
                onClick={() => setShowCreate(!showCreate)}
                className="px-4 py-2 bg-purple-600 rounded-xl text-sm font-medium hover:bg-purple-500 transition-all"
              >
                🔒 Create New Lock
              </button>
              <button
                onClick={() => { setShowOverride(!showOverride); }}
                className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 hover:bg-red-500/20 transition-all"
              >
                🚨 Emergency Override
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white/60 hover:text-white transition-all"
              >
                📜 {showHistory ? 'Hide' : 'Show'} Audit Trail
              </button>
            </div>

            {/* Create Form */}
            {showCreate && (
              <form onSubmit={handleCreate} className="p-6 bg-white/[0.03] border border-white/[0.05] rounded-2xl backdrop-blur-xl space-y-4">
                <h2 className="text-lg font-semibold">🔒 Create Time Lock</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/40 text-xs mb-1 block">Target Address</label>
                    <input
                      type="text"
                      value={createForm.targetAddress}
                      onChange={e => setCreateForm({ ...createForm, targetAddress: e.target.value })}
                      placeholder="0x... (withdrawal destination)"
                      className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/40 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-white/40 text-xs mb-1 block">Amount</label>
                    <input
                      type="text"
                      value={createForm.amount}
                      onChange={e => setCreateForm({ ...createForm, amount: e.target.value, amountFormatted: e.target.value })}
                      placeholder="0.0"
                      className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/40 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-white/40 text-xs mb-1 block">Token</label>
                    <select
                      value={createForm.tokenSymbol}
                      onChange={e => setCreateForm({ ...createForm, tokenSymbol: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white focus:outline-none text-sm"
                    >
                      <option value="ETH">ETH</option>
                      <option value="USDC">USDC</option>
                      <option value="USDT">USDT</option>
                      <option value="WBTC">WBTC</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-white/40 text-xs mb-1 block">Chain</label>
                    <select
                      value={createForm.chainId}
                      onChange={e => setCreateForm({ ...createForm, chainId: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white focus:outline-none text-sm"
                    >
                      <option value={1}>⟠ Ethereum</option>
                      <option value={8453}>🔵 Base</option>
                      <option value={56}>🟡 BNB Chain</option>
                      <option value={42161}>🔵 Arbitrum</option>
                      <option value={137}>🟣 Polygon</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-white/40 text-xs mb-1 block">Delay</label>
                    <select
                      value={createForm.delayHours}
                      onChange={e => setCreateForm({ ...createForm, delayHours: Number(e.target.value) as DelayOption })}
                      className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white focus:outline-none text-sm"
                    >
                      {DELAY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-white/40 text-xs mb-1 block">Notes (optional)</label>
                  <input
                    type="text"
                    value={createForm.notes}
                    onChange={e => setCreateForm({ ...createForm, notes: e.target.value })}
                    placeholder="Monthly cold wallet rotation..."
                    className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/40 text-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={actionLoading.has('create')}
                    className="px-6 py-2.5 bg-purple-600 rounded-xl text-sm font-medium hover:bg-purple-500 transition-all disabled:opacity-50"
                  >
                    {actionLoading.has('create') ? 'Creating...' : '🔒 Create Lock'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-6 py-2.5 bg-white/[0.05] rounded-xl text-sm text-white/60 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Emergency Override Form */}
            {showOverride && (
              <form onSubmit={handleEmergencyOverride} className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-4">
                <h2 className="text-lg font-semibold text-red-400">🚨 Emergency Override (Multi-Sig Required)</h2>
                <p className="text-white/40 text-xs">
                  Bypass time-lock with multi-sig approval. Requires {data.locks[0]?.requiredConfirmations || 3} confirmations from authorized signers.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/40 text-xs mb-1 block">Lock ID</label>
                    <select
                      value={overrideForm.lockId}
                      onChange={e => setOverrideForm({ ...overrideForm, lockId: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white focus:outline-none text-sm"
                    >
                      <option value="">Select a lock...</option>
                      {data.locks.filter(l => l.status === 'active' || l.status === 'pending').map(l => (
                        <option key={l.id} value={l.id}>
                          {l.id} — {l.amountFormatted} {l.tokenSymbol} ({STATUS_STYLES[l.status].label})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-white/40 text-xs mb-1 block">Reason</label>
                    <input
                      type="text"
                      value={overrideForm.reason}
                      onChange={e => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                      placeholder="Emergency reason..."
                      className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={actionLoading.has('override')}
                    className="px-6 py-2.5 bg-red-600 rounded-xl text-sm font-medium hover:bg-red-500 transition-all disabled:opacity-50"
                  >
                    {actionLoading.has('override') ? 'Processing...' : '🚨 Execute Override'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOverride(false)}
                    className="px-6 py-2.5 bg-white/[0.05] rounded-xl text-sm text-white/60 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Delay Options Info */}
            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              <h3 className="text-sm font-medium mb-2 text-white/60">⏱️ Delay Presets</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {DELAY_OPTIONS.map(opt => (
                  <div key={opt.value} className="p-3 bg-white/[0.02] rounded-lg">
                    <span className="text-purple-400 font-bold">{opt.label}</span>
                    <p className="text-white/30 text-xs mt-1">{opt.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              {(['all', 'active', 'pending', 'completed', 'cancelled'] as const).map(f => (
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

            {/* Lock Cards */}
            <div className="grid gap-4">
              {filteredLocks.map(lock => {
                const statusStyle = STATUS_STYLES[lock.status]
                const isPending = lock.status === 'pending'
                const isActive = lock.status === 'active'
                const isDone = actionDone.has(lock.id)

                return (
                  <div
                    key={lock.id}
                    className={`p-5 rounded-2xl border backdrop-blur-xl ${statusStyle.bg} ${statusStyle.border} transition-all`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{statusStyle.emoji}</div>
                        <div>
                          <h3 className="font-bold text-lg">{lock.amountFormatted} {lock.tokenSymbol}</h3>
                          <p className="text-white/40 text-xs">{lock.chainName} • {lock.id}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                        {statusStyle.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div className="p-2 bg-white/[0.03] rounded-lg">
                        <span className="text-white/30 text-[10px]">Target</span>
                        <p className="text-xs font-mono text-blue-300 truncate">{lock.targetAddress.slice(0, 10)}...{lock.targetAddress.slice(-6)}</p>
                      </div>
                      <div className="p-2 bg-white/[0.03] rounded-lg">
                        <span className="text-white/30 text-[10px]">Delay</span>
                        <p className="text-sm font-medium">{lock.delayHours}h</p>
                      </div>
                      <div className="p-2 bg-white/[0.03] rounded-lg">
                        <span className="text-white/30 text-[10px]">Created</span>
                        <p className="text-xs text-white/60">{new Date(lock.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="p-2 bg-white/[0.03] rounded-lg">
                        <span className="text-white/30 text-[10px]">Execute After</span>
                        <p className="text-xs text-white/60">{new Date(lock.executeAfter).toLocaleString()}</p>
                      </div>
                    </div>

                    {lock.notes && (
                      <p className="text-white/40 text-xs mb-3 italic">"{lock.notes}"</p>
                    )}

                    {/* Progress indicator for active locks */}
                    {isActive && (
                      <div className="mb-3">
                        <div className="flex justify-between text-[10px] text-white/30 mb-1">
                          <span>Time elapsed</span>
                          <span>{new Date(lock.executeAfter).toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500/60 rounded-full" style={{
                            width: `${Math.min(100, ((Date.now() - new Date(lock.createdAt).getTime()) / (new Date(lock.executeAfter).getTime() - new Date(lock.createdAt).getTime())) * 100)}%`
                          }} />
                        </div>
                      </div>
                    )}

                    {/* Multi-sig info */}
                    <div className="text-white/20 text-[10px] mb-3">
                      Multi-sig: {lock.confirmations}/{lock.requiredConfirmations} confirmations
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-white/[0.05]">
                      {isActive && (
                        <>
                          <button
                            onClick={() => handleCancel(lock.id)}
                            disabled={actionLoading.has(lock.id) || isDone}
                            className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-400 hover:bg-yellow-500/20 transition-all disabled:opacity-50"
                          >
                            ❌ Cancel Lock
                          </button>
                          <button
                            onClick={() => handleExtend(lock.id)}
                            disabled={actionLoading.has(`extend-${lock.id}`)}
                            className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50"
                          >
                            ⏱️ Extend (+24h)
                          </button>
                        </>
                      )}
                      {isPending && (
                        <button
                          onClick={() => handleExecute(lock.id)}
                          disabled={actionLoading.has(lock.id) || isDone}
                          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-50 ${
                            isDone
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-green-600 text-white hover:bg-green-500'
                          }`}
                        >
                          {isDone ? '✅ Executed' : actionLoading.has(lock.id) ? 'Executing...' : '✅ Execute Withdrawal'}
                        </button>
                      )}
                      {(isActive || isPending) && (
                        <button
                          onClick={() => {
                            setOverrideForm({ ...overrideForm, lockId: lock.id })
                            setShowOverride(true)
                          }}
                          className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 hover:bg-red-500/20 transition-all"
                        >
                          🚨 Emergency Override
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {filteredLocks.length === 0 && (
                <div className="text-center py-12 text-white/30">
                  <span className="text-4xl block mb-4">🔒</span>
                  <p>No time locks match the selected filter</p>
                </div>
              )}
            </div>

            {/* Audit Trail */}
            {showHistory && data.history.length > 0 && (
              <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-xl">
                <h2 className="text-lg font-semibold mb-4">📜 Audit Trail</h2>
                <div className="space-y-2">
                  {data.history.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {entry.action === 'created' ? '🔒' : entry.action === 'executed' ? '✅' : entry.action === 'cancelled' ? '❌' : entry.action === 'extended' ? '⏱️' : '🚨'}
                        </span>
                        <div>
                          <span className="text-sm font-medium capitalize">{entry.action.replace('-', ' ')}</span>
                          <p className="text-white/30 text-xs">{entry.details}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-white/20 text-xs">{new Date(entry.timestamp).toLocaleString()}</span>
                        <p className="text-white/10 text-[10px] font-mono">{entry.actor.slice(0, 10)}...</p>
                      </div>
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
