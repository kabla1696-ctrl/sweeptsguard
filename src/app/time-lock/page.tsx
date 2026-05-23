'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'

interface TimeLock {
  id: string
  asset: string
  amount: string
  unlockDate: string
  status: 'locked' | 'unlocked' | 'cancelled'
  progress: number
  createdAt: string
  durationHours: number
}

const DURATIONS = [
  { label: '1 Day', hours: 24 },
  { label: '1 Week', hours: 168 },
  { label: '1 Month', hours: 720 },
  { label: '3 Months', hours: 2160 },
  { label: 'Custom', hours: 0 },
]

export default function TimeLockPage() {
  const [asset, setAsset] = useState('ETH')
  const [amount, setAmount] = useState('')
  const [duration, setDuration] = useState(168)
  const [customHours, setCustomHours] = useState('')
  const [locks, setLocks] = useState<TimeLock[]>([])
  const [creating, setCreating] = useState(false)
  const [canceling, setCanceling] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLocks = useCallback(async () => {
    try {
      const res = await fetch('/api/time-lock')
      if (!res.ok) throw new Error('Failed to load locks')
      const data = await res.json()
      setLocks(data.locks || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLocks() }, [fetchLocks])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const hours = duration || parseInt(customHours) || 168
      const res = await fetch('/api/time-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', asset, amount: amount || '0', durationHours: hours }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create lock')
      }
      setAmount('')
      await fetchLocks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lock')
    } finally {
      setCreating(false)
    }
  }

  const handleCancel = async (id: string) => {
    setCanceling(id)
    setError(null)
    try {
      const res = await fetch('/api/time-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', id }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to cancel lock')
      }
      await fetchLocks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel lock')
    } finally {
      setCanceling(null)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/5 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#00ff87]/5 rounded-full blur-[128px] animate-pulse delay-1000" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-[#00ff87] to-[#00e5ff] bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-6">
          <Link href="/dashboard" className="text-sm text-white/40 hover:text-white/80 transition-colors">Dashboard</Link>
          <Link href="/time-lock" className="text-sm text-amber-400 font-semibold">Time Lock</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Time-Locked Security
          </div>
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-[#00ff87] bg-clip-text text-transparent">Time</span>{' '}
            <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Lock</span>
          </h1>
          <p className="text-white/40 text-lg max-w-xl mx-auto">Lock your assets for a set duration. Prevent impulsive trades and protect against hacks.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 rounded-xl text-sm text-[#ff3b3b]">
            {error}
            <button onClick={() => setError(null)} className="ml-3 text-xs underline">dismiss</button>
          </div>
        )}

        {/* Create Lock Form */}
        <form onSubmit={handleCreate} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 mb-8 hover:border-amber-500/20 transition-all duration-500">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <span className="text-amber-400">🔒</span> Create New Lock
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Asset</label>
              <select value={asset} onChange={e => setAsset(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-amber-500/40 transition-all appearance-none">
                <option value="ETH">ETH</option>
                <option value="USDC">USDC</option>
                <option value="WBTC">WBTC</option>
                <option value="DAI">DAI</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Amount</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 transition-all" />
            </div>
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Duration</label>
              <select value={duration} onChange={e => setDuration(parseInt(e.target.value))} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-amber-500/40 transition-all appearance-none">
                {DURATIONS.map(d => <option key={d.label} value={d.hours}>{d.label}</option>)}
              </select>
            </div>
          </div>
          {duration === 0 && (
            <div className="mb-6">
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Custom Hours</label>
              <input value={customHours} onChange={e => setCustomHours(e.target.value)} placeholder="Hours" type="number" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 transition-all" />
            </div>
          )}
          <button type="submit" disabled={creating} className="w-full py-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all duration-300 disabled:opacity-50">
            {creating ? 'Creating Lock...' : '🔒 Lock Assets'}
          </button>
        </form>

        {/* Active Locks */}
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-amber-400">⏳</span> Active Locks
        </h2>
        {loading ? (
          <div className="text-center py-12 text-white/30">Loading locks...</div>
        ) : locks.length === 0 ? (
          <div className="p-8 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-center">
            <span className="text-4xl block mb-3">🔒</span>
            <p className="text-white/30 text-sm">No locks created yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {locks.map((l) => (
              <div key={l.id} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.12] transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-lg">
                      {l.status === 'unlocked' ? '🔓' : l.status === 'cancelled' ? '❌' : '🔒'}
                    </div>
                    <div>
                      <span className="font-semibold text-white/90">{l.amount} {l.asset}</span>
                      <div className="text-xs text-white/40 mt-0.5">Unlocks: {l.unlockDate}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg text-xs border ${
                      l.status === 'unlocked' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                      l.status === 'cancelled' ? 'text-white/30 bg-white/5 border-white/10' :
                      'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    }`}>
                      {l.status}
                    </span>
                    {l.status === 'locked' && (
                      <button
                        onClick={() => handleCancel(l.id)}
                        disabled={canceling === l.id}
                        className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-all disabled:opacity-50"
                      >
                        {canceling === l.id ? 'Canceling...' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${l.status === 'unlocked' ? 'bg-green-400' : 'bg-gradient-to-r from-amber-500 to-yellow-500'}`}
                    style={{ width: `${l.progress}%` }}
                  />
                </div>
                <div className="text-right text-xs text-white/30 mt-1">{l.progress}% elapsed</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
