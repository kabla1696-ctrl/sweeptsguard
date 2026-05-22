'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'

interface SolanaTokenBalance {
  mint: string
  symbol: string
  decimals: number
  balance: string
  balanceFormatted: string
  ata: string
}

interface SolanaScanResult {
  address: string
  solBalance: string
  solBalanceFormatted: string
  tokens: SolanaTokenBalance[]
  totalTokens: number
  lastActivity: string | null
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
}

type Tab = 'scan' | 'recover'

function SolanaContent() {
  const [tab, setTab] = useState<Tab>('scan')
  const [address, setAddress] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<SolanaScanResult | null>(null)
  const [error, setError] = useState('')

  // Recovery state
  const [privateKey, setPrivateKey] = useState('')
  const [safeAddress, setSafeAddress] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const [recoveryResult, setRecoveryResult] = useState<RecoveryResult | null>(null)
  const [showConfirmRecover, setShowConfirmRecover] = useState(false)

  // ── Scan ──────────────────────────────────────────────────
  const scanWallet = useCallback(async (addr: string) => {
    if (!addr) {
      setError('Please enter a Solana address')
      return
    }

    setScanning(true)
    setError('')
    setScanResult(null)

    try {
      const res = await fetch('/api/solana/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        setScanResult(data)
      }
    } catch {
      setError('Failed to scan Solana wallet. Please try again.')
    } finally {
      setScanning(false)
    }
  }, [])

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    scanWallet(address)
  }

  // ── Recover ───────────────────────────────────────────────
  const executeRecovery = async () => {
    if (!privateKey || !safeAddress) {
      setError('Private key and safe address are required')
      return
    }

    if (!showConfirmRecover) {
      setShowConfirmRecover(true)
      return
    }
    setShowConfirmRecover(false)

    setRecovering(true)
    setError('')
    setRecoveryResult(null)

    try {
      const res = await fetch('/api/solana/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ safeAddress, privateKey }),
      })
      const data = await res.json()

      if (data.error && !data.success) {
        setError(data.error)
      } else {
        setRecoveryResult(data)
      }
    } catch {
      setError('Recovery request failed. Please try again.')
    } finally {
      setRecovering(false)
    }
  }

  const handleRecoverSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    executeRecovery()
  }

  // Security: clear keys on unmount
  useEffect(() => {
    return () => {
      setPrivateKey('')
    }
  }, [])

  const reset = () => {
    setPrivateKey('')
    setSafeAddress('')
    setShowKey(false)
    setShowConfirmRecover(false)
    setRecovering(false)
    setRecoveryResult(null)
    setError('')
  }

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
          <Link href="/scan" className="text-sm text-white/50 hover:text-white transition-colors">EVM Scan</Link>
          <Link href="/solana" className="text-sm text-purple-400/70 hover:text-purple-400 transition-colors font-semibold">◎ Solana</Link>
          <Link href="/recover" className="text-sm text-white/50 hover:text-white transition-colors">Recover</Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">◎</span>
          <h1 className="text-3xl font-bold">Solana Scanner</h1>
        </div>
        <p className="text-white/40 mb-8">Scan Solana wallets for SOL balance + SPL tokens. Recover compromised wallets.</p>

        {/* Tab Selector */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => { setTab('scan'); setError('') }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === 'scan'
                ? 'bg-purple-500/20 border border-purple-500/40 text-purple-400'
                : 'bg-white/[0.03] border border-white/[0.05] text-white/50 hover:bg-white/[0.06]'
            }`}
          >
            🔍 Scan Wallet
          </button>
          <button
            onClick={() => { setTab('recover'); setError('') }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === 'recover'
                ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                : 'bg-white/[0.03] border border-white/[0.05] text-white/50 hover:bg-white/[0.06]'
            }`}
          >
            💰 Recover Funds
          </button>
        </div>

        {/* ── SCAN TAB ──────────────────────────────────────── */}
        {tab === 'scan' && (
          <div>
            {/* Scan Form */}
            <form onSubmit={handleScanSubmit} className="flex gap-2 mb-8">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter Solana address (base58...)"
                aria-label="Solana wallet address to scan"
                className="flex-1 px-4 py-3 bg-white/[0.03] border border-purple-500/20 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/40 text-sm font-mono"
              />
              <button
                type="submit"
                disabled={scanning}
                aria-label="Scan Solana wallet"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl font-semibold text-sm disabled:opacity-50 hover:brightness-110 transition-all"
              >
                {scanning ? 'Scanning...' : 'Scan'}
              </button>
            </form>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
                {error}
              </div>
            )}

            {/* Loading */}
            {scanning && (
              <div className="text-center py-12">
                <div className="inline-flex items-center gap-3 text-purple-400">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Scanning Solana wallet...
                </div>
              </div>
            )}

            {/* Scan Results */}
            {scanResult && (
              <div className="space-y-6">
                {/* SOL Balance */}
                <div className="p-5 bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-wider">SOL Balance</p>
                      <p className="text-3xl font-bold text-purple-400 mt-1">
                        ◎ {parseFloat(scanResult.solBalanceFormatted).toFixed(6)}
                      </p>
                    </div>
                    <span className="text-5xl">◎</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-white/30">
                    <span>Raw: {scanResult.solBalance} lamports</span>
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
                          className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl"
                        >
                          <div>
                            <span className="font-medium text-purple-300">{token.symbol}</span>
                            <p className="text-white/20 text-xs font-mono mt-1">
                              Mint: {token.mint.slice(0, 8)}...{token.mint.slice(-6)}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-sm">{parseFloat(token.balanceFormatted).toFixed(6)}</div>
                            <p className="text-white/20 text-xs">{token.decimals} decimals</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Last Activity */}
                {scanResult.lastActivity && (
                  <div className="text-center text-white/30 text-sm">
                    Last activity: {new Date(scanResult.lastActivity).toLocaleString()}
                  </div>
                )}

                {/* Recovery CTA */}
                <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl">
                  <h3 className="font-bold text-red-400 mb-3">🚨 Compromised Wallet?</h3>
                  <p className="text-white/50 text-sm mb-4">
                    If this wallet is compromised, recover funds immediately to your safe wallet.
                  </p>
                  <button
                    onClick={() => setTab('recover')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-semibold text-sm hover:brightness-110 transition-all"
                  >
                    💰 Recover Funds →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── RECOVER TAB ───────────────────────────────────── */}
        {tab === 'recover' && (
          <div>
            {/* How It Works */}
            <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-8">
              <h3 className="text-blue-400 font-semibold mb-3">🧠 How Solana Recovery Works</h3>
              <ol className="text-white/50 text-sm space-y-2 list-decimal list-inside">
                <li>Enter the <strong className="text-white/70">private key</strong> of the compromised Solana wallet</li>
                <li>Enter your <strong className="text-white/70">safe wallet</strong> address (where funds will be sent)</li>
                <li>We sweep <strong className="text-white/70">SOL balance + all SPL tokens</strong> to your safe wallet</li>
                <li>Phantom wallet integration available for browser-based signing</li>
              </ol>
              <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/10 rounded-lg">
                <p className="text-yellow-400/70 text-xs">
                  ⚠️ Solana uses <strong>ed25519</strong> keys (not secp256k1). Addresses are <strong>base58</strong> encoded.
                  Private keys can be base58, JSON byte array, or hex format.
                </p>
              </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmRecover && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="max-w-md mx-4 p-6 bg-[#1a1a2e] border border-yellow-500/30 rounded-2xl">
                  <h3 className="text-yellow-400 font-bold text-lg mb-3">⚠️ Security Confirmation</h3>
                  <p className="text-white/60 text-sm mb-4">
                    Your Solana private key will be used to sign recovery transactions. This transfers all SOL and SPL tokens from the compromised wallet to your safe wallet.
                  </p>
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg mb-4">
                    <p className="text-green-400 text-xs">✅ Key is NEVER stored on server</p>
                    <p className="text-green-400 text-xs">✅ Used only for this recovery operation</p>
                    <p className="text-green-400 text-xs">✅ Transmitted over HTTPS only</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowConfirmRecover(false); executeRecovery() }}
                      className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold hover:brightness-110 transition-all"
                    >
                      ✅ Yes, Recover
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmRecover(false)}
                      className="flex-1 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-sm hover:bg-white/[0.08]"
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recovery Form */}
            <form onSubmit={handleRecoverSubmit} className="space-y-4 mb-8">
              <div>
                <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                  🔴 Compromised Wallet Private Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="Base58, JSON array, or hex private key..."
                    className="w-full px-4 py-3 pr-20 bg-red-500/5 border border-red-500/20 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/40 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs"
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-red-400/50 text-xs mt-1">Used only for signing recovery transactions — never stored</p>
              </div>

              <div>
                <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                  🟢 Safe Wallet Address
                </label>
                <input
                  type="text"
                  value={safeAddress}
                  onChange={(e) => setSafeAddress(e.target.value)}
                  placeholder="Your safe Solana address (base58...)"
                  className="w-full px-4 py-3 bg-green-500/5 border border-green-500/20 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={recovering || !privateKey || !safeAddress}
                className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-semibold text-lg disabled:opacity-30 hover:brightness-110 transition-all"
              >
                {recovering ? '⏳ Recovering...' : '💰 Recover All Funds'}
              </button>
            </form>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
                {error}
              </div>
            )}

            {/* Recovery Results */}
            {recoveryResult && (
              <div className="space-y-4">
                {recoveryResult.success ? (
                  <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <h3 className="text-green-400 font-bold text-lg mb-2">✅ Recovery Successful!</h3>

                    {recoveryResult.solRecovered && parseFloat(recoveryResult.solRecovered) > 0 && (
                      <div className="p-3 bg-purple-500/10 rounded-lg mb-3">
                        <p className="text-purple-400 text-xs font-semibold">SOL Recovered:</p>
                        <p className="text-purple-400 text-lg font-mono">◎ {recoveryResult.solRecovered}</p>
                      </div>
                    )}

                    {recoveryResult.tokensRecovered && recoveryResult.tokensRecovered.length > 0 && (
                      <div className="p-3 bg-blue-500/10 rounded-lg mb-3">
                        <p className="text-blue-400 text-xs font-semibold">
                          SPL Tokens Recovered: {recoveryResult.tokensRecovered.length}
                        </p>
                        {recoveryResult.tokensRecovered.map((mint, i) => (
                          <p key={i} className="text-blue-300/70 text-xs font-mono mt-1">
                            📎 {mint}
                          </p>
                        ))}
                      </div>
                    )}

                    {recoveryResult.txSignatures && recoveryResult.txSignatures.length > 0 && (
                      <div className="p-3 bg-green-500/10 rounded-lg mb-3">
                        <p className="text-green-400 text-xs font-semibold mb-2">Transaction Signatures:</p>
                        {recoveryResult.txSignatures.map((sig, i) => (
                          <a
                            key={i}
                            href={`https://solscan.io/tx/${sig}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-green-400/70 text-xs font-mono hover:text-green-400 mt-1"
                          >
                            📎 {sig.slice(0, 40)}...
                          </a>
                        ))}
                      </div>
                    )}

                    <p className="text-green-400/50 text-xs">
                      ✅ Verify your safe wallet balance on Solscan to confirm recovery.
                    </p>
                  </div>
                ) : (
                  <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <h3 className="text-red-400 font-bold text-lg mb-2">❌ Recovery Failed</h3>
                    <p className="text-white/60 text-sm">{recoveryResult.error}</p>
                  </div>
                )}

                <button
                  onClick={reset}
                  className="w-full py-3 bg-white/[0.05] rounded-xl text-sm hover:bg-white/[0.08]"
                >
                  Start New Recovery
                </button>
              </div>
            )}

            {/* Phantom Wallet Info */}
            <div className="mt-8 p-5 bg-purple-500/5 border border-purple-500/10 rounded-xl">
              <h3 className="text-purple-400 font-semibold mb-3">👻 Phantom Wallet Integration</h3>
              <p className="text-white/40 text-sm mb-3">
                For browser-based recovery without exposing private keys, use the Phantom wallet extension.
              </p>
              <ol className="text-white/30 text-sm space-y-1 list-decimal list-inside">
                <li>Install <a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Phantom wallet</a></li>
                <li>Import your compromised wallet into Phantom</li>
                <li>Use the browser extension to sign recovery transactions</li>
                <li>Private key stays in Phantom — never touches the server</li>
              </ol>
            </div>
          </div>
        )}
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
