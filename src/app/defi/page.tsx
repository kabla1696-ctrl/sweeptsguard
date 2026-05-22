'use client'

import { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { isValidAddress, getExplorerUrl } from '@/lib/validation'

interface DeFiPosition {
  protocol: string
  type: string
  chainId: number
  chainName: string
  asset: string
  balance: string
  contractAddress: string
}

interface DeFiData {
  address: string
  positions: DeFiPosition[]
  totalPositions: number
  note?: string
}

function DeFiContent() {
  const searchParams = useSearchParams()
  const addressParam = searchParams.get('address')

  const [address, setAddress] = useState(addressParam || '')
  const [data, setData] = useState<DeFiData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const fetchDeFi = useCallback(async (addr: string) => {
    const trimmed = addr.trim()
    if (!trimmed) return
    if (!isValidAddress(trimmed)) {
      setError('Invalid address format. Must be 0x followed by 40 hex characters.')
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError('')
    setData(null)
    try {
      const res = await fetch(`/api/defi?address=${trimmed}`, { signal: controller.signal })
      if (controller.signal.aborted) return
      const result = await res.json() as DeFiData & { error?: string }
      if (result.error) {
        setError(result.error)
      } else {
        setData(result)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('Failed to fetch DeFi positions')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchDeFi(address.trim())
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lending': return '🏦'
      case 'lp': return '💧'
      case 'staking': return '🥩'
      case 'yield': return '🌾'
      default: return '📊'
    }
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-yellow-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-orange-500/[0.03] rounded-full blur-[100px]" />
      </div>
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

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">DeFi Positions</h1>
        <p className="text-white/40 mb-8">Check compromised wallet for DeFi positions (Aave, Compound, Uniswap)</p>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Enter wallet address (0x...)"
            aria-label="Wallet address for DeFi scan"
            className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            aria-label="Scan DeFi positions"
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50"
          >
            {loading ? 'Scanning...' : '🔍 Scan'}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">{error}</div>
        )}

        {data && (
          <div className="space-y-6">
            <div className="p-5 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl">
              <span className="text-white/40 text-sm">Total Positions Found</span>
              <div className="text-3xl font-bold text-green-400">{data.totalPositions}</div>
            </div>

            {data.note && (
              <p className="text-white/30 text-sm">{data.note}</p>
            )}

            {data.positions && data.positions.length > 0 ? (
              <div className="space-y-3">
                {data.positions.map((pos, i) => (
                  <div key={i} className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getTypeIcon(pos.type)}</span>
                      <div>
                        <h3 className="font-semibold">{pos.protocol}</h3>
                        <span className="text-white/30 text-xs">{pos.chainName} • {pos.type}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="p-2 bg-white/[0.02] rounded-lg">
                        <span className="text-xs text-white/30">Asset</span>
                        <p className="font-mono text-sm">{pos.asset}</p>
                      </div>
                      <div className="p-2 bg-white/[0.02] rounded-lg col-span-2">
                        <span className="text-xs text-white/30">Contract</span>
                        <a
                          href={getExplorerUrl(pos.chainId, pos.contractAddress)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm text-green-400 hover:text-green-300 truncate block"
                        >
                          {pos.contractAddress.slice(0, 10)}...{pos.contractAddress.slice(-8)}
                        </a>
                      </div>
                      <div className="p-2 bg-white/[0.02] rounded-lg">
                        <span className="text-xs text-white/30">Balance</span>
                        <p className="font-mono text-sm">{isNaN(parseFloat(pos.balance)) ? '0.000000' : parseFloat(pos.balance).toFixed(6)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-white/30">
                <p className="text-lg mb-2">No DeFi positions found</p>
                <p className="text-sm">This wallet doesn&apos;t have positions in major protocols</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

export default function DeFiPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030305] flex items-center justify-center text-white/30">Loading...</div>}>
      <DeFiContent />
    </Suspense>
  )
}
