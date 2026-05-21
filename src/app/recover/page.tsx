'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'

interface TokenAsset {
  address: string
  symbol: string
  decimals: number
  balance: string
  balanceFormatted: string
}

interface ChainAsset {
  chainId: number
  chainName: string
  explorerUrl: string
  gasToken: string
  ethBalance: string
  ethFormatted: string
  tokens: TokenAsset[]
}

interface Delegation {
  chainId: number
  chainName: string
  delegatedTo: string
  isDrainer: boolean
  drainerName?: string
}

interface ScanResult {
  address: string
  multiChainAssets: ChainAsset[]
  hasDelegation: boolean
  delegations: Delegation[]
  failedChains: number[]
  totalChainsScanned: number
  summary: {
    totalEthAcrossChains: string
    totalTokens: number
    chainsWithAssets: number
    chainsWithDelegation: number
    drainerDetected: boolean
  }
}

interface RevokeResult {
  chainId: number
  chainName: string
  delegatedTo: string
  isDrainer: boolean
  success: boolean
  txHashes?: string[]
  explorerUrl: string
  error?: string
}

type Step = 'idle' | 'scanning' | 'confirm' | 'executing-recover' | 'executing-revoke' | 'done-recover' | 'done-revoke' | 'error'

function RecoverContent() {
  const [privateKey, setPrivateKey] = useState('')
  const [safeAddress, setSafeAddress] = useState('')
  const [sponsorKey, setSponsorKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showSponsorKey, setShowSponsorKey] = useState(false)
  const [step, setStep] = useState<Step>('idle')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [selectedChain, setSelectedChain] = useState<number | null>(null)
  const [revokeResults, setRevokeResults] = useState<RevokeResult[]>([])
  const [error, setError] = useState('')
  const [recoveryDone, setRecoveryDone] = useState(false)
  const [revokeDone, setRevokeDone] = useState(false)
  const [safeAddressError, setSafeAddressError] = useState('')

  // Validate safe address
  const validateSafeAddress = (addr: string) => {
    if (!addr) { setSafeAddressError(''); return }
    try {
      ethers.getAddress(addr)
      setSafeAddressError('')
    } catch {
      setSafeAddressError('Invalid Ethereum address format')
    }
  }

  // ── Scan ──────────────────────────────────────────────────
  const scanWallet = async () => {
    if (!privateKey) { setError('Private key required'); return }

    setStep('scanning')
    setError('')
    setScanResult(null)
    setRevokeResults([])
    setRecoveryDone(false)
    setRevokeDone(false)
    setSelectedChain(null)

    try {
      const res = await fetch('/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan', privateKey })
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        setStep('idle')
      } else {
        setScanResult(data)
        // Auto-select first chain with assets
        if (data.multiChainAssets?.length > 0) {
          setSelectedChain(data.multiChainAssets[0].chainId)
        }
        setStep('confirm')
      }
    } catch {
      setError('Scan failed. Please try again.')
      setStep('idle')
    }
  }

  // ── Recover Funds ─────────────────────────────────────────
  const executeRecovery = async (chainId: number) => {
    if (!privateKey || !safeAddress) {
      setError('Private key and safe address required')
      return
    }
    if (safeAddressError) {
      setError('Fix safe wallet address first')
      return
    }
    if (!sponsorKey) {
      setError('Sponsor wallet private key required for gas')
      return
    }

    setStep('executing-recover')
    setError('')

    try {
      const res = await fetch('/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recover',
          privateKey,
          safeAddress,
          sponsorPrivateKey: sponsorKey,
          chainId
        })
      })
      const data = await res.json()

      if (data.success) {
        setStep('done-recover')
        setRecoveryDone(true)
      } else {
        setStep('error')
        setError(data.error || 'Recovery failed')
      }
    } catch {
      setStep('error')
      setError('Recovery request failed')
    }
  }

  // ── One-Click Revoke ALL Delegations ──────────────────────
  const executeRevokeAll = async () => {
    if (!privateKey) {
      setError('Private key required')
      return
    }
    if (!sponsorKey) {
      setError('Sponsor wallet private key required — pays gas + $40 fee per chain')
      return
    }

    setStep('executing-revoke')
    setError('')
    setRevokeResults([])

    try {
      const res = await fetch('/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke-all',
          privateKey,
          sponsorPrivateKey: sponsorKey
        })
      })
      const data = await res.json()

      if (data.revokedChains) {
        setRevokeResults(data.revokedChains)
      }

      if (data.success) {
        setStep('done-revoke')
        setRevokeDone(true)
      } else {
        setStep('error')
        setError(data.error || 'Some revokes failed')
      }
    } catch {
      setStep('error')
      setError('Revoke request failed')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    scanWallet()
  }

  const reset = () => {
    setStep('idle')
    setScanResult(null)
    setRevokeResults([])
    setError('')
    setRecoveryDone(false)
    setRevokeDone(false)
    setSelectedChain(null)
  }

  const totalDelegations = scanResult?.delegations?.length || 0
  const totalRevokeFee = totalDelegations * 40
  const selectedAsset = scanResult?.multiChainAssets?.find(a => a.chainId === selectedChain)

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
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
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">💰 Fund Recovery</h1>
        <p className="text-white/40 mb-8">Multi-chain asset recovery + one-click delegation revoke</p>

        {/* How It Works */}
        <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-8">
          <h3 className="text-blue-400 font-semibold mb-3">🧠 How It Works</h3>
          <div className="space-y-4">
            <div>
              <p className="text-green-400 text-sm font-semibold mb-1">💰 Fund Recovery (80/20 Split)</p>
              <ol className="text-white/50 text-sm space-y-1 list-decimal list-inside ml-2">
                <li>Scan ALL chains for ETH + tokens</li>
                <li>Select which chain to recover from</li>
                <li>Sponsor wallet pays gas → Flashbots atomic bundle</li>
                <li>80% → Safe Wallet | 20% → Platform Fee</li>
                <li>Drainer sees NOTHING (private mempool)</li>
              </ol>
            </div>
            <div>
              <p className="text-orange-400 text-sm font-semibold mb-1">🚫 One-Click Revoke ($40/chain)</p>
              <ol className="text-white/50 text-sm space-y-1 list-decimal list-inside ml-2">
                <li>Scans ALL chains for delegations</li>
                <li>$40 per chain from sponsor wallet → platform</li>
                <li>Gas funded from sponsor → compromised wallet</li>
                <li>Revoke ALL delegations in parallel</li>
                <li>Wallet becomes CLEAN — hacker loses access</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div>
            <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
              🔴 Compromised Wallet Private Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="Private key of compromised wallet..."
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
            <p className="text-red-400/50 text-xs mt-1">Used only for signing — never stored</p>
          </div>

          <div>
            <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
              🟢 Safe Wallet Address
            </label>
            <input
              type="text"
              value={safeAddress}
              onChange={(e) => { setSafeAddress(e.target.value); validateSafeAddress(e.target.value) }}
              placeholder="0x... where to send recovered funds"
              className={`w-full px-4 py-3 rounded-xl text-white placeholder:text-white/20 focus:outline-none text-sm font-mono ${
                safeAddressError
                  ? 'bg-red-500/5 border border-red-500/40 focus:border-red-500/60'
                  : 'bg-green-500/5 border border-green-500/20 focus:border-green-500/40'
              }`}
            />
            {safeAddressError && (
              <p className="text-red-400 text-xs mt-1">❌ {safeAddressError}</p>
            )}
          </div>

          <div>
            <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
              💰 Sponsor Wallet Private Key (for gas + fees)
            </label>
            <div className="relative">
              <input
                type={showSponsorKey ? 'text' : 'password'}
                value={sponsorKey}
                onChange={(e) => setSponsorKey(e.target.value)}
                placeholder="Private key of wallet with ETH for gas"
                className="w-full px-4 py-3 pr-20 bg-yellow-500/5 border border-yellow-500/20 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-yellow-500/40 text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSponsorKey(!showSponsorKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs"
              >
                {showSponsorKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-yellow-400/50 text-xs mt-1">Pays gas for recovery/revoke + $40 per chain revoke fee</p>
          </div>

          <button
            type="submit"
            disabled={step === 'scanning' || !privateKey}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-semibold text-lg disabled:opacity-50 hover:brightness-110 transition-all"
          >
            {step === 'scanning' ? '⏳ Scanning ALL chains...' : '🔍 Scan All Chains'}
          </button>
        </form>

        {/* Error */}
        {error && step !== 'error' && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {/* ── Scan Results ─────────────────────────────────── */}
        {scanResult && (step === 'confirm' || step === 'done-recover' || step === 'done-revoke' || step === 'executing-recover' || step === 'executing-revoke') && (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">📊 Scan Results</h3>
                <span className="text-xs text-white/30">{scanResult.totalChainsScanned} chains scanned</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <p className="text-white/40 text-xs">Total ETH (all chains)</p>
                  <p className="text-blue-400 font-semibold">{parseFloat(scanResult.summary.totalEthAcrossChains).toFixed(6)} ETH</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <p className="text-white/40 text-xs">Total Tokens</p>
                  <p className="text-green-400 font-semibold">{scanResult.summary.totalTokens} tokens</p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <p className="text-white/40 text-xs">Chains with Assets</p>
                  <p className="text-purple-400 font-semibold">{scanResult.summary.chainsWithAssets}</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <p className="text-white/40 text-xs">Active Delegations</p>
                  <p className="text-orange-400 font-semibold">{scanResult.summary.chainsWithDelegation}</p>
                </div>
              </div>

              {/* Drainer Warning */}
              {scanResult.summary.drainerDetected && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm font-semibold">🚨 KNOWN DRAINER DETECTED</p>
                  <p className="text-red-300/70 text-xs mt-1">
                    Delegation points to a known drainer contract. Recover funds IMMEDIATELY before drainer sweeps.
                  </p>
                </div>
              )}
            </div>

            {/* ── Multi-Chain Assets ───────────────────────── */}
            {scanResult.multiChainAssets && scanResult.multiChainAssets.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">💎 Assets by Chain</h3>

                {/* Chain selector tabs */}
                <div className="flex flex-wrap gap-2">
                  {scanResult.multiChainAssets.map((chain) => (
                    <button
                      key={chain.chainId}
                      onClick={() => setSelectedChain(chain.chainId)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        selectedChain === chain.chainId
                          ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400'
                          : 'bg-white/[0.03] border border-white/[0.05] text-white/50 hover:bg-white/[0.06]'
                      }`}
                    >
                      {chain.chainName}
                      {parseFloat(chain.ethFormatted) > 0 && (
                        <span className="ml-1 text-green-400">•</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Selected chain details */}
                {selectedAsset && (
                  <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-blue-400">{selectedAsset.chainName}</h4>
                      <span className="text-xs text-white/30">Gas: {selectedAsset.gasToken}</span>
                    </div>

                    {/* ETH balance */}
                    {parseFloat(selectedAsset.ethFormatted) > 0.0001 && (
                      <div className="p-3 bg-green-500/10 rounded-lg mb-3">
                        <div className="flex justify-between items-center">
                          <span className="text-white/60 text-sm">ETH Balance</span>
                          <span className="text-green-400 font-mono font-semibold">
                            {parseFloat(selectedAsset.ethFormatted).toFixed(6)} ETH
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Token balances */}
                    {selectedAsset.tokens.length > 0 ? (
                      <div className="space-y-2">
                        {selectedAsset.tokens.map((token, i) => (
                          <div key={i} className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-white/60 text-sm">{token.symbol}</span>
                              <span className="font-mono text-sm">
                                {parseFloat(token.balanceFormatted).toFixed(6)}
                              </span>
                            </div>
                            <p className="text-white/20 text-xs mt-1 font-mono">{token.address.slice(0, 20)}...</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/30 text-sm">No tokens on this chain</p>
                    )}

                    {/* Recover button for this chain */}
                    {step === 'confirm' && (
                      <button
                        onClick={() => executeRecovery(selectedAsset.chainId)}
                        disabled={!safeAddress || !!safeAddressError || !sponsorKey}
                        className="w-full mt-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold disabled:opacity-30 hover:brightness-110 transition-all"
                      >
                        💰 Recover {selectedAsset.chainName} Assets (80/20)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Delegations ──────────────────────────────── */}
            {scanResult.delegations && scanResult.delegations.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">🔗 Active Delegations</h3>
                {scanResult.delegations.map((d, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${
                    d.isDrainer
                      ? 'bg-red-500/10 border-red-500/20'
                      : 'bg-orange-500/10 border-orange-500/20'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm font-semibold">{d.chainName}</span>
                        {d.isDrainer && (
                          <span className="ml-2 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                            🚨 DRAINER
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-white/30 font-mono">{d.delegatedTo.slice(0, 10)}...</span>
                    </div>
                    {d.drainerName && (
                      <p className="text-red-400/70 text-xs mt-1">Known: {d.drainerName}</p>
                    )}
                  </div>
                ))}

                {/* One-Click Revoke All */}
                {step === 'confirm' && (
                  <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-orange-400 font-semibold">One-Click Revoke ALL</p>
                        <p className="text-white/40 text-xs">
                          Revoke {totalDelegations} delegation{totalDelegations > 1 ? 's' : ''} across {totalDelegations} chain{totalDelegations > 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 font-semibold">${totalRevokeFee} fee</p>
                        <p className="text-white/30 text-xs">$40 × {totalDelegations} chains</p>
                      </div>
                    </div>
                    <button
                      onClick={executeRevokeAll}
                      disabled={!sponsorKey}
                      className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl font-semibold disabled:opacity-30 hover:brightness-110 transition-all"
                    >
                      🚫 Revoke ALL Delegations (${totalRevokeFee} fee)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* No delegations */}
            {(!scanResult.delegations || scanResult.delegations.length === 0) && step === 'confirm' && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <p className="text-green-400 text-sm">✅ No active delegations found — wallet is clean!</p>
              </div>
            )}
          </div>
        )}

        {/* ── Executing States ─────────────────────────────── */}
        {step === 'executing-recover' && (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <h3 className="text-xl font-semibold mb-2">Recovering Funds...</h3>
            <p className="text-white/40">Submitting via Flashbots atomic bundle. Drainer can&apos;t see anything.</p>
          </div>
        )}

        {step === 'executing-revoke' && (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">🔄</div>
            <h3 className="text-xl font-semibold mb-2">Revoking ALL Delegations...</h3>
            <p className="text-white/40">Processing all chains in parallel. This may take a moment.</p>
          </div>
        )}

        {/* ── Done States ──────────────────────────────────── */}
        {step === 'done-recover' && (
          <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl mt-6">
            <h3 className="text-green-400 font-bold text-lg mb-2">✅ Recovery Submitted!</h3>
            <p className="text-white/60 text-sm mb-3">
              Funds are being sent to your safe wallet via Flashbots. Check your safe wallet in ~15 seconds.
            </p>
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <p className="text-blue-400 text-xs">Safe Wallet:</p>
              <p className="text-white/80 text-sm font-mono break-all">{safeAddress}</p>
            </div>
          </div>
        )}

        {step === 'done-revoke' && (
          <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl mt-6">
            <h3 className="text-green-400 font-bold text-lg mb-2">✅ Delegations Revoked!</h3>
            <p className="text-white/60 text-sm mb-4">
              {revokeResults.filter(r => r.success).length} of {revokeResults.length} delegations revoked. Wallet is CLEAN.
            </p>
            <div className="space-y-2">
              {revokeResults.map((r, i) => (
                <div key={i} className={`p-3 rounded-lg border ${
                  r.success ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{r.chainName}</span>
                    <span className={r.success ? 'text-green-400 text-xs' : 'text-red-400 text-xs'}>
                      {r.success ? '✅ Revoked' : `❌ ${r.error}`}
                    </span>
                  </div>
                  {r.txHashes && r.txHashes.length > 0 && r.txHashes.map((hash, j) => (
                    <a
                      key={j}
                      href={`${r.explorerUrl}/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-green-400/70 text-xs font-mono hover:text-green-400 mt-1"
                    >
                      📎 {hash.slice(0, 30)}...
                    </a>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────── */}
        {step === 'error' && (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
            <h3 className="text-red-400 font-bold text-lg mb-2">❌ Failed</h3>
            <p className="text-white/60 text-sm mb-4">{error}</p>
            <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 text-xs font-semibold">💡 Common fixes:</p>
              <ul className="text-white/40 text-xs mt-1 space-y-1">
                <li>• Fund sponsor wallet with native gas tokens (ETH/BNB/MATIC)</li>
                <li>• Check that private key is correct</li>
                <li>• Try a different RPC if chain is congested</li>
                <li>• Ensure sponsor has enough for $40 fee per chain</li>
              </ul>
            </div>
            <button
              onClick={() => { setStep('confirm'); setError('') }}
              className="mt-4 px-4 py-2 bg-white/[0.05] rounded-lg text-sm hover:bg-white/[0.08]"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Reset ─────────────────────────────────────────── */}
        {(recoveryDone || revokeDone) && (
          <div className="mt-6">
            <button
              onClick={reset}
              className="w-full py-3 bg-white/[0.05] rounded-xl text-sm hover:bg-white/[0.08]"
            >
              Start New Recovery
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

export default function RecoverPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/30">Loading...</div>}>
      <RecoverContent />
    </Suspense>
  )
}
