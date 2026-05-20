'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'

interface AssetScan {
  ethBalance: string
  ethFormatted: string
  tokens: { address: string; symbol: string; decimals: number; balanceFormatted: string }[]
  hasDelegation: boolean
  delegatedTo: string | null
  delegations?: { chainId: number; chainName: string; delegatedTo: string; isDrainer: boolean; drainerName?: string }[]
  failedChains?: number[]
  totalChainsScanned?: number
}

interface RecoveryResult {
  success: boolean
  ethRecovered?: string
  ethToUser?: string
  ethFee?: string
  tokensRecovered?: { symbol: string; amount: string; toUser: string; fee: string }[]
  delegationRevoked?: boolean
  txCount?: number
  txHashes?: string[]
  error?: string
}

type Step = 'idle' | 'scanning' | 'confirm' | 'executing' | 'done' | 'error'

function RecoverContent() {
  const [privateKey, setPrivateKey] = useState('')
  const [safeAddress, setSafeAddress] = useState('')
  const [sponsorKey, setSponsorKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showSponsorKey, setShowSponsorKey] = useState(false)
  const [step, setStep] = useState<Step>('idle')
  const [assets, setAssets] = useState<AssetScan | null>(null)
  const [result, setResult] = useState<RecoveryResult | null>(null)
  const [error, setError] = useState('')

  // ── Scan ──────────────────────────────────────────────────
  const scanWallet = async () => {
    if (!privateKey) { setError('Private key required'); return }

    setStep('scanning')
    setError('')
    setAssets(null)
    setResult(null)

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
        setAssets(data)
        setStep('confirm')
      }
    } catch {
      setError('Scan failed. Please try again.')
      setStep('idle')
    }
  }

  // ── One-Click Recover + Revoke ────────────────────────────
  const executeRecoverAndRevoke = async () => {
    if (!privateKey || !safeAddress || !sponsorKey) {
      setError('All 3 fields required: compromised key, safe address, sponsor key')
      return
    }

    setStep('executing')
    setError('')

    try {
      const res = await fetch('/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recover-and-revoke',
          privateKey,
          safeAddress,
          sponsorPrivateKey: sponsorKey,
          chainId: 1
        })
      })
      const data = await res.json()

      if (data.success) {
        setResult(data)
        setStep('done')
      } else {
        setResult(data)
        setStep('error')
        setError(data.error || 'Recovery failed')
      }
    } catch {
      setStep('error')
      setError('Request failed. Try again.')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    scanWallet()
  }

  const reset = () => {
    setStep('idle')
    setAssets(null)
    setResult(null)
    setError('')
  }

  const hasAssets = assets && (parseFloat(assets.ethFormatted) > 0 || assets.tokens.length > 0)
  const hasDelegation = assets?.hasDelegation && assets.delegations && assets.delegations.length > 0

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
        <p className="text-white/40 mb-8">Recover funds & secure your wallet — one click, one block, drainer sees nothing</p>

        {/* How It Works */}
        <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-8">
          <h3 className="text-blue-400 font-semibold mb-3">🧠 How It Works — Single Atomic Bundle</h3>
          <ol className="text-white/50 text-sm space-y-2 list-decimal list-inside">
            <li>Sponsor sends gas to your compromised wallet</li>
            <li>Sweep <strong className="text-green-400">ALL ETH</strong> → your safe wallet (80% you / 20% platform)</li>
            <li>Sweep <strong className="text-green-400">ALL tokens</strong> → your safe wallet (80/20)</li>
            <li><strong className="text-orange-400">Revoke ALL delegations</strong> on ALL chains</li>
            <li>Everything in <strong className="text-green-400">ONE block</strong> via Flashbots private mempool</li>
            <li>Drainer bot sees <strong className="text-red-400">NOTHING</strong>. Wallet is <strong className="text-green-400">CLEAN</strong>.</li>
          </ol>
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-xs font-semibold mb-1">💰 Platform Fees:</p>
            <p className="text-white/40 text-xs">• Recovered Funds: 80% → Your Safe Wallet | 20% → Platform Fee</p>
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
              onChange={(e) => setSafeAddress(e.target.value)}
              placeholder="0x... where to send recovered funds"
              className="w-full px-4 py-3 bg-green-500/5 border border-green-500/20 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
              💰 Sponsor Wallet Private Key (for gas)
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
            <p className="text-yellow-400/50 text-xs mt-1">Pays gas for the entire atomic bundle</p>
          </div>

          <button
            type="submit"
            disabled={step === 'scanning' || !privateKey}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-semibold text-lg disabled:opacity-50"
          >
            {step === 'scanning' ? '⏳ Scanning all chains...' : '🔍 Scan Wallet'}
          </button>
        </form>

        {/* Error */}
        {error && step !== 'error' && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {/* ── Asset Preview ─────────────────────────────────── */}
        {assets && step === 'confirm' && (
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold">📊 Recoverable Assets</h2>

            {/* Delegation Warning */}
            {hasDelegation && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <span>🚨</span>
                  <span className="text-red-400 font-semibold">EIP-7702 Delegation Active — {assets.delegations!.length} Chain(s)</span>
                </div>
                <div className="mt-3 space-y-2">
                  {assets.delegations!.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-red-500/5 rounded-lg">
                      <div>
                        <span className="text-white/70 text-sm font-medium">{d.chainName}</span>
                        <span className="text-white/30 text-xs ml-2">→ <code className="text-white/50">{d.delegatedTo.slice(0, 10)}...{d.delegatedTo.slice(-8)}</code></span>
                      </div>
                      <span className="text-red-400 text-xs font-semibold">DRAINER</span>
                    </div>
                  ))}
                </div>
                <p className="text-green-400 text-xs mt-3">✅ ALL delegations will be revoked in the same block</p>
              </div>
            )}

            {/* ETH */}
            {parseFloat(assets.ethFormatted) > 0 && (
              <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="text-green-400 font-semibold">ETH</span>
                    <span className="text-white/30 text-xs ml-2">Ethereum</span>
                  </div>
                  <span className="font-mono text-green-400">{parseFloat(assets.ethFormatted).toFixed(6)}</span>
                </div>
                <div className="flex justify-between text-xs text-white/40 border-t border-white/[0.05] pt-2">
                  <span>→ Your Safe Wallet (80%)</span>
                  <span className="text-green-400">{(parseFloat(assets.ethFormatted) * 0.8).toFixed(6)} ETH</span>
                </div>
                <div className="flex justify-between text-xs text-white/40 mt-1">
                  <span>→ Platform Fee (20%)</span>
                  <span className="text-yellow-400">{(parseFloat(assets.ethFormatted) * 0.2).toFixed(6)} ETH</span>
                </div>
              </div>
            )}

            {/* Tokens */}
            {assets.tokens.map((token, i) => (
              <div key={i} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="font-medium">{token.symbol}</span>
                    <span className="text-white/30 text-xs ml-2">ERC-20</span>
                  </div>
                  <span className="font-mono">{parseFloat(token.balanceFormatted).toFixed(6)}</span>
                </div>
                <div className="flex justify-between text-xs text-white/40 border-t border-white/[0.05] pt-2">
                  <span>→ Your Safe Wallet (80%)</span>
                  <span className="text-green-400">{(parseFloat(token.balanceFormatted) * 0.8).toFixed(6)} {token.symbol}</span>
                </div>
                <div className="flex justify-between text-xs text-white/40 mt-1">
                  <span>→ Platform Fee (20%)</span>
                  <span className="text-yellow-400">{(parseFloat(token.balanceFormatted) * 0.2).toFixed(6)} {token.symbol}</span>
                </div>
              </div>
            ))}

            {/* Empty state */}
            {!hasAssets && !hasDelegation && (
              <div className="text-center py-8 text-white/30">
                No recoverable assets or active delegations found
              </div>
            )}

            {/* Only delegation, no assets */}
            {!hasAssets && hasDelegation && (
              <div className="text-center py-4">
                <p className="text-white/30 mb-2">No recoverable assets — but delegation is active!</p>
                <p className="text-yellow-400/60 text-xs">Revoke delegation to prevent future draining</p>
              </div>
            )}

            {/* ── ONE-CLICK BUTTON ──────────────────────────── */}
            <div className="pt-4 space-y-3">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <h3 className="text-yellow-400 font-semibold mb-2">⚡ One-Click Recovery</h3>
                <p className="text-white/40 text-sm">
                  Everything happens in <strong className="text-green-400">ONE atomic Flashbots bundle</strong>:
                </p>
                <ul className="text-white/40 text-sm mt-2 space-y-1">
                  <li className="flex items-center gap-2"><span className="text-green-400">1.</span> Sponsor sends gas to your wallet</li>
                  <li className="flex items-center gap-2"><span className="text-green-400">2.</span> Sweep ALL ETH + tokens → safe wallet</li>
                  <li className="flex items-center gap-2"><span className="text-orange-400">3.</span> Revoke ALL delegations</li>
                  <li className="flex items-center gap-2"><span className="text-green-400">4.</span> All in ONE block — drainer sees NOTHING</li>
                </ul>
                <p className="text-green-400 text-xs mt-3 font-semibold">✅ After this, your wallet is CLEAN — safe to use again</p>
              </div>

              <button
                onClick={executeRecoverAndRevoke}
                disabled={!safeAddress || !sponsorKey}
                className="w-full py-5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-bold text-xl disabled:opacity-50 shadow-lg shadow-green-500/20"
              >
                🛡️ Recover & Secure Wallet Now
              </button>
            </div>
          </div>
        )}

        {/* ── Executing ─────────────────────────────────────── */}
        {step === 'executing' && (
          <div className="p-8 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center">
            <div className="inline-flex items-center gap-3 text-blue-400 mb-4">
              <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-lg font-semibold">Creating atomic bundle...</span>
            </div>
            <div className="space-y-2 text-sm text-white/40">
              <p>📝 Building transactions...</p>
              <p>🚀 Submitting via Flashbots (private mempool)</p>
              <p>⏳ Waiting for confirmation...</p>
            </div>
            <p className="text-blue-400/60 text-xs mt-4">All transactions execute in the same block. Drainer cannot intercept.</p>
          </div>
        )}

        {/* ── Success ───────────────────────────────────────── */}
        {step === 'done' && result && (
          <div className="space-y-4">
            <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl">
              <h3 className="text-green-400 font-bold text-xl mb-2">✅ Wallet Recovered & Secured!</h3>
              <p className="text-white/60 text-sm mb-4">All transactions executed in the same block. Drainer saw nothing.</p>

              {/* ETH recovered */}
              {result.ethRecovered && parseFloat(result.ethRecovered) > 0 && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">ETH Recovered</span>
                    <span className="text-green-400 font-mono">{parseFloat(result.ethRecovered).toFixed(6)} ETH</span>
                  </div>
                  <div className="flex justify-between text-xs text-white/40 mt-1">
                    <span>→ Your Safe Wallet</span>
                    <span className="text-green-400">{result.ethToUser} ETH</span>
                  </div>
                  <div className="flex justify-between text-xs text-white/40 mt-1">
                    <span>→ Platform Fee</span>
                    <span className="text-yellow-400">{result.ethFee} ETH</span>
                  </div>
                </div>
              )}

              {/* Tokens recovered */}
              {result.tokensRecovered && result.tokensRecovered.length > 0 && (
                <div className="space-y-2 mb-3">
                  {result.tokensRecovered.map((t, i) => (
                    <div key={i} className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">{t.symbol}</span>
                        <span className="font-mono">{parseFloat(t.amount).toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-white/40 mt-1">
                        <span>→ Your Safe Wallet</span>
                        <span className="text-green-400">{t.toUser} {t.symbol}</span>
                      </div>
                      <div className="flex justify-between text-xs text-white/40 mt-1">
                        <span>→ Platform Fee</span>
                        <span className="text-yellow-400">{t.fee} {t.symbol}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Delegation status */}
              {result.delegationRevoked && (
                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg mb-3">
                  <p className="text-orange-400 text-sm font-semibold">🚫 Delegation Revoked</p>
                  <p className="text-white/40 text-xs mt-1">Your wallet is now CLEAN — hacker has no more access</p>
                </div>
              )}

              {/* Wallet status */}
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg mb-3">
                <p className="text-green-400 text-sm font-semibold">🛡️ Wallet Status: SAFE</p>
                <p className="text-white/40 text-xs mt-1">You can use your wallet again. No more drainer access.</p>
              </div>

              {/* TX details */}
              <div className="flex justify-between text-xs text-white/40 border-t border-white/[0.05] pt-3">
                <span>Transactions in bundle</span>
                <span className="text-green-400">{result.txCount}</span>
              </div>

              {result.txHashes && result.txHashes.length > 0 && (
                <div className="mt-3 space-y-1">
                  {result.txHashes.map((hash, i) => (
                    <a
                      key={i}
                      href={`https://etherscan.io/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-green-400/70 text-xs font-mono hover:text-green-400"
                    >
                      📎 {hash.slice(0, 30)}...
                    </a>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={reset}
              className="w-full py-3 bg-white/[0.05] rounded-xl text-sm hover:bg-white/[0.08]"
            >
              Start New Recovery
            </button>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────── */}
        {step === 'error' && (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
            <h3 className="text-red-400 font-bold text-lg mb-2">❌ Recovery Failed</h3>
            <p className="text-white/60 text-sm mb-4">{error}</p>
            <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 text-xs font-semibold">💡 Common fixes:</p>
              <ul className="text-white/40 text-xs mt-1 space-y-1">
                <li>• Fund sponsor wallet with native gas tokens (ETH/BNB/MATIC)</li>
                <li>• Check that private key is correct</li>
                <li>• Try a different RPC if chain is congested</li>
              </ul>
            </div>
            <button
              onClick={reset}
              className="mt-4 px-4 py-2 bg-white/[0.05] rounded-lg text-sm"
            >
              Try Again
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
