'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface GasPrice {
  chainId: number
  chainName: string
  icon: string
  low: string
  average: string
  high: string
  unit: string
  baseFee?: string
  lastUpdated: string
}

export default function GasPage() {
  const [gasPrices, setGasPrices] = useState<GasPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showGuide, setShowGuide] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const fetchGas = async () => {
      try {
        const res = await fetch('/api/gas', { signal: controller.signal })
        if (!res.ok) {
          const errData = await res.json().catch(() => null) as { error?: string } | null
          setError(errData?.error || `Request failed with status ${res.status}`)
          return
        }
        const data = await res.json() as { chains?: GasPrice[]; error?: string }
        if (data.error) {
          setError(data.error)
        } else {
          setGasPrices(data.chains || [])
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError('Failed to fetch gas prices')
      } finally {
        setLoading(false)
      }
    }
    fetchGas()
    const interval = setInterval(fetchGas, 15000)
    return () => {
      clearInterval(interval)
      controller.abort()
    }
  }, [])

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
        <h1 className="text-3xl font-bold mb-2">⛽ Gas Tracker</h1>
        <p className="text-white/40 mb-8">Real-time gas prices across all supported chains</p>

        {/* Guide */}
        {showGuide && (
          <div className="mb-8 p-5 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-green-400">📖 What is Gas?</h2>
              <button onClick={() => setShowGuide(false)} className="text-white/30 hover:text-white/60 text-xs">Hide ✕</button>
            </div>
            <div className="space-y-2 text-xs text-white/50">
              <p><strong className="text-white/70">Gas</strong> is the fee you pay to make transactions on a blockchain. Think of it like a processing fee.</p>
              <p><strong className="text-white/70">Gwei</strong> is a tiny unit of the blockchain's currency (1 Gwei = 0.000000001 ETH).</p>
              <p>💡 <strong className="text-white/70">Low</strong> = cheapest (slowest) · <strong className="text-white/70">Average</strong> = normal speed · <strong className="text-white/70">High</strong> = fastest (most expensive)</p>
              <p>🔄 Prices auto-refresh every 15 seconds.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-green-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading gas prices...
            </div>
          </div>
        ) : gasPrices.length === 0 && !error ? (
          <div className="text-center py-12 text-white/30">No gas data available. Retrying...</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {gasPrices.map(gas => (
              <div key={gas.chainId} className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:border-green-500/20 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{gas.icon}</span>
                  <div>
                    <h3 className="font-semibold">{gas.chainName}</h3>
                    {gas.baseFee && (
                      <span className="text-white/30 text-xs">Base: {parseFloat(gas.baseFee).toFixed(2)} Gwei</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-green-500/5 rounded-lg">
                    <div className="text-xs text-white/30 mb-1">Low</div>
                    <div className="text-green-400 font-mono text-sm">{parseFloat(gas.low).toFixed(2)}</div>
                  </div>
                  <div className="text-center p-2 bg-yellow-500/5 rounded-lg">
                    <div className="text-xs text-white/30 mb-1">Average</div>
                    <div className="text-yellow-400 font-mono text-sm">{parseFloat(gas.average).toFixed(2)}</div>
                  </div>
                  <div className="text-center p-2 bg-red-500/5 rounded-lg">
                    <div className="text-xs text-white/30 mb-1">High</div>
                    <div className="text-red-400 font-mono text-sm">{parseFloat(gas.high).toFixed(2)}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-white/20 text-xs">
                    {gas.baseFee ? `${parseFloat(gas.baseFee).toFixed(2)} base fee` : ''}
                  </span>
                  <span className="text-white/20 text-xs" title="Gwei is a tiny unit of ETH (1 Gwei = 0.000000001 ETH)">
                    {gas.unit} ⓘ
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
