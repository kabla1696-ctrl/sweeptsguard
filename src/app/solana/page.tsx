'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────
interface SolanaTokenBalance {
  mint: string
  symbol: string
  decimals: number
  balance: string
  balanceFormatted: string
  ata: string
}

interface SolanaDrainAlert {
  type: 'drain' | 'suspicious' | 'approval' | 'unknown'
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  txSignature: string
  timestamp: string
  amount?: string
  token?: string
  destination?: string
}

interface SolanaHackDetection {
  isCompromised: boolean
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'clean'
  alerts: SolanaDrainAlert[]
  drainedTokens: string[]
  suspiciousDestinations: string[]
  recentDrainTxs: number
  totalDrainedSOL: string
  summary: string
}

interface SolanaScanResult {
  address: string
  solBalance: string
  solBalanceFormatted: string
  tokens: SolanaTokenBalance[]
  totalTokens: number
  lastActivity: string | null
  hackDetection?: SolanaHackDetection
}

interface RecoveryResult {
  success: boolean
  solRecovered?: string
  tokensRecovered?: string[]
  txSignatures?: string[]
  error?: string
  explorerUrl?: string
  compromisedAddress?: string
  safeAddress?: string
  platformFee?: string
}

type Step = 'input' | 'scanning' | 'result' | 'recover' | 'recovering' | 'done'

function SolanaContent() {
  const [step, setStep] = useState<Step>('input')
  const [address, setAddress] = useState('')
  const [scanResult, setScanResult] = useState<SolanaScanResult | null>(null)
  const [hackDetection, setHackDetection] = useState<SolanaHackDetection | null>(null)
  const [error, setError] = useState('')

  // Recovery state
  const [privateKey, setPrivateKey] = useState('')
  const [safeAddress, setSafeAddress] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [recoveryResult, setRecoveryResult] = useState<RecoveryResult | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showGuide, setShowGuide] = useState(true)

  // ── Scan ──────────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    if (!address.trim()) {
      setError('Please enter a Solana wallet address')
      return
    }

    setStep('scanning')
    setError('')
    setScanResult(null)
    setHackDetection(null)

    try {
      const res = await fetch('/api/solana/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim() }),
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        setStep('input')
      } else {
        setScanResult(data)
        setHackDetection(data.hackDetection || null)
        setStep('result')
      }
    } catch {
      setError('Failed to scan. Please try again.')
      setStep('input')
    }
  }, [address])

  // ── Recover ───────────────────────────────────────────────
  const handleRecover = useCallback(async () => {
    if (!privateKey || !safeAddress) {
      setError('Private key and safe wallet address are required')
      return
    }

    if (!showConfirm) {
      setShowConfirm(true)
      return
    }
    setShowConfirm(false)

    setStep('recovering')
    setError('')

    try {
      const res = await fetch('/api/solana/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ safeAddress: safeAddress.trim(), privateKey }),
      })
      const data = await res.json()

      if (data.error && !data.success) {
        setError(data.error)
        setStep('recover')
      } else {
        setRecoveryResult(data)
        setStep('done')
      }
    } catch {
      setError('Recovery failed. Please try again.')
      setStep('recover')
    }
  }, [privateKey, safeAddress, showConfirm])

  // Security: clear keys on unmount
  useEffect(() => {
    return () => {
      setPrivateKey('')
    }
  }, [])

  const reset = () => {
    setStep('input')
    setAddress('')
    setScanResult(null)
    setHackDetection(null)
    setPrivateKey('')
    setSafeAddress('')
    setShowKey(false)
    setShowConfirm(false)
    setRecoveryResult(null)
    setError('')
  }

  const goToRecover = () => {
    setStep('recover')
    setError('')
  }

  // ── Risk Badge ────────────────────────────────────────────
  const RiskBadge = ({ level }: { level: string }) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      clean: 'bg-green-500/20 text-green-400 border-green-500/30',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[level] || styles.clean}`}>
        {level.toUpperCase()}
      </span>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* ── Navigation ──────────────────────────────────────── */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
            SweepGuard
          </span>
        </Link>
        <div className="flex gap-4">
          <Link href="/scan" className="text-sm text-white/50 hover:text-white transition-colors">
            EVM Scan
          </Link>
          <Link href="/solana" className="text-sm text-purple-400 font-semibold">
            ◎ Solana
          </Link>
          <Link href="/recover" className="text-sm text-white/50 hover:text-white transition-colors">
            Recover
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* ── GUIDE SECTION ──────────────────────────────────── */}
        {showGuide && step === 'input' && (
          <div className="mb-8 p-6 bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-purple-400">📖 How It Works</h2>
              <button
                onClick={() => setShowGuide(false)}
                className="text-white/30 hover:text-white/60 text-sm"
              >
                Hide ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold text-sm">
                  1
                </div>
                <div>
                  <p className="text-white/80 text-sm font-semibold">Enter Your Solana Wallet Address</p>
                  <p className="text-white/40 text-xs mt-1">
                    Paste the wallet address you want to scan. This is the public address — no private key needed for scanning.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold text-sm">
                  2
                </div>
                <div>
                  <p className="text-white/80 text-sm font-semibold">Check for Hack / Drain</p>
                  <p className="text-white/40 text-xs mt-1">
                    We analyze your last 50 transactions for suspicious activity — drain patterns, unknown transfers, known drainer programs.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold text-sm">
                  3
                </div>
                <div>
                  <p className="text-white/80 text-sm font-semibold">Recover If Compromised</p>
                  <p className="text-white/40 text-xs mt-1">
                    If your wallet is hacked, enter your private key to recover all SOL + SPL tokens to a safe wallet. Platform fee: 20% of recovered funds.
                  </p>
                </div>
              </div>

              {/* Security Note */}
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-400 text-xs">
                  🔒 <strong>Security:</strong> Your private key is NEVER stored. It is used only for signing recovery transactions and cleared immediately after.
                </p>
              </div>

              {/* Phantom Alternative */}
              <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                <p className="text-violet-400 text-xs">
                  👻 <strong>Prefer Phantom?</strong> You can also use the{' '}
                  <a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-violet-300">
                    Phantom wallet extension
                  </a>{' '}
                  to sign recovery transactions without exposing your private key.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── HEADER ──────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">◎</span>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
              Solana Rescue
            </h1>
            <p className="text-white/40 text-sm">Scan, detect hacks, and recover SOL + SPL tokens</p>
          </div>
        </div>

        <div className="my-6 border-t border-white/[0.05]" />

        {/* ── ERROR ──────────────────────────────────────────── */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
            ❌ {error}
          </div>
        )}

        {/* ── STEP: INPUT ────────────────────────────────────── */}
        {step === 'input' && (
          <div>
            <label className="block text-white/60 text-sm mb-2">Solana Wallet Address</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
                className="flex-1 px-4 py-3 bg-white/[0.03] border border-purple-500/20 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 text-sm font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              />
              <button
                onClick={handleScan}
                disabled={!address.trim()}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl font-semibold text-sm disabled:opacity-30 hover:brightness-110 transition-all"
              >
                🔍 Scan
              </button>
            </div>
            <p className="text-white/20 text-xs mt-2">Enter the public address of any Solana wallet to scan</p>
          </div>
        )}

        {/* ── STEP: SCANNING ─────────────────────────────────── */}
        {step === 'scanning' && (
          <div className="text-center py-16">
            <svg className="animate-spin h-10 w-10 text-purple-400 mx-auto mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-purple-400 font-semibold">Scanning Solana wallet...</p>
            <p className="text-white/30 text-sm mt-2">Checking SOL balance, SPL tokens, and recent transactions</p>
          </div>
        )}

        {/* ── STEP: RESULT ───────────────────────────────────── */}
        {step === 'result' && scanResult && (
          <div className="space-y-6">
            {/* SOL Balance Card */}
            <div className="p-6 bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider">SOL Balance</p>
                  <p className="text-4xl font-bold text-purple-400 mt-2">
                    ◎ {parseFloat(scanResult.solBalanceFormatted).toFixed(6)}
                  </p>
                </div>
                <span className="text-6xl opacity-30">◎</span>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-white/30">
                <span>{scanResult.solBalance} lamports</span>
                <a
                  href={`https://solscan.io/account/${scanResult.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400/50 hover:text-purple-400 transition-colors"
                >
                  View on Solscan →
                </a>
              </div>
            </div>

            {/* Hack Detection */}
            {hackDetection && (
              <div className={`p-6 border-2 rounded-2xl ${
                hackDetection.riskLevel === 'critical'
                  ? 'bg-red-500/5 border-red-500/30'
                  : hackDetection.riskLevel === 'high'
                    ? 'bg-orange-500/5 border-orange-500/30'
                    : hackDetection.riskLevel === 'medium'
                      ? 'bg-yellow-500/5 border-yellow-500/30'
                      : hackDetection.riskLevel === 'low'
                        ? 'bg-blue-500/5 border-blue-500/30'
                        : 'bg-green-500/5 border-green-500/30'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">
                    {hackDetection.isCompromised ? '🚨' : hackDetection.riskLevel === 'clean' ? '✅' : '⚠️'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold text-lg ${
                        hackDetection.riskLevel === 'critical' ? 'text-red-400'
                          : hackDetection.riskLevel === 'high' ? 'text-orange-400'
                          : hackDetection.riskLevel === 'clean' ? 'text-green-400'
                          : 'text-yellow-400'
                      }`}>
                        {hackDetection.isCompromised ? 'WALLET COMPROMISED!' : hackDetection.riskLevel === 'clean' ? 'Wallet Clean' : 'Suspicious Activity'}
                      </h3>
                      <RiskBadge level={hackDetection.riskLevel} />
                    </div>
                  </div>
                </div>

                <p className="text-white/70 text-sm mb-4">{hackDetection.summary}</p>

                {/* Drain Stats */}
                {hackDetection.recentDrainTxs > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3 bg-red-500/10 rounded-lg text-center">
                      <p className="text-red-400 text-2xl font-bold">{hackDetection.recentDrainTxs}</p>
                      <p className="text-white/40 text-xs">Drain TXs</p>
                    </div>
                    <div className="p-3 bg-red-500/10 rounded-lg text-center">
                      <p className="text-red-400 text-2xl font-bold">{parseFloat(hackDetection.totalDrainedSOL).toFixed(4)}</p>
                      <p className="text-white/40 text-xs">SOL Drained</p>
                    </div>
                    <div className="p-3 bg-red-500/10 rounded-lg text-center">
                      <p className="text-red-400 text-2xl font-bold">{hackDetection.drainedTokens.length}</p>
                      <p className="text-white/40 text-xs">Tokens Drained</p>
                    </div>
                  </div>
                )}

                {/* Alerts List */}
                {hackDetection.alerts.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-white/40 text-xs cursor-pointer hover:text-white/60">
                      View {hackDetection.alerts.length} alerts ▸
                    </summary>
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                      {hackDetection.alerts.slice(0, 10).map((alert, i) => (
                        <div key={i} className="p-2 bg-white/[0.02] rounded-lg text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              alert.severity === 'critical' ? 'bg-red-400'
                                : alert.severity === 'high' ? 'bg-orange-400'
                                : 'bg-yellow-400'
                            }`} />
                            <span className="text-white/60">{alert.description}</span>
                          </div>
                          {alert.txSignature && (
                            <a
                              href={`https://solscan.io/tx/${alert.txSignature}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400/50 hover:text-purple-400 font-mono mt-1 block"
                            >
                              TX: {alert.txSignature.slice(0, 20)}...
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* Recover Button */}
                {hackDetection.isCompromised && (
                  <button
                    onClick={goToRecover}
                    className="w-full mt-4 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-bold text-sm hover:brightness-110 transition-all"
                  >
                    🚨 Recover My Funds Now
                  </button>
                )}
              </div>
            )}

            {/* SPL Tokens */}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                SPL Tokens ({scanResult.totalTokens})
              </h2>
              {scanResult.tokens.length === 0 ? (
                <div className="text-center py-8 text-white/30 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                  No SPL tokens found
                </div>
              ) : (
                <div className="space-y-2">
                  {scanResult.tokens.map((token, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] transition-colors"
                    >
                      <div>
                        <p className="text-white/80 text-sm font-semibold font-mono">
                          {token.mint.slice(0, 6)}...{token.mint.slice(-4)}
                        </p>
                        <p className="text-white/30 text-xs">Decimals: {token.decimals}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-purple-400 font-bold">{token.balanceFormatted}</p>
                        <a
                          href={`https://solscan.io/token/${token.mint}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/20 text-xs hover:text-purple-400"
                        >
                          Explorer →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={goToRecover}
                className="flex-1 py-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 font-semibold text-sm hover:bg-red-500/30 transition-all"
              >
                💰 Recover Funds
              </button>
              <button
                onClick={reset}
                className="flex-1 py-3 bg-white/[0.05] border border-white/[0.05] rounded-xl text-white/60 font-semibold text-sm hover:bg-white/[0.08] transition-all"
              >
                🔍 Scan Another
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: RECOVER ──────────────────────────────────── */}
        {step === 'recover' && (
          <div>
            {/* Back button */}
            <button
              onClick={() => { setStep('result'); setError('') }}
              className="text-white/40 hover:text-white/60 text-sm mb-4"
            >
              ← Back to scan results
            </button>

            <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl mb-6">
              <h2 className="text-xl font-bold text-red-400 mb-2">💰 Recover SOL + SPL Tokens</h2>
              <p className="text-white/50 text-sm">
                Transfer all recoverable funds from your compromised wallet to a safe wallet.
              </p>
            </div>

            {/* Warning */}
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-6">
              <p className="text-yellow-400 text-sm font-semibold">⚠️ Important:</p>
              <ul className="text-yellow-400/70 text-xs mt-2 space-y-1 list-disc list-inside">
                <li>Use the <strong>private key</strong> of your compromised wallet</li>
                <li>Safe wallet must be a DIFFERENT wallet you control</li>
                <li>Platform fee: 20% of recovered funds</li>
                <li>Private key is NEVER stored — cleared immediately after signing</li>
              </ul>
            </div>

            {/* Safe Wallet Address */}
            <div className="mb-4">
              <label className="block text-white/60 text-sm mb-2">Safe Wallet Address (where to send funds)</label>
              <input
                type="text"
                value={safeAddress}
                onChange={(e) => setSafeAddress(e.target.value)}
                placeholder="e.g. 8xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
                className="w-full px-4 py-3 bg-white/[0.03] border border-green-500/20 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/50 text-sm font-mono"
              />
            </div>

            {/* Private Key */}
            <div className="mb-6">
              <label className="block text-white/60 text-sm mb-2">Compromised Wallet Private Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="Enter your Solana private key (base58, hex, or JSON array)"
                  className="w-full px-4 py-3 pr-12 bg-white/[0.03] border border-red-500/20 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showKey ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="text-white/20 text-xs mt-1">Supported: base58, hex (0x...), JSON array [1,2,...,64]</p>
            </div>

            {/* Confirm Dialog */}
            {showConfirm && (
              <div className="p-4 bg-red-500/10 border-2 border-red-500/30 rounded-xl mb-4">
                <p className="text-red-400 font-bold text-sm mb-2">⚠️ Confirm Recovery</p>
                <p className="text-white/60 text-xs mb-3">
                  This will transfer ALL SOL and SPL tokens from your compromised wallet to:
                </p>
                <p className="text-green-400 font-mono text-xs bg-green-500/10 p-2 rounded-lg mb-3 break-all">
                  {safeAddress}
                </p>
                <p className="text-white/40 text-xs">Platform fee: 20% of recovered SOL</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleRecover}
                    className="flex-1 py-2 bg-red-600 rounded-lg text-white font-semibold text-sm"
                  >
                    Yes, Recover Now
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-2 bg-white/[0.05] rounded-lg text-white/60 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Recover Button */}
            {!showConfirm && (
              <button
                onClick={handleRecover}
                disabled={!privateKey || !safeAddress}
                className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-bold text-sm disabled:opacity-30 hover:brightness-110 transition-all"
              >
                🚨 Recover All Funds
              </button>
            )}
          </div>
        )}

        {/* ── STEP: RECOVERING ───────────────────────────────── */}
        {step === 'recovering' && (
          <div className="text-center py-16">
            <svg className="animate-spin h-10 w-10 text-red-400 mx-auto mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-red-400 font-semibold text-lg">Recovering funds...</p>
            <p className="text-white/30 text-sm mt-2">Signing and submitting Solana transactions</p>
            <p className="text-white/20 text-xs mt-4">This may take 10-30 seconds</p>
          </div>
        )}

        {/* ── STEP: DONE ─────────────────────────────────────── */}
        {step === 'done' && recoveryResult && (
          <div className="space-y-6">
            {recoveryResult.success ? (
              <>
                <div className="p-6 bg-green-500/10 border-2 border-green-500/30 rounded-2xl text-center">
                  <span className="text-5xl">✅</span>
                  <h2 className="text-2xl font-bold text-green-400 mt-4">Recovery Successful!</h2>
                  <p className="text-white/50 text-sm mt-2">Your funds have been transferred to your safe wallet</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                    <p className="text-green-400 text-2xl font-bold">
                      ◎ {parseFloat(recoveryResult.solRecovered || '0').toFixed(6)}
                    </p>
                    <p className="text-white/40 text-xs mt-1">SOL Recovered</p>
                  </div>
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center">
                    <p className="text-blue-400 text-2xl font-bold">
                      {recoveryResult.tokensRecovered?.length || 0}
                    </p>
                    <p className="text-white/40 text-xs mt-1">Tokens Recovered</p>
                  </div>
                </div>

                {/* Platform Fee */}
                {recoveryResult.platformFee && parseFloat(recoveryResult.platformFee) > 0 && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <p className="text-purple-400 text-xs text-center">
                      Platform fee (20%): ◎ {parseFloat(recoveryResult.platformFee).toFixed(6)} — sent to SweepGuard
                    </p>
                  </div>
                )}

                {/* TX Signatures */}
                {recoveryResult.txSignatures && recoveryResult.txSignatures.length > 0 && (
                  <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                    <p className="text-white/60 text-xs font-semibold mb-2">Transaction Signatures:</p>
                    {recoveryResult.txSignatures.map((sig, i) => (
                      <a
                        key={i}
                        href={`https://solscan.io/tx/${sig}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-purple-400 text-xs font-mono hover:text-purple-300 mt-1 break-all"
                      >
                        📎 {sig}
                      </a>
                    ))}
                  </div>
                )}

                <div className="p-3 bg-green-500/5 rounded-xl">
                  <p className="text-green-400/70 text-xs text-center">
                    ✅ Verify your safe wallet on{' '}
                    <a href={`https://solscan.io/account/${safeAddress}`} target="_blank" rel="noopener noreferrer" className="underline">
                      Solscan
                    </a>
                  </p>
                </div>
              </>
            ) : (
              <div className="p-6 bg-red-500/10 border-2 border-red-500/30 rounded-2xl text-center">
                <span className="text-5xl">❌</span>
                <h2 className="text-2xl font-bold text-red-400 mt-4">Recovery Failed</h2>
                <p className="text-white/50 text-sm mt-2">{recoveryResult.error}</p>
              </div>
            )}

            <button
              onClick={reset}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl font-semibold text-sm hover:brightness-110 transition-all"
            >
              🔍 Scan Another Wallet
            </button>
          </div>
        )}

        {/* ── FOOTER INFO ────────────────────────────────────── */}
        <div className="mt-12 pt-6 border-t border-white/[0.05]">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-white/[0.02] rounded-xl">
              <p className="text-white/30 text-xs">Supported Chains</p>
              <p className="text-purple-400 font-bold mt-1">Solana Mainnet</p>
            </div>
            <div className="p-3 bg-white/[0.02] rounded-xl">
              <p className="text-white/30 text-xs">Platform Fee</p>
              <p className="text-purple-400 font-bold mt-1">20% of recovered</p>
            </div>
          </div>
          <p className="text-white/20 text-xs text-center mt-4">
            Powered by SweepGuard — Solana wallet protection
          </p>
        </div>
      </div>
    </main>
  )
}

export default function SolanaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/30">
          <div className="inline-flex items-center gap-3">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </div>
        </div>
      }
    >
      <SolanaContent />
    </Suspense>
  )
}
