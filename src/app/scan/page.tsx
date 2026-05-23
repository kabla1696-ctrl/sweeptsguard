'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
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

function RiskBadge({ result }: { result: ScanResult }) {
  let score = 0
  const reasons: string[] = []
  if (result.delegation.isDrainer) { score += 50; reasons.push('Known drainer delegation') }
  if (result.privateKeyCompromised?.isCompromised) { score += 40; reasons.push('Private key compromised') }
  if (result.recentDrains.length > 0) { score += 30; reasons.push(`${result.recentDrains.length} recent drains`) }
  if (result.suspiciousApprovals.length > 0) { score += 20; reasons.push(`${result.suspiciousApprovals.length} suspicious approvals`) }
  if (result.drainerMethodCalls.length > 0) { score += 15; reasons.push('Drainer method calls detected') }
  score = Math.min(score, 100)

  const level = score >= 70 ? 'CRITICAL' : score >= 40 ? 'HIGH' : score >= 20 ? 'MEDIUM' : 'LOW'
  const color = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : score >= 20 ? '#eab308' : '#00ff87'

  return (
    <div className="relative p-6 rounded-2xl overflow-hidden" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px]" style={{ background: `${color}10` }} />
      <div className="relative flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: `${color}80` }}>Risk Score</div>
          <div className="text-5xl font-black" style={{ color }}>{score}</div>
          <div className="text-sm mt-1" style={{ color: `${color}90` }}>{level} RISK</div>
        </div>
        <div className="text-6xl">{score >= 70 ? '🚨' : score >= 40 ? '⚠️' : score >= 20 ? '🟡' : '✅'}</div>
      </div>
      {reasons.length > 0 && (
        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${color}15` }}>
          <div className="text-xs text-white/30 mb-2">Risk Factors:</div>
          <div className="space-y-1">
            {reasons.map((r, i) => (
              <div key={i} className="text-xs flex items-center gap-2" style={{ color: `${color}80` }}>
                <span className="w-1 h-1 rounded-full" style={{ background: color }} />
                {r}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ScanContent() {
  const searchParams = useSearchParams()
  const addressParam = searchParams.get('address')

  const [address, setAddress] = useState(addressParam || '')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const scanWallet = useCallback(async (addr: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setScanning(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch(`/api/scan?address=${encodeURIComponent(addr)}`, { signal: controller.signal })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Scan failed (${res.status})`)
      }
      const data = await res.json()
      if (!controller.signal.aborted) {
        setResult(data)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      if (!controller.signal.aborted) setScanning(false)
    }
  }, [])

  useEffect(() => {
    if (addressParam && /^0x[0-9a-fA-F]{40}$/.test(addressParam)) {
      setAddress(addressParam)
      scanWallet(addressParam)
    }
  }, [addressParam, scanWallet])

  const handleScan = () => {
    const trimmed = address.trim()
    if (!trimmed) { setError('Enter a wallet address'); return }
    if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) { setError('Invalid address format'); return }
    setError('')
    scanWallet(trimmed)
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-green-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/[0.03] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="text-gray-600 hover:text-green-400 text-sm transition-colors mb-4 inline-block">← Home</Link>
          <h1 className="text-4xl md:text-5xl font-black">
            Wallet <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">Scanner</span>
          </h1>
          <p className="text-gray-500 mt-3 text-lg">Scan any wallet across 34+ chains. Find risks, assets, and threats instantly.</p>
        </div>

        {/* Search */}
        <div className="mb-10">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-green-500/10 to-cyan-500/10 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <form onSubmit={(e) => { e.preventDefault(); handleScan(); }} className="relative flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <AddressInput value={address} onChange={(val) => { setAddress(val); setError('') }} placeholder="Enter wallet address (0x...)" />
              </div>
              <button onClick={handleScan} disabled={scanning} className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-bold text-sm hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-40 shadow-lg shadow-green-500/20 whitespace-nowrap">
                {scanning ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Scanning...</span> : '🔍 Scan Wallet'}
              </button>
            </form>
          </div>
          {error && <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">⚠️ {error}</div>}
        </div>

        {/* Scanning */}
        {scanning && (
          <div className="text-center py-16">
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">🔍</div>
            </div>
            <div className="text-white/60 text-lg font-medium">Scanning 34+ chains...</div>
            <div className="text-white/30 text-sm mt-2">Checking delegations, approvals, assets, and threats</div>
          </div>
        )}

        {/* Results */}
        {result && !scanning && (
          <div className="space-y-6">
            {/* Address header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
              <div>
                <div className="text-xs text-white/30 mb-1">Scanned Address</div>
                <code className="text-green-400 font-mono text-sm">{result.address}</code>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {[{ v: result.totalChainsScanned || result.chains.length, l: 'Chains' }, { v: result.assets.length, l: 'Assets' }, { v: result.nfts?.length || 0, l: 'NFTs' }].map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="text-white font-bold">{s.v}</div>
                    <div className="text-white/30 text-xs">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <RiskBadge result={result} />

            {/* Delegation Warning */}
            {result.delegation.hasDelegation && (
              <div className={`p-5 rounded-2xl border ${result.delegation.isDrainer ? 'bg-red-500/[0.06] border-red-500/20' : 'bg-yellow-500/[0.06] border-yellow-500/20'}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{result.delegation.isDrainer ? '🚨' : '⚠️'}</span>
                  <div>
                    <h3 className={`font-bold text-lg ${result.delegation.isDrainer ? 'text-red-400' : 'text-yellow-400'}`}>
                      {result.delegation.isDrainer ? 'KNOWN DRAINER DETECTED' : 'EIP-7702 Delegation Found'}
                    </h3>
                    <p className="text-white/40 text-sm mt-1">Delegated to: <code className="text-white/60">{result.delegation.delegatedTo}</code></p>
                    {result.delegation.drainerName && <p className="text-red-300 text-sm mt-1 font-medium">⚠️ {result.delegation.drainerName}</p>}
                  </div>
                </div>
              </div>
            )}

            {result.privateKeyCompromised?.isCompromised && (
              <div className="p-5 rounded-2xl bg-red-500/[0.06] border border-red-500/20">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔑</span>
                  <div>
                    <h3 className="font-bold text-lg text-red-400">PRIVATE KEY COMPROMISED</h3>
                    <p className="text-white/40 text-sm mt-1">Method: {result.privateKeyCompromised.method}</p>
                    <p className="text-white/40 text-sm mt-1">Affected chains: {result.privateKeyCompromised.affectedChains.join(', ')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Assets */}
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center text-sm">💰</span>
                Assets Found ({result.assets.length})
              </h2>
              {result.assets.length === 0 ? (
                <div className="text-center py-12 text-white/20"><div className="text-4xl mb-2">🔍</div>No assets found</div>
              ) : (
                <div className="space-y-2">
                  {result.assets.map((asset, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] hover:border-white/[0.1] transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/[0.05] rounded-lg flex items-center justify-center text-xs font-bold">{asset.symbol.slice(0, 2)}</div>
                        <div>
                          <span className="font-medium">{asset.symbol}</span>
                          <span className="text-white/20 text-xs ml-2">{asset.chainName}</span>
                        </div>
                      </div>
                      <div className="font-mono text-sm text-green-400">{parseFloat(asset.balanceFormatted).toFixed(6)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* NFTs */}
            {result.nfts && result.nfts.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center text-sm">🖼️</span>
                  NFTs ({result.nfts.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {result.nfts.map((nft, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden hover:border-purple-500/20 transition-all">
                      <div className="aspect-square bg-white/[0.03] flex items-center justify-center">
                        {nft.image ? <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" /> : <span className="text-3xl opacity-30">🖼️</span>}
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-medium truncate">{nft.name || 'Unknown'}</p>
                        <p className="text-white/20 text-[10px] truncate">{nft.collection}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded mt-1.5 inline-block ${nft.tokenType === 'ERC-721' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>{nft.tokenType}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Drains */}
            {result.recentDrains.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center text-sm">🚨</span>
                  Recent Drains ({result.recentDrains.length})
                </h2>
                <div className="space-y-2">
                  {result.recentDrains.map((drain, i) => (
                    <div key={i} className="p-4 bg-red-500/[0.04] border border-red-500/10 rounded-xl">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-red-400 text-sm font-medium">{drain.chainName}</span>
                          <span className="text-white/30 text-xs ml-2">{drain.value} ETH</span>
                        </div>
                        <span className="text-white/20 text-xs">{new Date(drain.timestamp).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-2 text-xs text-white/30">To: <code className="text-red-300/60">{drain.to.slice(0, 10)}...{drain.to.slice(-8)}</code></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approvals */}
            {result.suspiciousApprovals.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center text-sm">⚠️</span>
                  Suspicious Approvals ({result.suspiciousApprovals.length})
                </h2>
                <div className="space-y-2">
                  {result.suspiciousApprovals.map((a, i) => (
                    <div key={i} className="p-4 bg-yellow-500/[0.04] border border-yellow-500/10 rounded-xl">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-yellow-400 text-sm font-medium">{a.token}</span>
                          <span className="text-white/30 text-xs ml-2">{a.chainName}</span>
                        </div>
                        {a.isDrainer && <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">DRAINER</span>}
                      </div>
                      <div className="mt-2 text-xs text-white/30">Spender: <code className="text-yellow-300/60">{a.spender.slice(0, 10)}...{a.spender.slice(-8)}</code></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              {[
                { href: `/dashboard?address=${result.address}`, label: 'Dashboard', icon: '📊' },
                { href: `/recover?address=${result.address}`, label: 'Recover', icon: '💰' },
                { href: `/tracker?address=${result.address}`, label: 'Track', icon: '🔗' },
                { href: `/approvals?address=${result.address}`, label: 'Approvals', icon: '📋' },
              ].map(a => (
                <Link key={a.href} href={a.href} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl text-center hover:bg-white/[0.04] transition-all group">
                  <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">{a.icon}</div>
                  <div className="text-xs text-white/40 group-hover:text-white/70 transition-colors">{a.label}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !scanning && !error && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-20">🔍</div>
            <div className="text-white/20 text-lg">Enter a wallet address to start scanning</div>
            <div className="text-white/10 text-sm mt-2">Supports 34+ EVM chains + Solana</div>
          </div>
        )}
      </div>
    </main>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030305] flex items-center justify-center"><div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" /></div>}>
      <ScanContent />
    </Suspense>
  )
}
