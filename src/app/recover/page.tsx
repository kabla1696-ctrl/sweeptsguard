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

interface RecoveryStatus {
  step: 'scan' | 'confirm' | 'executing' | 'done' | 'error'
  message: string
  txHashes?: string[]
}

function RecoverContent() {
  const [privateKey, setPrivateKey] = useState('')
  const [safeAddress, setSafeAddress] = useState('')
  const [sponsorKey, setSponsorKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showSponsorKey, setShowSponsorKey] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [assets, setAssets] = useState<AssetScan | null>(null)
  const [recovery, setRecovery] = useState<RecoveryStatus | null>(null)
  const [error, setError] = useState('')

  const scanWallet = async () => {
    if (!privateKey) {
      setError('Private key required')
      return
    }

    setScanning(true)
    setError('')
    setAssets(null)

    try {
      const res = await fetch('/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan', privateKey })
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        setAssets(data)
        setRecovery({ step: 'confirm', message: 'Review assets and confirm recovery' })
      }
    } catch {
      setError('Scan failed. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  const executeRecovery = async () => {
    if (!privateKey || !safeAddress) {
      setError('Private key and safe address required')
      return
    }

    setRecovery({ step: 'executing', message: 'Creating atomic bundle...' })

    try {
      const res = await fetch('/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recover',
          privateKey,
          safeAddress,
          chainId: 1
        })
      })
      const data = await res.json()

      if (data.success) {
        setRecovery({
          step: 'done',
          message: `Recovery successful! ${data.ethRecovered || '0'} ETH recovered.`,
          txHashes: data.txHashes
        })
      } else {
        setRecovery({
          step: 'error',
          message: data.error || 'Recovery failed'
        })
      }
    } catch {
      setRecovery({ step: 'error', message: 'Recovery request failed' })
    }
  }

  const executeRevoke = async () => {
    if (!privateKey) {
      setError('Private key required')
      return
    }

    if (!sponsorKey) {
      setError('Sponsor wallet private key required — this wallet pays gas for the revoke transaction')
      return
    }

    setRecovery({ step: 'executing', message: 'Revoking ALL delegations via Flashbots atomic bundle...' })

    try {
      // Revoke ALL chains that have delegations
      const chainsToRevoke = assets?.delegations && assets.delegations.length > 0
        ? assets.delegations.map(d => d.chainId)
        : [1]

      const allResults = []
      const allErrors = []

      for (const chainId of chainsToRevoke) {
        try {
          const res = await fetch('/api/recover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'revoke',
              privateKey,
              sponsorPrivateKey: sponsorKey,
              chainId
            })
          })
          const data = await res.json()
          if (data.success) {
            allResults.push({ chainId, txHashes: data.txHashes || [] })
          } else {
            allErrors.push({ chainId, error: data.error })
          }
        } catch (err) {
          allErrors.push({ chainId, error: 'Request failed' })
        }
      }

      if (allResults.length > 0) {
        const allTxHashes = allResults.flatMap(r => r.txHashes)
        setRecovery({
          step: 'done',
          message: `Delegations revoked on ${allResults.length} chain(s)!${allErrors.length > 0 ? ` (${allErrors.length} chain(s) failed)` : ''}`,
          txHashes: allTxHashes
        })
      } else {
        setRecovery({
          step: 'error',
          message: allErrors.map(e => `Chain ${e.chainId}: ${e.error}`).join('; ')
        })
      }
    } catch {
      setRecovery({ step: 'error', message: 'Revoke request failed' })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    scanWallet()
  }

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
        <p className="text-white/40 mb-8">Recover funds from EIP-7702 compromised wallet using Flashbots atomic bundle</p>

        {/* How It Works */}
        <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-8">
          <h3 className="text-blue-400 font-semibold mb-3">🧠 How Fund Recovery Works</h3>
          <ol className="text-white/50 text-sm space-y-2 list-decimal list-inside">
            <li>Scan your compromised wallet for remaining ETH + tokens</li>
            <li>Create atomic transactions: sweep ETH → sweep tokens → revoke delegation</li>
            <li>Submit via <strong className="text-green-400">Flashbots private mempool</strong> (drainer bot can&apos;t see)</li>
            <li>All transactions execute in same block — <strong className="text-green-400">drainer can&apos;t react in time</strong></li>
            <li>Funds arrive in your safe wallet. Delegation revoked.</li>
          </ol>
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-xs font-semibold mb-1">💰 Platform Fees:</p>
            <p className="text-white/40 text-xs">• Recovered Funds: 80% → Your Safe Wallet | 20% → Platform Fee</p>
            <p className="text-white/40 text-xs">• Delegation Revoke: Fixed $40 per wallet (paid from sponsor wallet)</p>
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
                placeholder="Private key of wallet with ETH for gas (your safe wallet)"
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
            <p className="text-yellow-400/50 text-xs mt-1">Needed only for revoke — pays gas via Flashbots atomic bundle</p>
          </div>

          <button
            type="submit"
            disabled={scanning || !privateKey}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-semibold text-lg disabled:opacity-50"
          >
            {scanning ? '⏳ Scanning...' : '🔍 Scan Wallet'}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Asset Preview */}
        {assets && (
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold">📊 Recoverable Assets</h2>

            {/* Delegation Warning */}
            {assets.hasDelegation && assets.delegations && assets.delegations.length > 0 && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <span>🚨</span>
                  <span className="text-red-400 font-semibold">EIP-7702 Delegation Active — {assets.delegations.length} Chain(s)</span>
                </div>
                <div className="mt-3 space-y-2">
                  {assets.delegations.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-red-500/5 rounded-lg">
                      <div>
                        <span className="text-white/70 text-sm font-medium">{d.chainName}</span>
                        <span className="text-white/30 text-xs ml-2">→ <code className="text-white/50">{d.delegatedTo.slice(0, 10)}...{d.delegatedTo.slice(-8)}</code></span>
                      </div>
                      <span className="text-red-400 text-xs font-semibold">DRAINER</span>
                    </div>
                  ))}
                </div>
                <p className="text-green-400 text-xs mt-3">
                  ✅ ALL delegations will be revoked during recovery
                </p>
                {assets.failedChains && assets.failedChains.length > 0 && (
                  <p className="text-yellow-400/60 text-xs mt-1">
                    ⚠️ {assets.failedChains.length} chains failed (RPC error)
                  </p>
                )}
              </div>
            )}

            {/* Single delegation fallback */}
            {assets.hasDelegation && (!assets.delegations || assets.delegations.length === 0) && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <span>🚨</span>
                  <span className="text-red-400 font-semibold">EIP-7702 Delegation Active</span>
                </div>
                <p className="text-white/40 text-xs mt-1">
                  Delegated to: <code className="text-white/60">{assets.delegatedTo}</code>
                </p>
                <p className="text-green-400 text-xs mt-1">
                  ✅ Will be revoked during recovery
                </p>
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

            {assets.tokens.length === 0 && parseFloat(assets.ethFormatted) === 0 && !assets.hasDelegation && (
              <div className="text-center py-8 text-white/30">
                No recoverable assets found
              </div>
            )}

            {assets.tokens.length === 0 && parseFloat(assets.ethFormatted) === 0 && assets.hasDelegation && (
              <div className="text-center py-4">
                <p className="text-white/30 mb-2">No recoverable assets — but delegation is active!</p>
                <p className="text-yellow-400/60 text-xs">Revoke delegation to prevent future draining</p>
              </div>
            )}
          </div>
        )}

        {/* Recovery Button — has assets */}
        {recovery?.step === 'confirm' && assets && (parseFloat(assets.ethFormatted) > 0 || assets.tokens.length > 0) && (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <h3 className="text-yellow-400 font-semibold mb-2">⚡ Ready to Recover</h3>
              <p className="text-white/40 text-sm">
                This will create an atomic Flashbots bundle. All transactions execute in the same block.
                The drainer bot will NOT be able to intercept.
              </p>
            </div>

            <button
              onClick={executeRecovery}
              disabled={!safeAddress}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-lg disabled:opacity-50"
            >
              💰 Recover Funds Now
            </button>
          </div>
        )}

        {/* Revoke Only — no assets but delegation active */}
        {recovery?.step === 'confirm' && assets && parseFloat(assets.ethFormatted) === 0 && assets.tokens.length === 0 && assets.hasDelegation && assets.delegations && assets.delegations.length > 0 && (
          <div className="space-y-4">
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <h3 className="text-orange-400 font-semibold mb-2">🛡️ Revoke ALL Delegations ({assets.delegations.length} chains)</h3>
              <p className="text-white/40 text-sm">
                No funds to recover, but delegation is active on {assets.delegations.length} chain(s). Revoking prevents the drainer from stealing future deposits.
              </p>
              <div className="mt-3 space-y-1">
                {assets.delegations.map((d, i) => (
                  <div key={i} className="text-xs text-white/40">
                    • {d.chainName} → <code className="text-white/60">{d.delegatedTo.slice(0, 10)}...{d.delegatedTo.slice(-8)}</code>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-400 text-xs font-semibold">💰 Gas Requirements Per Chain:</p>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {assets.delegations.map((d, i) => {
                    const gasInfo: Record<number, { token: string; amount: string; usd: string }> = {
                      1: { token: 'ETH', amount: '0.003', usd: '~$7' },
                      8453: { token: 'ETH', amount: '0.0001', usd: '~$0.25' },
                      56: { token: 'BNB', amount: '0.001', usd: '~$0.60' },
                      42161: { token: 'ETH', amount: '0.0001', usd: '~$0.25' },
                      137: { token: 'MATIC', amount: '0.01', usd: '~$0.02' },
                      10: { token: 'ETH', amount: '0.0001', usd: '~$0.25' },
                      5000: { token: 'MNT', amount: '0.001', usd: '~$0.67' },
                      534352: { token: 'ETH', amount: '0.0001', usd: '~$0.25' },
                      100: { token: 'xDai', amount: '0.01', usd: '~$0.01' },
                      7000: { token: 'ZETA', amount: '0.01', usd: '~$0.50' },
                      1625: { token: 'G', amount: '0.01', usd: '~$0.01' },
                      1116: { token: 'CORE', amount: '0.01', usd: '~$0.10' },
                      1329: { token: 'SEI', amount: '0.01', usd: '~$0.04' },
                      80094: { token: 'BERA', amount: '0.001', usd: '~$0.50' },
                      57073: { token: 'ETH', amount: '0.0001', usd: '~$0.25' },
                      196: { token: 'OKB', amount: '0.001', usd: '~$0.50' },
                      43111: { token: 'ETH', amount: '0.0001', usd: '~$0.25' },
                      8217: { token: 'KAIA', amount: '0.01', usd: '~$0.02' },
                    }
                    const info = gasInfo[d.chainId] || { token: 'native', amount: '0.001', usd: '~$0.50' }
                    return (
                      <div key={i} className="text-xs text-white/40 flex justify-between">
                        <span>{d.chainName}</span>
                        <span className="text-yellow-400/80">{info.amount} {info.token} ({info.usd})</span>
                      </div>
                    )
                  })}
                </div>
                <p className="text-yellow-400/60 text-xs mt-2">Total sponsor wallet needs gas tokens on ALL chains above</p>
              </div>
            </div>

            <button
              onClick={executeRevoke}
              className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl font-semibold text-lg"
            >
              🚫 Revoke ALL Delegations Now
            </button>
          </div>
        )}

        {/* Recovery Status */}
        {recovery?.step === 'executing' && (
          <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center">
            <div className="inline-flex items-center gap-3 text-blue-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {recovery.message}
            </div>
          </div>
        )}

        {/* Success */}
        {recovery?.step === 'done' && (
          <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl">
            <h3 className="text-green-400 font-bold text-lg mb-2">✅ Recovery Successful!</h3>
            <p className="text-white/60 text-sm mb-4">{recovery.message}</p>
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg mb-4">
              <p className="text-green-400 text-xs font-semibold">💰 Fee Split Applied:</p>
              <p className="text-white/40 text-xs">80% → Your Safe Wallet</p>
              <p className="text-white/40 text-xs">20% → Platform Fee (SweepGuard)</p>
            </div>
            {recovery.txHashes && recovery.txHashes.length > 0 && (
              <div className="space-y-2">
                <p className="text-white/40 text-xs">Transaction Hashes:</p>
                {recovery.txHashes.map((hash, i) => (
                  <a
                    key={i}
                    href={`https://etherscan.io/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-green-400/70 text-xs font-mono hover:text-green-400"
                  >
                    {hash.slice(0, 20)}...
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {recovery?.step === 'error' && (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
            <h3 className="text-red-400 font-bold text-lg mb-2">❌ Recovery Failed</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {recovery.message.split('; ').map((msg, i) => (
                <p key={i} className="text-white/60 text-xs">• {msg}</p>
              ))}
            </div>
            <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 text-xs font-semibold">💡 Fund sponsor wallet with native gas tokens per chain, then retry.</p>
            </div>
            <button
              onClick={() => { setRecovery(null); setAssets(null) }}
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
