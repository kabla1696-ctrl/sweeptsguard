'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'
import { CHAINS, DEFAULT_CHAINS } from '@/lib/chains'

interface BatchResult {
  chainId: number
  chainName: string
  success: boolean
  txHash?: string
  error?: string
  explorerUrl?: string
  symbol?: string
  amount?: string
  tokenAddress?: string
  airdropAddress?: string
}

type BatchAction = 'revoke' | 'claim' | 'sweep' | 'scan-nfts'
type Step = 'idle' | 'configuring' | 'executing' | 'done' | 'error'

interface NFTResult {
  chainId: number
  chainName: string
  nfts: { contractAddress: string; tokenId: string; name?: string; collection?: string }[]
  success: boolean
  error?: string
}

function BatchContent() {
  const [action, setAction] = useState<BatchAction>('revoke')
  const [step, setStep] = useState<Step>('idle')
  const [privateKey, setPrivateKey] = useState('')
  const [safeWallet, setSafeWallet] = useState('')
  const [compromisedAddress, setCompromisedAddress] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [selectedChains, setSelectedChains] = useState<number[]>([1, 8453, 42161, 137, 10])
  const [error, setError] = useState('')
  const [results, setResults] = useState<BatchResult[]>([])
  const [nftResults, setNftResults] = useState<NFTResult[]>([])
  const [progress, setProgress] = useState({ total: 0, completed: 0, successful: 0, failed: 0 })
  const [showConfirm, setShowConfirm] = useState(false)
  const [showGuide, setShowGuide] = useState(true)

  // Cleanup
  useEffect(() => {
    return () => {
      setPrivateKey('')
    }
  }, [])

  const popularChains = [1, 8453, 42161, 137, 10, 56, 43114]

  const toggleChain = (chainId: number) => {
    setSelectedChains((prev) =>
      prev.includes(chainId) ? prev.filter((id) => id !== chainId) : [...prev, chainId]
    )
  }

  const selectAllChains = () => {
    setSelectedChains(DEFAULT_CHAINS)
  }

  const selectPopularChains = () => {
    setSelectedChains(popularChains)
  }

  const validateInputs = (): boolean => {
    if (!privateKey) {
      setError('Private key required')
      return false
    }
    if (action === 'revoke' || action === 'sweep') {
      if (!safeWallet || !ethers.isAddress(safeWallet)) {
        setError('Valid safe wallet address required')
        return false
      }
    }
    if (action === 'sweep' && (!compromisedAddress || !ethers.isAddress(compromisedAddress))) {
      setError('Valid compromised address required')
      return false
    }
    if (selectedChains.length === 0 && action !== 'claim') {
      setError('Select at least one chain')
      return false
    }
    return true
  }

  const executeBatch = async () => {
    if (!validateInputs()) return

    if (!showConfirm) {
      setShowConfirm(true)
      return
    }
    setShowConfirm(false)

    setStep('executing')
    setError('')
    setResults([])
    setNftResults([])
    setProgress({ total: 0, completed: 0, successful: 0, failed: 0 })

    try {
      let res: Response

      switch (action) {
        case 'revoke':
          res = await fetch('/api/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'revoke',
              chains: selectedChains,
              privateKey,
              safeWallet,
            }),
          })
          break

        case 'sweep':
          res = await fetch('/api/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'sweep',
              chains: selectedChains,
              privateKey,
              compromisedAddress,
              safeAddress: safeWallet,
            }),
          })
          break

        case 'scan-nfts':
          res = await fetch('/api/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'scan-nfts',
              address: compromisedAddress || ethers.Wallet.createRandom().address,
              chains: selectedChains,
            }),
          })
          break

        default:
          setError('Select an action')
          setStep('idle')
          return
      }

      const data = await res.json()

      if (data.error) {
        setError(data.error)
        setStep('error')
        return
      }

      if (action === 'scan-nfts') {
        setNftResults(data.results || [])
        setProgress({
          total: data.totalChainsScanned || 0,
          completed: data.totalChainsScanned || 0,
          successful: data.results?.filter((r: NFTResult) => r.success).length || 0,
          failed: data.results?.filter((r: NFTResult) => !r.success).length || 0,
        })
      } else {
        setResults(data.results || [])
        setProgress({
          total: data.totalAttempted || 0,
          completed: data.totalAttempted || 0,
          successful: data.successful || 0,
          failed: data.failed || 0,
        })
      }

      setStep('done')
    } catch {
      setError('Batch operation failed. Please try again.')
      setStep('error')
    }
  }

  const reset = () => {
    setPrivateKey('')
    setSafeWallet('')
    setCompromisedAddress('')
    setShowKey(false)
    setShowConfirm(false)
    setStep('idle')
    setError('')
    setResults([])
    setNftResults([])
    setProgress({ total: 0, completed: 0, successful: 0, failed: 0 })
  }

  const actionLabels: Record<BatchAction, { icon: string; title: string; desc: string }> = {
    revoke: { icon: '🚫', title: 'Batch Revoke', desc: 'Revoke delegations across multiple chains' },
    claim: { icon: '🎁', title: 'Batch Claim', desc: 'Claim multiple airdrops at once' },
    sweep: { icon: '🧹', title: 'Batch Sweep', desc: 'Sweep tokens across chains' },
    'scan-nfts': { icon: '🖼️', title: 'Scan NFTs', desc: 'Scan for NFTs across chains' },
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
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">Dashboard</Link>
          <Link href="/recover" className="text-sm text-white/50 hover:text-white transition-colors">Recover</Link>
          <Link href="/scan" className="text-sm text-white/50 hover:text-white transition-colors">Scan</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">⚡ Batch Operations</h1>
        <p className="text-white/40 mb-8">Execute multi-chain operations in parallel — revoke, claim, sweep, scan</p>

        {/* Guide */}
        {showGuide && step === 'idle' && (
          <div className="mb-8 p-5 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-green-400">📖 Batch Operations Guide</h2>
              <button onClick={() => setShowGuide(false)} className="text-white/30 hover:text-white/60 text-xs">Hide ✕</button>
            </div>
            <div className="space-y-2 text-xs text-white/50">
              <p>🚫 <strong className="text-white/70">Batch Revoke</strong> — Remove token approvals & delegations from your compromised wallet across multiple chains at once.</p>
              <p>🎁 <strong className="text-white/70">Batch Claim</strong> — Claim pending airdrops from multiple sources in one go.</p>
              <p>🧹 <strong className="text-white/70">Batch Sweep</strong> — Transfer all remaining tokens from a compromised wallet to a safe one across many chains.</p>
              <p>🖼️ <strong className="text-white/70">Scan NFTs</strong> — Discover all NFTs held by a wallet across supported chains.</p>
              <p>💡 Select an action below, fill in the required details, and choose which chains to target.</p>
            </div>
          </div>
        )}

        {/* Action Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {(Object.keys(actionLabels) as BatchAction[]).map((a) => (
            <button
              key={a}
              onClick={() => { setAction(a); setStep('idle'); setError(''); setResults([]); setNftResults([]) }}
              className={`p-4 rounded-xl border transition-all ${
                action === a
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-white/[0.02] border-white/[0.05] text-white/50 hover:bg-white/[0.05]'
              }`}
            >
              <div className="text-2xl mb-2">{actionLabels[a].icon}</div>
              <div className="text-sm font-semibold">{actionLabels[a].title}</div>
              <div className="text-xs text-white/30 mt-1">{actionLabels[a].desc}</div>
            </button>
          ))}
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="max-w-md mx-4 p-6 bg-[#1a1a2e] border border-yellow-500/30 rounded-2xl">
              <h3 className="text-yellow-400 font-bold text-lg mb-3">⚠️ Confirm Batch Operation</h3>
              <p className="text-white/60 text-sm mb-4">
                You are about to execute <strong>{actionLabels[action].title}</strong> on{' '}
                <strong>{selectedChains.length} chains</strong>. This will send your private key to the server for signing.
              </p>
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg mb-4">
                <p className="text-green-400 text-xs">✅ Key is NEVER stored on server</p>
                <p className="text-green-400 text-xs">✅ Used only for this operation</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={executeBatch}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold hover:brightness-110 transition-all"
                >
                  ✅ Execute
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-sm hover:bg-white/[0.08]"
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Configuration */}
        {step === 'idle' || step === 'configuring' ? (
          <div className="space-y-6">
            {/* Private Key */}
            <div>
              <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                🔴 Private Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="Private key for signing transactions..."
                  className="w-full px-4 py-3 pr-20 bg-red-500/5 border border-red-500/20 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/40 text-sm font-mono"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Safe Wallet (for revoke/sweep) */}
            {(action === 'revoke' || action === 'sweep') && (
              <div>
                <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                  🟢 Safe Wallet Address
                </label>
                <input
                  type="text"
                  value={safeWallet}
                  onChange={(e) => setSafeWallet(e.target.value)}
                  placeholder="0x... safe wallet for receiving funds"
                  className="w-full px-4 py-3 bg-green-500/5 border border-green-500/20 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                />
              </div>
            )}

            {/* Compromised Address (for sweep/scan-nfts) */}
            {(action === 'sweep' || action === 'scan-nfts') && (
              <div>
                <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                  🔴 Compromised Wallet Address
                </label>
                <input
                  type="text"
                  value={compromisedAddress}
                  onChange={(e) => setCompromisedAddress(e.target.value)}
                  placeholder="0x... wallet to sweep/scan from"
                  className="w-full px-4 py-3 bg-red-500/5 border border-red-500/20 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/40 text-sm font-mono"
                />
              </div>
            )}

            {/* Chain Selector */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs text-white/30 uppercase tracking-wider">
                  🔗 Select Chains ({selectedChains.length} selected)
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={selectPopularChains}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Popular
                  </button>
                  <button
                    onClick={selectAllChains}
                    className="text-xs text-green-400 hover:text-green-300"
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSelectedChains([])}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
                {Object.values(CHAINS).map((chain) => (
                  <button
                    key={chain.id}
                    onClick={() => toggleChain(chain.id)}
                    className={`p-2 rounded-lg text-xs font-medium transition-all ${
                      selectedChains.includes(chain.id)
                        ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                        : 'bg-white/[0.03] border border-white/[0.05] text-white/40 hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="mr-1">{chain.icon}</span>
                    {chain.shortName}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Execute Button */}
            <button
              onClick={executeBatch}
              disabled={selectedChains.length === 0 && action !== 'claim'}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-lg disabled:opacity-30 hover:brightness-110 transition-all"
            >
              {actionLabels[action].icon} Execute {actionLabels[action].title} ({selectedChains.length} chains)
            </button>
          </div>
        ) : null}

        {/* Executing */}
        {step === 'executing' && (
          <div className="text-center py-16">
            <div className="animate-spin text-5xl mb-6">⏳</div>
            <h3 className="text-xl font-semibold mb-2">Executing {actionLabels[action].title}...</h3>
            <p className="text-white/40">Processing {selectedChains.length} chains in parallel</p>
            <div className="mt-6 max-w-xs mx-auto">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {step === 'done' && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              <h3 className="text-lg font-semibold mb-4">📊 Results</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg text-center">
                  <p className="text-white/40 text-xs">Total</p>
                  <p className="text-blue-400 font-bold text-xl">{progress.total}</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg text-center">
                  <p className="text-white/40 text-xs">Successful</p>
                  <p className="text-green-400 font-bold text-xl">{progress.successful}</p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-lg text-center">
                  <p className="text-white/40 text-xs">Failed</p>
                  <p className="text-red-400 font-bold text-xl">{progress.failed}</p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              <div className="flex justify-between text-xs text-white/40 mb-2">
                <span>Progress</span>
                <span>{progress.completed}/{progress.total}</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${progress.total > 0 ? (progress.successful / progress.total) * 100 : 0}%` }}
                />
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${progress.total > 0 ? (progress.failed / progress.total) * 100 : 0}%` }}
                />
              </div>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-green-400">✅ {progress.successful} success</span>
                <span className="text-red-400">❌ {progress.failed} failed</span>
              </div>
            </div>

            {/* Individual Results — Revoke/Sweep/Claim */}
            {action !== 'scan-nfts' && results.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">📋 Chain Details</h3>
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border ${
                      r.success
                        ? 'bg-green-500/5 border-green-500/20'
                        : 'bg-red-500/5 border-red-500/20'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className={r.success ? 'text-green-400' : 'text-red-400'}>
                          {r.success ? '✅' : '❌'}
                        </span>
                        <div>
                          <span className="text-sm font-semibold">{r.chainName}</span>
                          {r.symbol && (
                            <span className="text-white/30 text-xs ml-2">{r.symbol}</span>
                          )}
                          {r.amount && r.amount !== '0' && (
                            <span className="text-green-400 text-xs ml-2">{r.amount}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {r.txHash && (
                          <a
                            href={`${r.explorerUrl || 'https://etherscan.io'}/tx/${r.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400/70 text-xs font-mono hover:text-green-400"
                          >
                            {r.txHash.slice(0, 14)}...
                          </a>
                        )}
                        {r.error && (
                          <p className="text-red-400/70 text-xs max-w-[200px] truncate">{r.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* NFT Results */}
            {action === 'scan-nfts' && nftResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">🖼️ NFT Scan Results</h3>
                {nftResults.map((nr, i) => (
                  <div key={i} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold">{nr.chainName}</span>
                      <span className="text-white/30 text-xs">{nr.nfts.length} NFTs</span>
                    </div>
                    {nr.nfts.length > 0 ? (
                      <div className="space-y-2">
                        {nr.nfts.map((nft, j) => (
                          <div key={j} className="p-2 bg-white/[0.03] rounded-lg flex justify-between items-center">
                            <div>
                              <span className="text-sm">{nft.name || `Token #${nft.tokenId}`}</span>
                              {nft.collection && (
                                <span className="text-white/30 text-xs ml-2">{nft.collection}</span>
                              )}
                            </div>
                            <span className="text-white/20 text-xs font-mono">{nft.contractAddress.slice(0, 10)}...</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/30 text-sm">No NFTs found</p>
                    )}
                    {nr.error && (
                      <p className="text-red-400/70 text-xs mt-2">{nr.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={reset}
              className="w-full py-3 bg-white/[0.05] rounded-xl text-sm hover:bg-white/[0.08]"
            >
              Start New Operation
            </button>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
            <h3 className="text-red-400 font-bold text-lg mb-2">❌ Operation Failed</h3>
            <p className="text-white/60 text-sm mb-4">{error}</p>
            <button
              onClick={() => { setStep('idle'); setError('') }}
              className="px-4 py-2 bg-white/[0.05] rounded-lg text-sm hover:bg-white/[0.08]"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

export default function BatchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/30">Loading...</div>}>
      <BatchContent />
    </Suspense>
  )
}
