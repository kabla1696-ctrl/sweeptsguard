'use client'

import { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { getExplorerUrl } from '@/lib/validation'
import AddressInput from '@/components/AddressInput'

interface NFTItem {
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
}

interface SweepResult {
  nft: string
  tokenId: string
  txHash?: string
  error?: string
}

const CHAIN_ICONS: Record<number, string> = {
  1: '⟠', 8453: '🔵', 56: '🟡', 42161: '🔷', 137: '🟣', 10: '🔴',
  43114: '🔺', 250: '👻', 25: '🔷', 81457: '💥', 7777777: '🟣', 324: '🔷',
  59144: '🟢', 5000: '🟤', 534352: '📜', 100: '🦉', 7000: '⚡', 80094: '🐻',
  57073: '🖋️', 1868: '🟢', 1329: '🌊', 1116: '🔶', 1625: '🌌', 34443: '🟠',
}

function NFTContent() {
  const [address, setAddress] = useState('')
  const [safeAddress, setSafeAddress] = useState('')
  const [scanning, setScanning] = useState(false)
  const [nfts, setNfts] = useState<NFTItem[]>([])
  const [error, setError] = useState('')
  const [selectedChain, setSelectedChain] = useState<number | null>(null)
  const [sweeping, setSweeping] = useState(false)
  const [sweepResults, setSweepResults] = useState<SweepResult[]>([])
  const [privateKey, setPrivateKey] = useState('')
  const [showGuide, setShowGuide] = useState(true)
  const abortRef = useRef<AbortController | null>(null)

  // Clear private key from memory on unmount
  useEffect(() => {
    return () => {
      setPrivateKey('')
      abortRef.current?.abort()
    }
  }, [])

  const chains = [...new Set(nfts.map(n => n.chainId))].sort((a, b) => a - b)
  const filteredNfts = selectedChain ? nfts.filter(n => n.chainId === selectedChain) : nfts
  const groupedByCollection = filteredNfts.reduce((acc, nft) => {
    const key = `${nft.chainId}-${nft.contractAddress}`
    if (!acc[key]) acc[key] = { collection: nft.collection, chainId: nft.chainId, chainName: nft.chainName, contractAddress: nft.contractAddress, items: [] }
    acc[key].items.push(nft)
    return acc
  }, {} as Record<string, { collection: string; chainId: number; chainName: string; contractAddress: string; items: NFTItem[] }>)

  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)

  const scanNFTs = useCallback(async (addr: string) => {
    // Use resolved address if available, otherwise validate raw input
    const targetAddress = resolvedAddress || addr
    if (!targetAddress || !/^0x[0-9a-fA-F]{40}$/.test(targetAddress)) {
      setError('Please enter a valid EVM address or ENS name')
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setScanning(true)
    setError('')
    setNfts([])
    setSweepResults([])

    try {
      const res = await fetch(`/api/nft?address=${targetAddress}`, { signal: controller.signal })
      if (controller.signal.aborted) return
      const data = await res.json() as { nfts?: NFTItem[]; error?: string }

      if (data.error) {
        setError(data.error)
      } else {
        setNfts(data.nfts || [])
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('Failed to scan NFTs. Please try again.')
    } finally {
      if (!controller.signal.aborted) setScanning(false)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    scanNFTs(address)
  }

  const sweepChain = async (chainId: number) => {
    if (!privateKey || !safeAddress) {
      setError('Please provide both private key and safe wallet address')
      return
    }

    // Validate safe wallet ≠ compromised wallet
    if (safeAddress.toLowerCase() === address.toLowerCase()) {
      setError('Safe wallet CANNOT be the compromised wallet — NFTs would go back to the drainer!')
      return
    }

    setSweeping(true)
    setSweepResults([])

    try {
      const res = await fetch('/api/nft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sweep',
          compromisedAddress: address,
          safeAddress,
          chainId,
          privateKey
        })
      })
      const data = await res.json() as { transfers?: SweepResult[]; error?: string }

      if (data.error && !data.transfers) {
        setError(data.error)
      } else {
        setSweepResults(data.transfers || [])
        // Clear private key after successful sweep
        setPrivateKey('')
      }
    } catch {
      setError('Failed to sweep NFTs')
    } finally {
      setSweeping(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-pink-500/[0.03] rounded-full blur-[100px]" />
      </div>
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            SweepGuard
          </span>
        </Link>
        <div className="flex gap-4">
          <Link href="/scan" className="text-sm text-white/50 hover:text-green-400 transition-colors">Scan</Link>
          <Link href="/recover" className="text-sm text-white/50 hover:text-green-400 transition-colors">Recover</Link>
          <Link href="/nft" className="text-sm text-green-400 font-semibold">NFT Rescue</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🖼️ NFT Rescue</h1>
        <p className="text-white/40 mb-8">Scan and rescue ERC-721 & ERC-1155 NFTs from compromised wallets</p>

        {/* Guide */}
        {showGuide && (
          <div className="mb-8 p-5 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-green-400">📖 How NFT Rescue Works</h2>
              <button onClick={() => setShowGuide(false)} className="text-white/30 hover:text-white/60 text-xs">Hide ✕</button>
            </div>
            <div className="space-y-2 text-xs text-white/50">
              <p><strong className="text-white/70">Step 1:</strong> Enter your compromised wallet address to scan for NFTs across all chains.</p>
              <p><strong className="text-white/70">Step 2:</strong> Enter your safe wallet address + private key of the compromised wallet.</p>
              <p><strong className="text-white/70">Step 3:</strong> Click "Sweep" on any collection to transfer NFTs to your safe wallet.</p>
              <p>💡 <strong className="text-white/70">ERC-721</strong> = unique 1-of-1 NFTs · <strong className="text-white/70">ERC-1155</strong> = multi-edition NFTs (can have multiple copies)</p>
            </div>
          </div>
        )}

        {/* Scan Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div className="flex gap-2">
            <div className="flex-1">
              <AddressInput
                value={address}
                onChange={setAddress}
                onResolved={setResolvedAddress}
                placeholder="Compromised wallet address (0x...) or ENS name"
                chainId={1}
                inputClassName="text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={scanning}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50"
            >
              {scanning ? 'Scanning...' : 'Scan NFTs'}
            </button>
          </div>
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
              Scanning all chains for NFTs... This may take a moment.
            </div>
          </div>
        )}

        {/* Results */}
        {nfts.length > 0 && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{nfts.length} NFTs Found</h2>
                  <p className="text-white/40 text-sm mt-1">
                    Across {chains.length} chain{chains.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-4xl">🖼️</div>
              </div>
            </div>

            {/* Chain Filter */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedChain(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedChain === null
                    ? 'bg-green-600 text-white'
                    : 'bg-white/[0.03] text-white/50 hover:text-white'
                }`}
              >
                All Chains ({nfts.length})
              </button>
              {chains.map(chainId => {
                const chainNfts = nfts.filter(n => n.chainId === chainId)
                const chainName = chainNfts[0]?.chainName || `Chain ${chainId}`
                return (
                  <button
                    key={chainId}
                    onClick={() => setSelectedChain(chainId)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedChain === chainId
                        ? 'bg-green-600 text-white'
                        : 'bg-white/[0.03] text-white/50 hover:text-white'
                    }`}
                  >
                    {CHAIN_ICONS[chainId] || '🔗'} {chainName} ({chainNfts.length})
                  </button>
                )
              })}
            </div>

            {/* Rescue Panel */}
            <div className="p-5 bg-green-500/5 border border-green-500/20 rounded-2xl">
              <h3 className="font-bold text-green-400 mb-3">🛡️ Rescue NFTs</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <AddressInput
                  value={safeAddress}
                  onChange={setSafeAddress}
                  placeholder="Safe wallet address (0x...) or ENS name"
                  variant="green"
                  chainId={1}
                  inputClassName="text-sm"
                />
                <input
                  type="password"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="Compromised wallet private key"
                  className="px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm"
                />
              </div>
              <p className="text-white/30 text-xs mt-2">
                ⚠️ Private key is used only to sign transactions. It is sent to the server for TX signing — do NOT use on untrusted deployments.
              </p>
            </div>

            {/* NFT Collections */}
            {Object.values(groupedByCollection).map((group, i) => (
              <div key={i} className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{group.collection}</h3>
                    <p className="text-white/40 text-xs mt-0.5">
                      {CHAIN_ICONS[group.chainId] || '🔗'} {group.chainName} • {group.contractAddress.slice(0, 8)}...{group.contractAddress.slice(-6)}
                    </p>
                  </div>
                  <button
                    onClick={() => sweepChain(group.chainId)}
                    disabled={sweeping || !privateKey || !safeAddress}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg text-sm font-semibold disabled:opacity-40 hover:from-green-500 hover:to-emerald-500 transition-all"
                  >
                    {sweeping ? 'Sweeping...' : `Sweep ${group.items.length} NFT${group.items.length !== 1 ? 's' : ''}`}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {group.items.map((nft, j) => (
                    <div key={j} className="bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden group hover:border-green-500/20 transition-all">
                      {/* NFT Image */}
                      <div className="aspect-square bg-white/[0.03] flex items-center justify-center relative overflow-hidden">
                        {nft.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={nft.image}
                            alt={nft.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <span className="text-4xl opacity-30">🖼️</span>
                        )}
                        <div className="absolute top-2 right-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            nft.tokenType === 'ERC-721'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            {nft.tokenType === 'ERC-721' ? '721' : '1155'}
                          </span>
                        </div>
                      </div>

                      {/* NFT Info */}
                      <div className="p-3">
                        <p className="font-medium text-sm truncate">{nft.name}</p>
                        {nft.tokenType === 'ERC-1155' && nft.amount && (
                          <p className="text-white/40 text-xs mt-0.5">Balance: {nft.amount}</p>
                        )}
                        {nft.tokenURI && (
                          <a
                            href={nft.tokenURI}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400/50 text-xs hover:text-green-400 transition-colors mt-1 inline-block"
                          >
                            Metadata →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Sweep Results */}
            {sweepResults.length > 0 && (
              <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                <h3 className="font-semibold mb-4">Sweep Results</h3>
                <div className="space-y-2">
                  {sweepResults.map((result, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                      <div>
                        <span className="text-sm font-mono">
                          {result.nft.slice(0, 8)}...#{result.tokenId}
                        </span>
                      </div>
                      {result.txHash ? (
                        <a
                          href={getExplorerUrl(selectedChain || 1, result.txHash, 'tx')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 text-xs hover:underline"
                        >
                          ✅ View TX →
                        </a>
                      ) : (
                        <span className="text-red-400 text-xs">❌ {result.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No NFTs found */}
        {!scanning && nfts.length === 0 && address && !error && (
          <div className="text-center py-16">
            <span className="text-5xl opacity-30">🖼️</span>
            <p className="text-white/30 mt-4">No NFTs found for this address</p>
          </div>
        )}
      </div>
    </main>
  )
}

export default function NFTPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030305] flex items-center justify-center text-white/30">
        <div className="inline-flex items-center gap-3">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      </div>
    }>
      <NFTContent />
    </Suspense>
  )
}
