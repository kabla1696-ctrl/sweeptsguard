'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Policy {
  id: string
  walletAddress: string
  chainId: number
  recoveryAmount: string
  premiumPaid: string
  status: 'active' | 'claimed' | 'expired'
  createdAt: number
  expiresAt: number
}

interface PoolStats {
  totalBalance: string
  totalPolicies: number
  activePolicies: number
  claimedPolicies: number
  expiredPolicies: number
  totalPremiumsCollected: string
  totalRefundsPaid: string
}

export default function InsurancePage() {
  const [step, setStep] = useState<'info' | 'calculate' | 'buy' | 'claim'>('info')
  const [walletAddress, setWalletAddress] = useState('')
  const [chainId, setChainId] = useState(1)
  const [recoveryAmount, setRecoveryAmount] = useState('')
  const [policyId, setPolicyId] = useState('')
  const [claimReason, setClaimReason] = useState('')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPoolStats()
  }, [])

  const fetchPoolStats = async () => {
    try {
      const res = await fetch('/api/insurance?action=pool')
      const data = await res.json() as PoolStats
      setPoolStats(data)
    } catch {
      // Silent fail
    }
  }

  const handleCalculate = async () => {
    if (!recoveryAmount || parseFloat(recoveryAmount) <= 0) {
      setError('Enter a valid recovery amount')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/insurance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'calculate', recoveryAmount }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch {
      setError('Failed to calculate premium')
    } finally {
      setLoading(false)
    }
  }

  const handleBuy = async () => {
    if (!walletAddress || !recoveryAmount) {
      setError('Wallet address and recovery amount required')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/insurance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          walletAddress,
          chainId,
          recoveryAmount,
        }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else {
        setResult(data)
        fetchPoolStats()
      }
    } catch {
      setError('Failed to create policy')
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async () => {
    if (!policyId || !claimReason) {
      setError('Policy ID and reason required')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/insurance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim', policyId, reason: claimReason }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else {
        setResult(data)
        fetchPoolStats()
      }
    } catch {
      setError('Failed to submit claim')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/scan" className="text-sm text-white/50 hover:text-white">Scan</Link>
          <Link href="/recover" className="text-sm text-white/50 hover:text-white">Recover</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white">Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🛡️ Recovery Insurance</h1>
        <p className="text-white/40 mb-8">Protect your recovery attempt with insurance. Small premium, big peace of mind.</p>

        {/* Pool Stats */}
        {poolStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl text-center">
              <p className="text-xs text-white/30 mb-1">Pool Balance</p>
              <p className="text-lg font-bold text-green-400">${parseFloat(poolStats.totalBalance).toFixed(2)}</p>
            </div>
            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl text-center">
              <p className="text-xs text-white/30 mb-1">Active Policies</p>
              <p className="text-lg font-bold">{poolStats.activePolicies}</p>
            </div>
            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl text-center">
              <p className="text-xs text-white/30 mb-1">Claims Paid</p>
              <p className="text-lg font-bold">{poolStats.claimedPolicies}</p>
            </div>
            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl text-center">
              <p className="text-xs text-white/30 mb-1">Refunds Paid</p>
              <p className="text-lg font-bold text-yellow-400">${parseFloat(poolStats.totalRefundsPaid).toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Step selector */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          {(['info', 'calculate', 'buy', 'claim'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStep(s); setResult(null); setError('') }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                step === s
                  ? 'bg-green-600 text-white'
                  : 'bg-white/[0.03] text-white/50 hover:text-white/70'
              }`}
            >
              {s === 'info' ? '📖 How It Works' : s === 'calculate' ? '🧮 Calculate' : s === 'buy' ? '🛒 Buy Policy' : '📋 File Claim'}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">{error}</div>
        )}

        {/* Info */}
        {step === 'info' && (
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl">
              <h2 className="text-lg font-bold mb-4">How Insurance Works</h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <span className="text-2xl">1️⃣</span>
                  <div>
                    <h3 className="font-semibold">Buy a Policy Before Recovery</h3>
                    <p className="text-white/40 text-sm">Pay a 1% premium on the recovery amount. Policy is valid for 7 days.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-2xl">2️⃣</span>
                  <div>
                    <h3 className="font-semibold">Attempt Recovery</h3>
                    <p className="text-white/40 text-sm">Use SweepGuard to recover your stolen funds. Insurance covers failed attempts.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-2xl">3️⃣</span>
                  <div>
                    <h3 className="font-semibold">Claim If It Fails</h3>
                    <p className="text-white/40 text-sm">If recovery fails, file a claim and receive 80% of your premium back from the insurance pool.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
              <h2 className="text-lg font-bold mb-3">Pricing</h2>
              <ul className="space-y-2 text-sm text-white/50">
                <li>• <strong className="text-white/70">Premium:</strong> 1% of recovery amount</li>
                <li>• <strong className="text-white/70">Refund on claim:</strong> 80% of premium</li>
                <li>• <strong className="text-white/70">Policy duration:</strong> 7 days</li>
                <li>• <strong className="text-white/70">Claim processing:</strong> Instant (auto-approved)</li>
              </ul>
            </div>
          </div>
        )}

        {/* Calculate */}
        {step === 'calculate' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Recovery Amount (ETH)</label>
              <input
                type="number"
                value={recoveryAmount}
                onChange={e => setRecoveryAmount(e.target.value)}
                placeholder="e.g., 5.0"
                step="0.01"
                min="0"
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm"
              />
            </div>
            <button
              onClick={handleCalculate}
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50"
            >
              {loading ? 'Calculating...' : '🧮 Calculate Premium'}
            </button>

            {result && (
              <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/40">Recovery Amount</span>
                  <span className="font-semibold">{String(result.recoveryAmount)} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Premium (1%)</span>
                  <span className="font-semibold text-green-400">{String(result.premium)} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Refund on Claim (80%)</span>
                  <span className="font-semibold text-yellow-400">{String(result.refundOnClaim)} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Duration</span>
                  <span className="font-semibold">{String(result.duration)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Buy Policy */}
        {step === 'buy' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Wallet Address</label>
              <input
                type="text"
                value={walletAddress}
                onChange={e => setWalletAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Chain</label>
              <select
                value={chainId}
                onChange={e => setChainId(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white focus:outline-none focus:border-green-500/40 text-sm"
              >
                <option value={1}>⟠ Ethereum</option>
                <option value={8453}>🔵 Base</option>
                <option value={42161}>🔷 Arbitrum</option>
                <option value={137}>🟣 Polygon</option>
                <option value={10}>🔴 Optimism</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Recovery Amount (ETH)</label>
              <input
                type="number"
                value={recoveryAmount}
                onChange={e => setRecoveryAmount(e.target.value)}
                placeholder="e.g., 5.0"
                step="0.01"
                min="0"
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm"
              />
            </div>
            <button
              onClick={handleBuy}
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50"
            >
              {loading ? 'Creating Policy...' : '🛡️ Buy Insurance Policy'}
            </button>

            {result && (
              <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-2xl space-y-2">
                <p className="text-green-400 font-semibold">✅ Policy Created!</p>
                <p className="text-sm text-white/50">Policy ID: <code className="text-white/70">{String((result as Record<string, unknown>).policy ? ((result.policy as Record<string, unknown>).id as string) : '')}</code></p>
                <p className="text-sm text-white/50">Premium: {String(result.premium)} ETH</p>
                <p className="text-sm text-white/50">{String(result.message)}</p>
              </div>
            )}
          </div>
        )}

        {/* File Claim */}
        {step === 'claim' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Policy ID</label>
              <input
                type="text"
                value={policyId}
                onChange={e => setPolicyId(e.target.value)}
                placeholder="ins_..."
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Reason for Claim</label>
              <textarea
                value={claimReason}
                onChange={e => setClaimReason(e.target.value)}
                placeholder="Describe why the recovery failed (min 10 characters)..."
                rows={4}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm resize-none"
              />
            </div>
            <button
              onClick={handleClaim}
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl font-semibold text-sm disabled:opacity-50"
            >
              {loading ? 'Processing Claim...' : '📋 File Insurance Claim'}
            </button>

            {result && (
              <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-2xl space-y-2">
                <p className="text-green-400 font-semibold">✅ Claim Approved!</p>
                <p className="text-sm text-white/50">Refund: {String(result.refund)} ETH</p>
                <p className="text-sm text-white/50">{String(result.message)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
