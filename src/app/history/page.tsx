'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CHAINS } from '@/lib/chains'
import { isValidAddress } from '@/lib/validation'

interface Transfer {
  hash: string
  from: string
  to: string
  value: string
  asset: string
  chainId: number
  chainName: string
  timestamp: number
  isExchangeDeposit: boolean
  exchangeName?: string
  isDrainerTransfer: boolean
  blockNumber: number
}

type FilterType = 'all' | 'in' | 'out' | 'exchange' | 'drainer'

function HistoryContent() {
  const searchParams = useSearchParams()
  const addressParam = searchParams.get('address')

  const [address, setAddress] = useState(addressParam || '')
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const fetchHistory = useCallback(async (addr: string) => {
    if (!addr) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/history?address=${addr}`, { signal: controller.signal })
      if (controller.signal.aborted) return
      const data = await res.json() as { transfers?: Transfer[]; error?: string }
      if (data.error) {
        setError(data.error)
      } else {
        setTransfers(data.transfers || [])
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('Failed to fetch history')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidAddress(address)) {
      setError('Invalid address. Must be 0x + 40 hex characters.')
      return
    }
    fetchHistory(address)
  }

  const filteredTransfers = transfers.filter(tx => {
    if (filter === 'in' && tx.from?.toLowerCase() === address.toLowerCase()) return false
    if (filter === 'out' && tx.from?.toLowerCase() !== address.toLowerCase()) return false
    if (filter === 'exchange' && !tx.isExchangeDeposit) return false
    if (filter === 'drainer' && !tx.isDrainerTransfer) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return tx.hash.toLowerCase().includes(q) || tx.from?.toLowerCase().includes(q) || tx.to?.toLowerCase().includes(q) || tx.asset.toLowerCase().includes(q) || tx.chainName.toLowerCase().includes(q)
    }
    return true
  })

  // Group by date
  const grouped = filteredTransfers.reduce<Record<string, Transfer[]>>((acc, tx) => {
    const date = new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    if (!acc[date]) acc[date] = []
    acc[date].push(tx)
    return acc
  }, {})

  const filters: { key: FilterType; label: string; color: string }[] = [
    { key: 'all', label: 'All', color: 'border-white/20 text-white' },
    { key: 'in', label: '↓ In', color: 'border-[#00ff87]/30 text-[#00ff87]' },
    { key: 'out', label: '↑ Out', color: 'border-[#ff3b3b]/30 text-[#ff3b3b]' },
    { key: 'exchange', label: '🏦 Exchange', color: 'border-yellow-400/30 text-yellow-400' },
    { key: 'drainer', label: '🚨 Drainer', color: 'border-red-500/30 text-red-400' },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#00ff87]/3 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-[#00e5ff]/3 rounded-full blur-[128px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        {/* Header */}
        <div className="mb-10 animate-[fade-in_0.6s_ease-out]">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            📜 Scan History
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">Full transaction history across all chains</p>
        </div>

        {/* Address Input */}
        <form onSubmit={handleSubmit} className="mb-8 animate-[fade-in_0.6s_ease-out_0.1s_both]">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00ff87]/20 to-[#00e5ff]/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex gap-2">
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Enter wallet address (0x...)"
                aria-label="Wallet address for history"
                className="flex-1 px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00ff87]/40 focus:shadow-[0_0_20px_rgba(0,255,135,0.1)] text-sm font-mono transition-all duration-300"
              />
              <button
                type="submit"
                disabled={loading}
                aria-label="Fetch transaction history"
                className="px-6 py-4 bg-gradient-to-r from-[#00ff87] to-[#00e5ff] text-black font-semibold rounded-2xl text-sm disabled:opacity-40 hover:shadow-[0_0_30px_rgba(0,255,135,0.3)] transition-all duration-300 active:scale-95"
              >
                {loading ? '...' : 'Fetch'}
              </button>
            </div>
          </div>
        </form>

        {/* Filter chips */}
        {transfers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 animate-[fade-in_0.4s_ease-out]">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all duration-200 ${
                  filter === f.key
                    ? `${f.color} bg-white/5`
                    : 'border-white/5 text-gray-600 hover:text-gray-400 hover:border-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
            <div className="flex-1" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00ff87]/30 w-40 transition-all"
            />
          </div>
        )}

        {error && (
          <div className="p-4 bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 rounded-xl text-[#ff3b3b] text-sm mb-6 animate-[fade-in_0.3s_ease-out]">{error}</div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 animate-pulse" style={{ animationDelay: `${i*100}ms` }}>
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-white/5" />
                  <div className="flex-1">
                    <div className="h-4 w-48 bg-white/5 rounded mb-2" />
                    <div className="h-3 w-32 bg-white/5 rounded" />
                  </div>
                  <div className="h-6 w-20 bg-white/5 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && Object.keys(grouped).length > 0 && (
          <div className="space-y-8">
            {Object.entries(grouped).map(([date, txs]) => (
              <div key={date} className="animate-[fade-in_0.4s_ease-out]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#00e5ff]" />
                  <h3 className="text-sm font-semibold text-gray-400">{date}</h3>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
                <div className="space-y-2">
                  {txs.map((tx, i) => {
                    const isOutgoing = tx.from?.toLowerCase() === address.toLowerCase()
                    return (
                      <div
                        key={i}
                        className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                isOutgoing ? 'bg-[#ff3b3b]/15 text-[#ff3b3b]' : 'bg-[#00ff87]/15 text-[#00ff87]'
                              }`}>
                                {isOutgoing ? '↑ OUT' : '↓ IN'}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500 border border-white/5">
                                {tx.chainName}
                              </span>
                              {tx.isExchangeDeposit && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                                  🏦 {tx.exchangeName}
                                </span>
                              )}
                              {tx.isDrainerTransfer && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                                  🚨 Drainer
                                </span>
                              )}
                            </div>
                            <p className="text-gray-500 text-xs font-mono">
                              {tx.from?.slice(0, 8)}...{tx.from?.slice(-6)} → {tx.to?.slice(0, 8)}...{tx.to?.slice(-6)}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <div className="font-mono text-sm text-white">{parseFloat(tx.value).toFixed(6)} <span className="text-gray-500">{tx.asset}</span></div>
                            <a
                              href={`${CHAINS[tx.chainId]?.explorer ?? 'https://etherscan.io'}/tx/${tx.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#00ff87]/40 text-xs hover:text-[#00ff87] transition-colors font-mono"
                            >
                              {tx.hash.slice(0, 10)}...
                            </a>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && transfers.length === 0 && !error && (
          <div className="text-center py-20 animate-[fade-in_0.6s_ease-out]">
            <div className="text-6xl mb-4 opacity-30">📜</div>
            <p className="text-gray-500 text-sm">Enter a wallet address to view its transaction history</p>
          </div>
        )}
      </div>
    </main>
  )
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-[#050507] via-[#0a0a0f] to-[#050507] flex items-center justify-center text-gray-500">Loading...</div>}>
      <HistoryContent />
    </Suspense>
  )
}
