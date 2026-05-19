'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface ScanResult {
  address: string
  delegation: {
    hasDelegation: boolean
    delegatedTo: string | null
    isDrainer: boolean
    drainerName?: string
  }
  delegations: { chainId: number; chainName: string; delegatedTo: string; isDrainer: boolean; drainerName?: string }[]
  recentDrains: { chainId: number; chainName: string; to: string; value: string; timestamp: string; txHash: string }[]
  suspiciousApprovals: { chainId: number; chainName: string; token: string; spender: string; amount: string; isDrainer: boolean }[]
  drainerMethodCalls: { chainId: number; chainName: string; method: string; to: string; txHash: string; timestamp: string }[]
  assets: {
    type: string
    symbol: string
    balance: string
    balanceFormatted: string
    chainId: number
    chainName: string
  }[]
  chains: number[]
  totalChainsScanned?: number
  failedChains?: number[]
  lastActivity: string | null
}

function ScanContent() {
  const searchParams = useSearchParams()
  const addressParam = searchParams.get('address')

  const [address, setAddress] = useState(addressParam || '')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')

  const scanWallet = useCallback(async (addr: string) => {
    if (!addr || !addr.startsWith('0x') || addr.length !== 42) {
      setError('Please enter a valid EVM address')
      return
    }

    setScanning(true)
    setError('')
    setResult(null)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60s timeout
      
      const res = await fetch(`/api/scan?address=${addr}`, {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        setResult(data)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Scan timed out after 60 seconds. Some chains may be slow. Try again.')
      } else {
        setError('Failed to scan wallet. Please try again.')
      }
    } finally {
      setScanning(false)
    }
  }, [])

  useEffect(() => {
    if (addressParam) {
      scanWallet(addressParam)
    }
  }, [addressParam, scanWallet])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    scanWallet(address)
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
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Wallet Scanner</h1>
        <p className="text-white/40 mb-8">Check for EIP-7702 delegations and wallet assets</p>

        {/* Scan Form */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter wallet address (0x...)"
            className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm"
          />
          <button
            type="submit"
            disabled={scanning}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50"
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
            <div className="inline-flex items-center gap-3 text-green-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scanning all chains...
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Delegation Warning */}
            {result.delegation.hasDelegation && (
              <div className={`p-5 rounded-2xl border ${
                result.delegation.isDrainer
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-yellow-500/10 border-yellow-500/30'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{result.delegation.isDrainer ? '🚨' : '⚠️'}</span>
                  <div>
                    <h3 className={`font-bold text-lg ${
                      result.delegation.isDrainer ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {result.delegation.isDrainer ? 'KNOWN DRAINER DETECTED' : 'EIP-7702 Delegation Found'}
                    </h3>
                    <p className="text-white/50 text-sm mt-1">
                      Delegated to: <code className="text-white/70">{result.delegation.delegatedTo}</code>
                    </p>
                    {result.delegation.drainerName && (
                      <p className="text-red-300 text-sm mt-1 font-medium">
                        ⚠️ {result.delegation.drainerName}
                      </p>
                    )}
                    <p className="text-white/40 text-xs mt-3">
                      This wallet has delegated execution to another contract. If you didn&apos;t authorize this, your wallet is compromised.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Assets */}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Assets Found ({result.assets.length})
              </h2>
              {result.assets.length === 0 ? (
                <div className="text-center py-8 text-white/30">
                  No assets found on scanned chains
                </div>
              ) : (
                <div className="space-y-2">
                  {result.assets.map((asset, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                      <div>
                        <span className="font-medium">{asset.symbol}</span>
                        <span className="text-white/30 text-xs ml-2">{asset.chainName}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm">{parseFloat(asset.balanceFormatted).toFixed(6)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Multi-Chain Delegations */}
            {result.delegations && result.delegations.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  🚨 Active Delegations ({result.delegations.length} chains)
                </h2>
                <div className="space-y-2">
                  {result.delegations.map((d, i) => (
                    <div key={i} className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-red-400 font-semibold">{d.chainName}</span>
                          {d.drainerName && (
                            <span className="text-red-300 text-xs ml-2">({d.drainerName})</span>
                          )}
                        </div>
                        <code className="text-white/50 text-xs">{d.delegatedTo.slice(0, 10)}...{d.delegatedTo.slice(-8)}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Drainer Method Calls (NEW) */}
            {result.drainerMethodCalls && result.drainerMethodCalls.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  🔴 Drainer Method Calls Detected ({result.drainerMethodCalls.length})
                </h2>
                <div className="space-y-2">
                  {result.drainerMethodCalls.map((call, i) => (
                    <div key={i} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-red-400 font-semibold text-sm">{call.method}</span>
                          <span className="text-white/30 text-xs ml-2">{call.chainName}</span>
                          <p className="text-white/40 text-xs mt-1">
                            To: <code className="text-white/60">{call.to.slice(0, 10)}...{call.to.slice(-8)}</code>
                          </p>
                          <p className="text-white/30 text-xs">
                            {new Date(call.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <a
                          href={`https://etherscan.io/tx/${call.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-400 text-xs hover:underline"
                        >
                          View TX →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suspicious Approvals (NEW) */}
            {result.suspiciousApprovals && result.suspiciousApprovals.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  ⚠️ Suspicious Approvals ({result.suspiciousApprovals.length})
                </h2>
                <div className="space-y-2">
                  {result.suspiciousApprovals.map((approval, i) => (
                    <div key={i} className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-orange-400 font-semibold text-sm">
                            {approval.isDrainer ? '🚨 DRAINER APPROVAL' : '⚠️ Max Approval'}
                          </span>
                          <span className="text-white/30 text-xs ml-2">{approval.chainName}</span>
                          <p className="text-white/40 text-xs mt-1">
                            Token: <code className="text-white/60">{approval.token.slice(0, 10)}...{approval.token.slice(-8)}</code>
                          </p>
                          <p className="text-white/40 text-xs">
                            Spender: <code className="text-white/60">{approval.spender.slice(0, 10)}...{approval.spender.slice(-8)}</code>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Drain Transactions */}
            {result.recentDrains && result.recentDrains.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  💸 Recent Outgoing Transfers ({result.recentDrains.length})
                </h2>
                <div className="space-y-2">
                  {result.recentDrains.map((tx, i) => (
                    <div key={i} className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-yellow-400 text-sm">{tx.chainName}</span>
                          <p className="text-white/40 text-xs mt-1">
                            To: <code className="text-white/60">{tx.to.slice(0, 10)}...{tx.to.slice(-8)}</code>
                          </p>
                          <p className="text-white/30 text-xs">
                            {new Date(tx.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <a
                          href={`https://etherscan.io/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 text-xs hover:underline"
                        >
                          View TX →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last Activity */}
            {result.lastActivity && (
              <div className="text-center text-white/30 text-sm">
                Last activity: {new Date(result.lastActivity).toLocaleString()}
              </div>
            )}

            {/* Scan Status */}
            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Chains scanned:</span>
                <span className="text-white/70 font-medium">{result.totalChainsScanned || 15} / 15</span>
              </div>
              {result.failedChains && result.failedChains.length > 0 && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-yellow-400/60">Failed chains:</span>
                  <span className="text-yellow-400/80 font-medium">{result.failedChains.length} (RPC error)</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-white/40">Delegations found:</span>
                <span className={`font-medium ${result.delegations.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {result.delegations.length} / {result.totalChainsScanned || 15} chains
                </span>
              </div>
            </div>

            {/* Next Steps */}
            <div className="p-6 bg-green-500/5 border border-green-500/20 rounded-2xl">
              <h3 className="font-bold text-green-400 mb-3">🛡️ Protect This Wallet</h3>
              <p className="text-white/50 text-sm mb-4">
                Set up auto-sweep protection to automatically transfer any incoming funds to your safe wallet.
              </p>
              <Link
                href={`/dashboard?address=${result.address}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm hover:from-green-500 hover:to-emerald-500 transition-all"
              >
                Set Up Protection →
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/30">
        <div className="inline-flex items-center gap-3">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      </div>
    }>
      <ScanContent />
    </Suspense>
  )
}
