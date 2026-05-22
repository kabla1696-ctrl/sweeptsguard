'use client'

import { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { isValidAddress } from '@/lib/validation'

interface PortfolioAsset {
  type: string
  symbol: string
  balance: string
  balanceFormatted: string
  chainId: number
  chainName: string
}

interface PortfolioData {
  address: string
  totalAssets: number
  totalUsdValue: number
  chainBreakdown: Record<number, { chainName: string; assets: PortfolioAsset[]; total: number }>
}

const CHAIN_COLORS: Record<string, string> = {
  Ethereum: '#627eea',
  Base: '#0052ff',
  BSC: '#f3ba2f',
  Arbitrum: '#28a0f0',
  Polygon: '#8247e5',
  Optimism: '#ff0420',
}

const TOKEN_ICONS: Record<string, string> = {
  ETH: '⟠',
  USDC: '💵',
  USDT: '💲',
  DAI: '◈',
  WETH: '⟠',
  BNB: '🔶',
  MATIC: '🟣',
  ARB: '🔵',
  OP: '🔴',
}

function Sparkline({ seed }: { seed: number }) {
  const points = Array.from({ length: 12 }, (_, i) => {
    const y = 20 + Math.sin(i * 0.8 + seed) * 8 + Math.cos(i * 1.2 + seed * 2) * 4
    return `${i * 5},${y}`
  }).join(' ')
  return (
    <svg viewBox="0 0 55 30" className="w-16 h-6 opacity-40">
      <polyline points={points} fill="none" stroke="#00ff87" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PortfolioContent() {
  const searchParams = useSearchParams()
  const addressParam = searchParams.get('address')

  const [address, setAddress] = useState(addressParam || '')
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const fetchPortfolio = useCallback(async (addr: string) => {
    if (!addr) return
    if (!isValidAddress(addr)) {
      setError('Invalid address. Must be a valid Ethereum address (0x followed by 40 hex characters).')
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError('')
    setPortfolio(null)
    try {
      const res = await fetch(`/api/portfolio?address=${encodeURIComponent(addr)}`, { signal: controller.signal })
      if (controller.signal.aborted) return
      if (!res.ok) {
        const errData = await res.json().catch(() => null) as { error?: string } | null
        setError(errData?.error || `Request failed with status ${res.status}`)
        return
      }
      const data = await res.json() as PortfolioData & { error?: string }
      if (data.error) {
        setError(data.error)
      } else {
        setPortfolio(data)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('Failed to fetch portfolio')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchPortfolio(address)
  }

  const allAssets = portfolio
    ? Object.values(portfolio.chainBreakdown).flatMap(c => c.assets)
    : []

  const topMovers = allAssets
    .sort((a, b) => parseFloat(b.balanceFormatted) - parseFloat(a.balanceFormatted))
    .slice(0, 5)

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-[#00ff87]/3 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-[#00e5ff]/3 rounded-full blur-[128px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        {/* Header */}
        <div className="mb-10 animate-[fade-in_0.6s_ease-out]">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            💼 Portfolio Tracker
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">Track wallet assets across all chains</p>
        </div>

        {/* Address Input */}
        <form onSubmit={handleSubmit} className="mb-10 animate-[fade-in_0.6s_ease-out_0.1s_both]">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00ff87]/20 to-[#00e5ff]/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex gap-2">
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Enter wallet address (0x...)"
                aria-label="Wallet address for portfolio"
                className="flex-1 px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00ff87]/40 focus:shadow-[0_0_20px_rgba(0,255,135,0.1)] text-sm font-mono transition-all duration-300"
              />
              <button
                type="submit"
                disabled={loading || !isValidAddress(address)}
                aria-label="Load portfolio"
                className="px-6 py-4 bg-gradient-to-r from-[#00ff87] to-[#00e5ff] text-black font-semibold rounded-2xl text-sm disabled:opacity-40 hover:shadow-[0_0_30px_rgba(0,255,135,0.3)] transition-all duration-300 active:scale-95"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : '📊 Load'}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="p-4 bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 rounded-xl text-[#ff3b3b] text-sm mb-6 animate-[fade-in_0.3s_ease-out]">{error}</div>
        )}

        {portfolio && (
          <div className="space-y-6 animate-[fade-in_0.6s_ease-out]">
            {/* Total Value Card */}
            <div className="relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8">
              <div className="absolute inset-0 bg-gradient-to-br from-[#00ff87]/5 to-[#00e5ff]/5" />
              <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="text-gray-500 text-sm">Total Assets</span>
                  <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-[#00ff87] to-[#00e5ff] bg-clip-text text-transparent mt-1">
                    {portfolio.totalAssets}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 text-sm">Chains</span>
                  <div className="text-3xl font-bold text-[#00e5ff]">{Object.keys(portfolio.chainBreakdown).length}</div>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Token List */}
              <div className="lg:col-span-2 space-y-3">
                <h2 className="text-lg font-semibold text-white/80 mb-4">Tokens</h2>
                {allAssets.map((asset, i) => {
                  const chainColor = CHAIN_COLORS[asset.chainName] || '#627eea'
                  return (
                    <div
                      key={i}
                      className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex items-center gap-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] animate-[fade-in_0.4s_ease-out_both]"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: `${chainColor}15`, border: `1px solid ${chainColor}30` }}>
                        {TOKEN_ICONS[asset.symbol] || '🪙'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{asset.symbol}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full text-gray-500 bg-white/5 border border-white/5">{asset.chainName}</span>
                        </div>
                        <div className="text-gray-500 text-xs font-mono mt-0.5">{asset.type}</div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <Sparkline seed={i * 3.7} />
                        <div>
                          <div className="font-mono text-sm text-white">{parseFloat(asset.balanceFormatted).toFixed(4)}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Chain Distribution */}
              <div>
                <h2 className="text-lg font-semibold text-white/80 mb-4">Chain Distribution</h2>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
                  {Object.entries(portfolio.chainBreakdown).map(([chainId, chain]) => {
                    const pct = portfolio.totalAssets > 0 ? (chain.assets.length / portfolio.totalAssets) * 100 : 0
                    const color = CHAIN_COLORS[chain.chainName] || '#627eea'
                    return (
                      <div key={chainId}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-gray-400">{chain.chainName}</span>
                          <span className="text-white/60 font-mono text-xs">{chain.assets.length} tokens</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              width: `${Math.max(pct, 5)}%`,
                              background: `linear-gradient(90deg, ${color}88, ${color})`,
                              boxShadow: `0 0 8px ${color}44`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Top Movers */}
                <h2 className="text-lg font-semibold text-white/80 mt-8 mb-4">Top Holdings</h2>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-3">
                  {topMovers.map((asset, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-xs w-5">{i + 1}.</span>
                        <span className="text-sm text-white">{asset.symbol}</span>
                      </div>
                      <span className="font-mono text-xs text-gray-400">{parseFloat(asset.balanceFormatted).toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!portfolio && !loading && !error && (
          <div className="text-center py-20 animate-[fade-in_0.6s_ease-out]">
            <div className="text-6xl mb-4 opacity-30">💼</div>
            <p className="text-gray-500 text-sm">Enter a wallet address to view its portfolio</p>
          </div>
        )}
      </div>
    </main>
  )
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-[#050507] via-[#0a0a0f] to-[#050507] flex items-center justify-center text-gray-500">Loading...</div>}>
      <PortfolioContent />
    </Suspense>
  )
}
