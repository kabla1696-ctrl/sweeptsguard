'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  getStoredReferrers,
  getStoredClaims,
  getStoredPayouts,
  getAdminStats,
  markAsPaid,
  type ClaimRecord,
  type ReferrerEntry,
  type PayoutRecord,
  type AdminStats,
} from '@/lib/referral'

const ADMIN_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A'

export default function AdminPage() {
  const [connectedWallet, setConnectedWallet] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminStats>({
    totalClaims: 0,
    totalPlatformFees: 0,
    totalReferrerCommissions: 0,
    netRevenue: 0,
    totalReferrers: 0,
    pendingPayouts: 0,
  })
  const [referrers, setReferrers] = useState<ReferrerEntry[]>([])
  const [claims, setClaims] = useState<ClaimRecord[]>([])
  const [payouts, setPayouts] = useState<PayoutRecord[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'referrers' | 'claims' | 'payouts'>('overview')
  const [payoutModal, setPayoutModal] = useState<{ code: string; amount: number } | null>(null)
  const [txHash, setTxHash] = useState('')
  const [processing, setProcessing] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [adminStats, storedReferrers, storedClaims, storedPayouts] = await Promise.all([
        getAdminStats(),
        Promise.resolve(getStoredReferrers()),
        Promise.resolve(getStoredClaims()),
        Promise.resolve(getStoredPayouts()),
      ])
      setStats(adminStats)
      setReferrers(storedReferrers)
      setClaims(storedClaims)
      setPayouts(storedPayouts)
    } catch (err) {
      console.error('[Admin] Failed to load data:', err)
    }
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        // Check for ethereum provider
        if (typeof window !== 'undefined' && (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum) {
          const eth = (window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }).ethereum
          const accounts = await eth.request({ method: 'eth_accounts' })
          if (accounts.length > 0) {
            const wallet = accounts[0]
            setConnectedWallet(wallet)
            setIsAdmin(wallet.toLowerCase() === ADMIN_WALLET.toLowerCase())
          }
        }
      } catch {
        // No wallet connected
      }
      await loadData()
      setLoading(false)
    }
    init()
  }, [loadData])

  const handleConnect = async () => {
    try {
      if (typeof window !== 'undefined' && (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum) {
        const eth = (window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }).ethereum
        const accounts = await eth.request({ method: 'eth_requestAccounts' })
        if (accounts.length > 0) {
          const wallet = accounts[0]
          setConnectedWallet(wallet)
          setIsAdmin(wallet.toLowerCase() === ADMIN_WALLET.toLowerCase())
        }
      }
    } catch {
      // User rejected
    }
  }

  const handlePayout = async () => {
    if (!payoutModal || !txHash.trim() || !txHash.startsWith('0x')) return
    setProcessing(true)
    try {
      await markAsPaid(payoutModal.code, payoutModal.amount, txHash.trim())
      await loadData()
      setPayoutModal(null)
      setTxHash('')
    } catch (err) {
      console.error('[Admin] Payout failed:', err)
    } finally {
      setProcessing(false)
    }
  }

  // Calculate referrer stats from claims
  const referrerStats = referrers.map(ref => {
    const refClaims = claims.filter(c => c.referralCode === ref.code)
    const totalEarned = refClaims.reduce((sum, c) => sum + c.referrerCommission, 0)
    const totalPaid = payouts
      .filter(p => p.referralCode === ref.code)
      .reduce((sum, p) => sum + p.amount, 0)
    return {
      ...ref,
      totalReferrals: refClaims.length,
      totalEarned,
      totalPaid,
      pending: totalEarned - totalPaid,
    }
  })

  // Access denied screen
  if (!loading && !isAdmin) {
    return (
      <main className="min-h-screen bg-[#030305] text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-30%] left-[-10%] w-[600px] h-[600px] rounded-full bg-red-600/10 blur-[150px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-red-600/8 blur-[120px]" />
        </div>
        <nav className="relative z-10 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              SweepGuard
            </span>
          </Link>
        </nav>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] px-6">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-3xl font-bold mb-4">
            <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              Access Denied
            </span>
          </h1>
          <p className="text-white/40 mb-8 text-center max-w-md">
            This page is restricted to the admin wallet. Connect the authorized wallet to access the dashboard.
          </p>
          {!connectedWallet ? (
            <button
              onClick={handleConnect}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-semibold transition-all"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="text-center">
              <p className="text-white/30 text-sm mb-2">Connected:</p>
              <p className="font-mono text-white/50 text-sm">{connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}</p>
              <p className="text-red-400/60 text-xs mt-2">This wallet is not authorized as admin.</p>
            </div>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[-10%] w-[600px] h-[600px] rounded-full bg-green-600/10 blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/8 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-cyan-600/5 blur-[130px] animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            SweepGuard
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400 font-mono">
              {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
            </span>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-8 pb-24">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-4">
            <span>👑</span>
            Admin Dashboard
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-2">
            <span className="bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
              Referral Management
            </span>
          </h1>
          <p className="text-white/30">Track referrals, commissions, and manage payouts.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {(['overview', 'referrers', 'claims', 'payouts'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-600/20'
                  : 'bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.05]'
              }`}
            >
              {tab === 'overview' && '📊 '}{tab === 'referrers' && '👥 '}{tab === 'claims' && '📋 '}{tab === 'payouts' && '💸 '}
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-24">
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <p className="text-white/30">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Claims', value: stats.totalClaims.toString(), icon: '📋', color: 'from-blue-400 to-cyan-400' },
                    { label: 'Platform Fees', value: `$${stats.totalPlatformFees.toFixed(2)}`, icon: '💰', color: 'from-green-400 to-emerald-400' },
                    { label: 'Referrer Commissions', value: `$${stats.totalReferrerCommissions.toFixed(2)}`, icon: '🤝', color: 'from-purple-400 to-pink-400' },
                    { label: 'Net Revenue', value: `$${stats.netRevenue.toFixed(2)}`, icon: '📈', color: 'from-amber-400 to-orange-400' },
                  ].map((stat, i) => (
                    <div key={i} className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl">{stat.icon}</span>
                      </div>
                      <div className={`text-3xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                        {stat.value}
                      </div>
                      <div className="text-white/30 text-sm mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Additional Stats */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl backdrop-blur-sm">
                    <div className="text-2xl mb-2">👥</div>
                    <div className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
                      {stats.totalReferrers}
                    </div>
                    <div className="text-white/30 text-sm">Registered Referrers</div>
                  </div>
                  <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl backdrop-blur-sm">
                    <div className="text-2xl mb-2">⏳</div>
                    <div className="text-2xl font-black bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
                      ${stats.pendingPayouts.toFixed(2)}
                    </div>
                    <div className="text-white/30 text-sm">Pending Payouts</div>
                  </div>
                  <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl backdrop-blur-sm">
                    <div className="text-2xl mb-2">📊</div>
                    <div className="text-2xl font-black bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">
                      {stats.totalClaims > 0 ? ((stats.totalReferrerCommissions / stats.totalPlatformFees) * 100).toFixed(1) : '0'}%
                    </div>
                    <div className="text-white/30 text-sm">Commission Ratio</div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl backdrop-blur-sm">
                  <h2 className="text-lg font-semibold mb-4">Recent Claims</h2>
                  {claims.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-3xl mb-3">📭</div>
                      <p className="text-white/30 text-sm">No claims recorded yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/[0.06]">
                            <th className="text-left text-white/30 font-normal pb-3 pr-4">Code</th>
                            <th className="text-left text-white/30 font-normal pb-3 pr-4">Claimer</th>
                            <th className="text-right text-white/30 font-normal pb-3 pr-4">Amount</th>
                            <th className="text-right text-white/30 font-normal pb-3 pr-4">Platform Fee</th>
                            <th className="text-right text-white/30 font-normal pb-3 pr-4">Commission</th>
                            <th className="text-left text-white/30 font-normal pb-3">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {claims.slice(-10).reverse().map((claim, i) => (
                            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                              <td className="py-3 pr-4">
                                <span className="font-mono text-green-400/70 text-xs">{claim.referralCode}</span>
                              </td>
                              <td className="py-3 pr-4">
                                <span className="font-mono text-white/50 text-xs">
                                  {claim.claimerWallet.slice(0, 6)}...{claim.claimerWallet.slice(-4)}
                                </span>
                              </td>
                              <td className="py-3 pr-4 text-right text-white/60">${claim.claimAmount.toFixed(2)}</td>
                              <td className="py-3 pr-4 text-right text-amber-400/70">${claim.platformFee.toFixed(2)}</td>
                              <td className="py-3 pr-4 text-right text-green-400/70">${claim.referrerCommission.toFixed(2)}</td>
                              <td className="py-3 text-white/30 text-xs">
                                {new Date(claim.timestamp).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* REFERRERS TAB */}
            {activeTab === 'referrers' && (
              <div className="space-y-4">
                {referrerStats.length === 0 ? (
                  <div className="text-center py-24">
                    <div className="text-5xl mb-4">👥</div>
                    <p className="text-white/30">No referrers registered yet.</p>
                  </div>
                ) : (
                  referrerStats.map((ref, i) => (
                    <div key={i} className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl backdrop-blur-sm">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-green-400 text-lg font-bold">{ref.code}</span>
                            <span className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-medium">
                              Active
                            </span>
                          </div>
                          <p className="font-mono text-white/40 text-sm">{ref.walletAddress}</p>
                          <p className="text-white/20 text-xs mt-1">
                            Registered: {new Date(ref.registeredAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-6">
                          <div className="text-center">
                            <div className="text-xl font-bold text-white/80">{ref.totalReferrals}</div>
                            <div className="text-white/30 text-xs">Referrals</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-green-400">${ref.totalEarned.toFixed(2)}</div>
                            <div className="text-white/30 text-xs">Earned</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-amber-400">${ref.pending.toFixed(2)}</div>
                            <div className="text-white/30 text-xs">Pending</div>
                          </div>
                          {ref.pending > 0 && (
                            <button
                              onClick={() => setPayoutModal({ code: ref.code, amount: ref.pending })}
                              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg text-sm font-semibold transition-all self-center"
                            >
                              Pay Out
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* CLAIMS TAB */}
            {activeTab === 'claims' && (
              <div>
                {claims.length === 0 ? (
                  <div className="text-center py-24">
                    <div className="text-5xl mb-4">📋</div>
                    <p className="text-white/30">No claims recorded yet.</p>
                  </div>
                ) : (
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl backdrop-blur-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/[0.06]">
                            <th className="text-left text-white/30 font-normal p-4">Referral Code</th>
                            <th className="text-left text-white/30 font-normal p-4">Claimer Wallet</th>
                            <th className="text-right text-white/30 font-normal p-4">Claim Amount</th>
                            <th className="text-right text-white/30 font-normal p-4">Platform Fee (20%)</th>
                            <th className="text-right text-white/30 font-normal p-4">Commission (5%)</th>
                            <th className="text-left text-white/30 font-normal p-4">Status</th>
                            <th className="text-left text-white/30 font-normal p-4">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {claims.map((claim, i) => (
                            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                              <td className="p-4">
                                <span className="font-mono text-green-400/70 text-xs">{claim.referralCode}</span>
                              </td>
                              <td className="p-4">
                                <span className="font-mono text-white/50 text-xs">
                                  {claim.claimerWallet.slice(0, 6)}...{claim.claimerWallet.slice(-4)}
                                </span>
                              </td>
                              <td className="p-4 text-right text-white/60">${claim.claimAmount.toFixed(2)}</td>
                              <td className="p-4 text-right text-amber-400/70">${claim.platformFee.toFixed(2)}</td>
                              <td className="p-4 text-right text-green-400/70">${claim.referrerCommission.toFixed(2)}</td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                                  claim.status === 'completed'
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : claim.status === 'pending'
                                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                  {claim.status}
                                </span>
                              </td>
                              <td className="p-4 text-white/30 text-xs">
                                {new Date(claim.timestamp).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PAYOUTS TAB */}
            {activeTab === 'payouts' && (
              <div>
                {payouts.length === 0 ? (
                  <div className="text-center py-24">
                    <div className="text-5xl mb-4">💸</div>
                    <p className="text-white/30">No payouts recorded yet.</p>
                  </div>
                ) : (
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl backdrop-blur-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/[0.06]">
                            <th className="text-left text-white/30 font-normal p-4">Referral Code</th>
                            <th className="text-right text-white/30 font-normal p-4">Amount</th>
                            <th className="text-left text-white/30 font-normal p-4">TX Hash</th>
                            <th className="text-left text-white/30 font-normal p-4">Paid At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payouts.map((payout, i) => (
                            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                              <td className="p-4">
                                <span className="font-mono text-green-400/70 text-xs">{payout.referralCode}</span>
                              </td>
                              <td className="p-4 text-right text-green-400 font-semibold">${payout.amount.toFixed(2)}</td>
                              <td className="p-4">
                                <span className="font-mono text-blue-400/70 text-xs">
                                  {payout.txHash.slice(0, 10)}...{payout.txHash.slice(-8)}
                                </span>
                              </td>
                              <td className="p-4 text-white/30 text-xs">
                                {new Date(payout.paidAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Payout Modal */}
      {payoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setPayoutModal(null); setTxHash('') }} />
          <div className="relative w-full max-w-md p-8 bg-[#0a0a12] border border-white/[0.08] rounded-2xl">
            <h3 className="text-xl font-bold mb-2">
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                Record Payout
              </span>
            </h3>
            <p className="text-white/30 text-sm mb-6">
              Code: <span className="font-mono text-green-400/70">{payoutModal.code}</span> — Amount: <span className="text-green-400 font-semibold">${payoutModal.amount.toFixed(2)}</span>
            </p>
            <div className="mb-6">
              <label className="block text-white/40 text-sm mb-2">Transaction Hash</label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/30 text-sm font-mono"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setPayoutModal(null); setTxHash('') }}
                className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white/40 hover:text-white/60 transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handlePayout}
                disabled={processing || !txHash.startsWith('0x')}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                  processing || !txHash.startsWith('0x')
                    ? 'bg-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'
                }`}
              >
                {processing ? 'Processing...' : 'Confirm Payout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <span className="text-sm font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              SweepGuard
            </span>
          </Link>
          <p className="text-white/20 text-xs">Admin Dashboard — SweepGuard © 2025</p>
        </div>
      </footer>
    </main>
  )
}
