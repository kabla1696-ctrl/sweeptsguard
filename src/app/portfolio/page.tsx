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

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/scan" className="text-sm text-white/50 hover:text-white">Scan</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white">Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Portfolio Tracker</h1>
        <p className="text-white/40 mb-8">Track safe wallet assets across all chains</p>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Enter wallet address (0x...)"
            aria-label="Wallet address for portfolio"
            className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm"
          />
          <button
            type="submit"
            disabled={loading || !isValidAddress(address)}
            aria-label="Load portfolio"
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50"
          >
            {loading ? 'Loading...' : '📊 Load'}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">{error}</div>
        )}

        {portfolio && (
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white/40 text-sm">Total Assets</span>
                  <div className="text-3xl font-bold text-green-400">{portfolio.totalAssets}</div>
                </div>
                <div className="text-right">
                  <span className="text-white/40 text-sm">Chains</span>
                  <div className="text-3xl font-bold text-emerald-400">{Object.keys(portfolio.chainBreakdown).length}</div>
                </div>
              </div>
            </div>

            {Object.entries(portfolio.chainBreakdown).map(([chainId, chain]) => (
              <div key={chainId} className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                <h3 className="font-semibold mb-3">{chain.chainName}</h3>
                <div className="space-y-2">
                  {chain.assets.map((asset, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-white/[0.02] rounded-xl">
                      <span className="text-sm">{asset.symbol}</span>
                      <span className="font-mono text-sm">{parseFloat(asset.balanceFormatted).toFixed(6)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/30">Loading...</div>}>
      <PortfolioContent />
    </Suspense>
  )
}
