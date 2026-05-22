'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  generateReferralCode,
  buildReferralLink,
  loadReferralStats,
  saveReferralStats,
  initReferralTracking,
  calculateCommission,
  type ReferralStats,
  type ReferralRecord,
} from '@/lib/referral'

export default function ReferralPage() {
  const [referralCode, setReferralCode] = useState<string>('')
  const [referralLink, setReferralLink] = useState<string>('')
  const [stats, setStats] = useState<ReferralStats>({ totalReferrals: 0, totalEarned: 0, referrals: [] })
  const [copied, setCopied] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [registering, setRegistering] = useState(false)
  const [registered, setRegistered] = useState(false)

  useEffect(() => {
    initReferralTracking()

    // Load or generate referral code
    const saved = localStorage.getItem('sweeptsguard_my_referral_code')
    if (saved) {
      setReferralCode(saved)
      setReferralLink(buildReferralLink(saved))
    } else {
      const code = generateReferralCode()
      localStorage.setItem('sweeptsguard_my_referral_code', code)
      setReferralCode(code)
      setReferralLink(buildReferralLink(code))
    }

    // Load stats
    const stored = loadReferralStats()
    setStats(stored)
  }, [])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for non-HTTPS
      const textarea = document.createElement('textarea')
      textarea.value = referralLink
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [referralLink])

  const handleShareTwitter = useCallback(() => {
    const text = encodeURIComponent(
      `🛡️ Protect your crypto wallet with SweepGuard! Recover tokens, NFTs & airdrops from compromised wallets across 33+ chains.\n\n${referralLink}`
    )
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
  }, [referralLink])

  const handleShareTelegram = useCallback(() => {
    const text = encodeURIComponent(
      `🛡️ Protect your crypto wallet with SweepGuard! Recover tokens, NFTs & airdrops from compromised wallets across 33+ chains.`
    )
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${text}`, '_blank')
  }, [referralLink])

  const handleRegister = useCallback(async () => {
    if (!walletAddress.trim() || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress.trim())) {
      return
    }
    setRegistering(true)
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralCode,
          walletAddress: walletAddress.trim(),
        }),
      })
      if (res.ok) {
        setRegistered(true)
        // Add to local stats
        const newRecord: ReferralRecord = {
          code: referralCode,
          walletAddress: walletAddress.trim(),
          referredAt: new Date().toISOString(),
          commissionEarned: 0,
        }
        const updated: ReferralStats = {
          totalReferrals: stats.totalReferrals + 1,
          totalEarned: stats.totalEarned,
          referrals: [...stats.referrals, newRecord],
        }
        setStats(updated)
        saveReferralStats(updated)
      }
    } catch {
      // Silently handle — will still work locally
    } finally {
      setRegistering(false)
    }
  }, [walletAddress, referralCode, stats])

  return (
    <main className="min-h-screen bg-[#0a0a1a] text-white relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[-10%] w-[600px] h-[600px] rounded-full bg-green-600/10 blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/8 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            SweepGuard
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link href="/scan" className="text-sm text-white/50 hover:text-green-400 transition-colors">Scan</Link>
          <Link href="/landing" className="text-sm text-white/50 hover:text-green-400 transition-colors">Landing</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-green-400 transition-colors">Dashboard</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-12 pb-24">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            5% Commission on Platform Fees
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              Earn With Referrals
            </span>
          </h1>
          <p className="text-white/40 max-w-xl mx-auto">
            Share SweepGuard with others and earn 5% of platform fees from every recovery they make.
          </p>
        </div>

        {/* Referral Link Card */}
        <div className="p-8 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] rounded-2xl mb-8">
          <h2 className="text-lg font-semibold mb-4">Your Referral Link</h2>
          <div className="flex gap-2 p-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl mb-4">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 px-4 py-3 bg-transparent text-white/70 text-sm focus:outline-none font-mono"
            />
            <button
              onClick={handleCopy}
              className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                copied
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'
              }`}
            >
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
          <div className="flex items-center gap-2 text-white/30 text-xs">
            <span className="font-mono bg-white/[0.05] px-2 py-1 rounded text-green-400/70">{referralCode}</span>
            <span>— Your unique referral code</span>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="flex gap-4 mb-12">
          <button
            onClick={handleShareTwitter}
            className="flex-1 flex items-center justify-center gap-2 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-blue-500/30 hover:bg-blue-500/5 transition-all"
          >
            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="text-sm font-medium text-blue-400">Share on X</span>
          </button>
          <button
            onClick={handleShareTelegram}
            className="flex-1 flex items-center justify-center gap-2 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-sky-500/30 hover:bg-sky-500/5 transition-all"
          >
            <svg className="w-5 h-5 text-sky-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.504-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            <span className="text-sm font-medium text-sky-400">Share on Telegram</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] rounded-2xl text-center">
            <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              {stats.totalReferrals}
            </div>
            <div className="text-white/30 text-sm mt-1">Total Referrals</div>
          </div>
          <div className="p-6 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] rounded-2xl text-center">
            <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              ${stats.totalEarned.toFixed(2)}
            </div>
            <div className="text-white/30 text-sm mt-1">Total Earned</div>
          </div>
          <div className="p-6 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] rounded-2xl text-center">
            <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              5%
            </div>
            <div className="text-white/30 text-sm mt-1">Commission Rate</div>
          </div>
        </div>

        {/* Register Referral */}
        <div className="p-8 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] rounded-2xl mb-12">
          <h2 className="text-lg font-semibold mb-2">Register Your Wallet</h2>
          <p className="text-white/30 text-sm mb-6">
            Connect your wallet address to track referrals and receive commission payouts.
          </p>
          <div className="flex gap-2 p-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl mb-4">
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Enter your wallet address (0x...)"
              className="flex-1 px-4 py-3 bg-transparent text-white placeholder:text-white/20 focus:outline-none text-sm"
            />
            <button
              onClick={handleRegister}
              disabled={registering || registered}
              className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                registered
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : registering
                  ? 'bg-white/10 text-white/30 cursor-wait'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'
              }`}
            >
              {registered ? '✓ Registered' : registering ? 'Registering...' : 'Register'}
            </button>
          </div>
          {registered && (
            <p className="text-green-400/70 text-xs">✓ Wallet registered! Commissions will be tracked automatically.</p>
          )}
        </div>

        {/* Commission History */}
        <div className="p-8 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] rounded-2xl">
          <h2 className="text-lg font-semibold mb-6">Commission History</h2>
          {stats.referrals.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-white/30 text-sm">No referrals yet. Share your link to start earning!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-white/30 font-normal pb-3 pr-4">Code</th>
                    <th className="text-left text-white/30 font-normal pb-3 pr-4">Wallet</th>
                    <th className="text-left text-white/30 font-normal pb-3 pr-4">Date</th>
                    <th className="text-right text-white/30 font-normal pb-3">Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.referrals.map((ref, i) => (
                    <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="py-3 pr-4">
                        <span className="font-mono text-green-400/70 text-xs">{ref.code}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="font-mono text-white/50 text-xs">
                          {ref.walletAddress.slice(0, 6)}...{ref.walletAddress.slice(-4)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-white/30 text-xs">
                        {new Date(ref.referredAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right text-green-400/70 text-xs">
                        ${ref.commissionEarned.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* How Commission Works */}
        <div className="mt-12 p-8 bg-gradient-to-br from-green-500/5 to-emerald-500/5 border border-green-500/10 rounded-2xl">
          <h2 className="text-lg font-semibold mb-4">How Commission Works</h2>
          <div className="space-y-3 text-sm text-white/40">
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-0.5">1.</span>
              <p>Share your referral link with anyone who needs wallet recovery.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-0.5">2.</span>
              <p>When they use SweepGuard to recover tokens, a 20% platform fee is charged on the recovered amount.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-0.5">3.</span>
              <p>You earn <strong className="text-white/60">5% of that platform fee</strong> — automatically tracked and paid out.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-0.5">Example:</span>
              <p>If your referral recovers $10,000 → platform fee is $2,000 → you earn <strong className="text-white/60">$100</strong>.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <span className="text-sm font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              SweepGuard
            </span>
          </Link>
          <p className="text-white/20 text-xs">Built by SweepGuard Team</p>
        </div>
      </footer>
    </main>
  )
}
