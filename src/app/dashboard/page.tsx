'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface MonitorStatus {
  running: boolean
  address: string
  safeAddress: string
  chains: number[]
  alerts: { type: string; message: string; timestamp: number; chainName: string }[]
  sweeps: { success: boolean; chainName: string; asset: string; amount: string; txHash?: string; error?: string }[]
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const addressParam = searchParams.get('address')

  const [address, setAddress] = useState(addressParam || '')
  const [safeAddress, setSafeAddress] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [monitoring, setMonitoring] = useState(false)
  const [status, setStatus] = useState<MonitorStatus | null>(null)
  const [showPrivateKey, setShowPrivateKey] = useState(false)

  const startMonitoring = useCallback(async () => {
    if (!address || !safeAddress || !privateKey) return

    try {
      const res = await fetch('/api/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          address,
          safeAddress,
          privateKey,
          chainIds: [1, 8453, 56, 42161, 137, 10]
        })
      })
      const data = await res.json()
      if (data.success) {
        setMonitoring(true)
        pollStatus()
      }
    } catch (err) {
      console.error('Failed to start monitoring:', err)
    }
  }, [address, safeAddress, privateKey])

  const stopMonitoring = useCallback(async () => {
    try {
      await fetch('/api/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', address })
      })
      setMonitoring(false)
    } catch (err) {
      console.error('Failed to stop monitoring:', err)
    }
  }, [address])

  const pollStatus = useCallback(async () => {
    if (!address) return
    try {
      const res = await fetch(`/api/monitor?address=${address}`)
      const data = await res.json()
      setStatus(data)
      if (data.running) setMonitoring(true)
    } catch (err) {
      console.error('Failed to fetch status:', err)
    }
  }, [address])

  useEffect(() => {
    if (address) pollStatus()
    const interval = setInterval(pollStatus, 5000)
    return () => clearInterval(interval)
  }, [address, pollStatus])

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
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Protection Dashboard</h1>
        <p className="text-white/40 mb-8">Set up auto-sweep monitoring for your compromised wallet</p>

        {/* Setup Form */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
              Compromised Wallet
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
              Safe Wallet (Sweep To)
            </label>
            <input
              type="text"
              value={safeAddress}
              onChange={(e) => setSafeAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
            />
          </div>
        </div>

        <div className="mb-8">
          <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
            Private Key (for compromised wallet)
          </label>
          <div className="relative">
            <input
              type={showPrivateKey ? 'text' : 'password'}
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="Private key of compromised wallet..."
              className="w-full px-4 py-3 pr-20 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
            />
            <button
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs"
            >
              {showPrivateKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-white/20 text-xs mt-2">
            ⚠️ This key is used to sign sweep transactions. Never share it. For production, use a backend service.
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-8">
          {!monitoring ? (
            <button
              onClick={startMonitoring}
              disabled={!address || !safeAddress || !privateKey}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold disabled:opacity-50 hover:from-green-500 hover:to-emerald-500 transition-all"
            >
              🛡️ Start Protection
            </button>
          ) : (
            <button
              onClick={stopMonitoring}
              className="px-8 py-3 bg-red-600/20 border border-red-500/30 rounded-xl font-semibold text-red-400 hover:bg-red-600/30 transition-all"
            >
              Stop Monitoring
            </button>
          )}
          <button
            onClick={pollStatus}
            className="px-6 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl hover:bg-white/[0.08] transition-all"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Status */}
        {monitoring && (
          <div className="p-5 bg-green-500/10 border border-green-500/20 rounded-2xl mb-8">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 font-semibold">Active Protection</span>
            </div>
            <p className="text-white/40 text-sm mt-2">
              Monitoring {address.slice(0, 6)}...{address.slice(-4)} across all chains
            </p>
          </div>
        )}

        {/* Alerts */}
        {status?.alerts && status.alerts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">🚨 Alerts</h2>
            <div className="space-y-2">
              {status.alerts.map((alert, i) => (
                <div key={i} className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-yellow-400 text-sm font-medium">{alert.type}</span>
                      <p className="text-white/60 text-sm mt-1">{alert.message}</p>
                    </div>
                    <span className="text-white/20 text-xs">{alert.chainName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sweep Results */}
        {status?.sweeps && status.sweeps.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">⚡ Sweep History</h2>
            <div className="space-y-2">
              {status.sweeps.map((sweep, i) => (
                <div key={i} className={`p-4 rounded-xl border ${
                  sweep.success
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-red-500/5 border-red-500/20'
                }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className={sweep.success ? 'text-green-400' : 'text-red-400'}>
                        {sweep.success ? '✅' : '❌'} {sweep.asset}
                      </span>
                      <span className="text-white/30 text-sm ml-2">{sweep.chainName}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">{sweep.amount}</div>
                      {sweep.txHash && (
                        <a
                          href={`https://etherscan.io/tx/${sweep.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400/50 text-xs hover:text-green-400"
                        >
                          {sweep.txHash.slice(0, 10)}...
                        </a>
                      )}
                      {sweep.error && (
                        <div className="text-red-400/50 text-xs">{sweep.error}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/30">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
