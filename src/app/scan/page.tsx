'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getExplorerUrl } from '@/lib/validation'
import AddressInput from '@/components/AddressInput'

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
  privateKeyCompromised?: { isCompromised: boolean; drainerAddresses: string[]; affectedChains: string[]; method: string }
  assets: {
    type: string
    symbol: string
    balance: string
    balanceFormatted: string
    chainId: number
    chainName: string
  }[]
  nfts?: {
    contractAddress: string
    tokenId: string
    tokenType: 'ERC-721' | 'ERC-1155'
    name: string
    symbol: string
    collection: string
    tokenURI?: string
    image?: string
    amount?: string
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
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  // Cleanup: abort any in-flight fetch on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const scanWallet = useCallback(async (addr: string) => {
    if (!addr || !/^0x[0-9a-fA-F]{40}$/.test(addr)) {
      setError('Please enter a valid EVM address')
      return
    }

    // Abort previous in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setScanning(true)
    setError('')
    setResult(null)

    try {
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60s timeout
      
      const res = await fetch(`/api/scan?address=${addr}`, {
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      // Don't update state if this request was superseded
      if (controller.signal.aborted) return

      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        setResult(data)

        // Fetch NFTs in background
        fetch(`/api/nft?address=${addr}`)
          .then(r => r.json())
          .then(nftData => {
            if (nftData.nfts) {
              setResult(prev => prev ? { ...prev, nfts: nftData.nfts } : prev)
            }
          })
          .catch(() => {})
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Scan timed out after 60 seconds. Some chains may be slow. Try again.')
      } else {
        setError('Failed to scan wallet. Please try again.')
      }
    } finally {
      if (!controller.signal.aborted) setScanning(false)
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
        <p className="text-white/40 mb-4">Check for suspicious permissions (delegations) and wallet assets</p>
        
        {/* Quick guide */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-8">
          <p className="text-blue-400 text-sm font-semibold mb-2">📋 What this scan checks:</p>
          <ul className="text-white/50 text-xs space-y-1">
            <li>• <strong className="text-white/70">Delegations</strong> — has someone else been given control of your wallet? ("EIP-7702" permissions)</li>
            <li>• <strong className="text-white/70">Assets</strong> — ETH and tokens left across all 32+ chains</li>
            <li>• <strong className="text-white/70">NFTs</strong> — any collectibles still in the wallet</li>
            <li>• <strong className="text-white/70">Drainer activity</strong> — recent suspicious transactions and approvals</li>
          </ul>
        </div>

        {/* Scan Form */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
          <div className="flex-1">
            <AddressInput
              value={address}
              onChange={setAddress}
              onResolved={setResolvedAddress}
              placeholder="Enter wallet address (0x...) or ENS name (vitalik.eth)"
              chainId={1}
              inputClassName="text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={scanning}
            aria-label="Scan wallet address"
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
                      This wallet has given another contract permission to move funds. If you didn&apos;t authorize this, your wallet is compromised — someone else can drain it.
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

            {/* NFTs */}
            {result.nfts && result.nfts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">
                    🖼️ NFTs Found ({result.nfts.length})
                  </h2>
                  <Link
                    href={`/nft?address=${result.address}`}
                    className="text-green-400 text-sm hover:underline"
                  >
                    Full NFT Rescue →
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {result.nfts.map((nft, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden">
                      <div className="aspect-square bg-white/[0.03] flex items-center justify-center">
                        {nft.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-3xl opacity-30">🖼️</span>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium truncate">{nft.name}</p>
                        <p className="text-white/30 text-[10px] truncate">{nft.collection}</p>
                        <span className={`text-[10px] px-1 py-0.5 rounded mt-1 inline-block ${
                          nft.tokenType === 'ERC-721'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {nft.tokenType}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            
            {/* Private Key Compromise Warning */}
            {result.privateKeyCompromised && result.privateKeyCompromised.isCompromised && (
              <div className="p-6 bg-red-600/20 border-2 border-red-500/50 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">🔑</span>
                  <h2 className="text-xl font-bold text-red-400">PRIVATE KEY COMPROMISED</h2>
                </div>
                <p className="text-red-300 text-sm mb-3">
                  ⚠️ Your wallet's private key has been leaked. A drainer bot has FULL CONTROL of your wallet across multiple chains.
                </p>
                <p className="text-red-400/80 text-xs mb-3">
                  This is NOT just an EIP-7702 delegation — the attacker can sign transactions as YOU on ANY chain.
                </p>
                <div className="space-y-1">
                  <p className="text-white/50 text-xs">Drainer addresses receiving your funds:</p>
                  {result.privateKeyCompromised.drainerAddresses.map((addr, i) => (
                    <code key={i} className="block text-red-300 text-xs">{addr}</code>
                  ))}
                </div>
                <div className="mt-3">
                  <p className="text-white/50 text-xs">Affected chains: {result.privateKeyCompromised.affectedChains.join(', ')}</p>
                </div>
                <div className="mt-4 p-3 bg-red-500/10 rounded-lg">
                  <p className="text-red-400 text-xs font-semibold">🛡️ What to do:</p>
                  <ul className="text-red-300/80 text-xs mt-1 space-y-1">
                    <li>• Do NOT send any funds to this wallet — they will be stolen instantly</li>
                    <li>• If you have assets on other chains, try to sweep them using Flashbots (private mempool)</li>
                    <li>• Generate a NEW wallet and move all future assets there</li>
                    <li>• This wallet is permanently compromised — there is no fix</li>
                  </ul>
                </div>
              </div>
            )}

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
                          href={getExplorerUrl(call.chainId, call.txHash, 'tx')}
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
                          href={getExplorerUrl(tx.chainId, tx.txHash, 'tx')}
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
                <span className="text-white/70 font-medium">{result.totalChainsScanned || 32} / 32</span>
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
                  {result.delegations.length} / {result.totalChainsScanned || 32} chains
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
