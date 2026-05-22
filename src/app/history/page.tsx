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

function HistoryContent() {
  const searchParams = useSearchParams()
  const addressParam = searchParams.get('address')

  const [address, setAddress] = useState(addressParam || '')
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
        <h1 className="text-3xl font-bold mb-2">Transaction History</h1>
        <p className="text-white/40 mb-8">Full transaction history across all chains</p>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Enter wallet address (0x...)"
            aria-label="Wallet address for history"
            className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            aria-label="Fetch transaction history"
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Fetch History'}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">{error}</div>
        )}

        {loading && (
          <div className="text-center py-12 text-white/30">Loading transactions...</div>
        )}

        {!loading && transfers.length > 0 && (
          <div className="space-y-2">
            {transfers.map((tx, i) => (
              <div key={i} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        tx.from?.toLowerCase() === address.toLowerCase()
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {tx.from?.toLowerCase() === address.toLowerCase() ? 'OUT' : 'IN'}
                      </span>
                      <span className="text-white/30 text-xs">{tx.chainName}</span>
                      {tx.isExchangeDeposit && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                          🏦 {tx.exchangeName}
                        </span>
                      )}
                      {tx.isDrainerTransfer && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">🚨 Drainer</span>
                      )}
                    </div>
                    <p className="text-white/40 text-xs font-mono">
                      {tx.from?.slice(0, 10)}...{tx.from?.slice(-6)} → {tx.to?.slice(0, 10)}...{tx.to?.slice(-6)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">{parseFloat(tx.value).toFixed(6)} {tx.asset}</div>
                    <a
                      href={`${CHAINS[tx.chainId]?.explorer ?? 'https://etherscan.io'}/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400/50 text-xs hover:text-green-400"
                    >
                      {tx.hash.slice(0, 12)}...
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && transfers.length === 0 && address && !error && (
          <div className="text-center py-12 text-white/30">No transactions found</div>
        )}
      </div>
    </main>
  )
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/30">Loading...</div>}>
      <HistoryContent />
    </Suspense>
  )
}
