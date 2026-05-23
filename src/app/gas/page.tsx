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

const CHAIN_COLORS: Record<string, string> = {
  Ethereum: '#627eea',
  Base: '#0052ff',
  BSC: '#f3ba2f',
  Arbitrum: '#28a0f0',
  Polygon: '#8247e5',
  Optimism: '#ff0420',
}

function getGasLevel(avg: string): { label: string; color: string; bg: string } {
  const val = parseFloat(avg)
  if (val < 5) return { label: 'Low', color: 'text-[#00ff87]', bg: 'bg-[#00ff87]/10' }
  if (val < 20) return { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-400/10' }
  return { label: 'High', color: 'text-[#ff3b3b]', bg: 'bg-[#ff3b3b]/10' }
}

function GasGauge({ value, max = 50 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100)
  const color = pct < 30 ? '#00ff87' : pct < 60 ? '#00e5ff' : pct < 80 ? '#fbbf24' : '#ff3b3b'
  return (
    <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 12px ${color}44`,
        }}
      />
    </div>
  )
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
    <main className="min-h-screen bg-gradient-to-br from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00ff87]/5 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00e5ff]/5 rounded-full blur-[128px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        {/* Header */}
        <div className="mb-10 animate-[fade-in_0.6s_ease-out]">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            ⛽ Gas Tracker
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">Real-time gas prices across all supported chains</p>
        </div>

        {/* Guide */}
        {showGuide && (
          <div className="mb-8 p-5 bg-[#00ff87]/5 backdrop-blur-xl border border-[#00ff87]/20 rounded-2xl animate-[fade-in_0.6s_ease-out_0.1s_both]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#00ff87]">📖 What is Gas?</h2>
              <button onClick={() => setShowGuide(false)} className="text-white/30 hover:text-white/60 text-xs transition-colors">Hide ✕</button>
            </div>
            <div className="space-y-2 text-xs text-gray-400">
              <p><strong className="text-white/70">Gas</strong> is the fee you pay to make transactions on a blockchain. Think of it like a processing fee.</p>
              <p><strong className="text-white/70">Gwei</strong> is a tiny unit of the blockchain&apos;s currency (1 Gwei = 0.000000001 ETH).</p>
              <p>💡 <strong className="text-[#00ff87]">Low</strong> = cheapest (slowest) · <strong className="text-yellow-400">Average</strong> = normal speed · <strong className="text-[#ff3b3b]">High</strong> = fastest (most expensive)</p>
              <p>🔄 Prices auto-refresh every 15 seconds.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 rounded-xl text-[#ff3b3b] text-sm mb-6 animate-[fade-in_0.3s_ease-out]">{error}</div>
        )}

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-pulse" style={{ animationDelay: `${i*100}ms` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5" />
                  <div className="h-4 w-24 bg-white/5 rounded" />
                </div>
                <div className="h-3 bg-white/5 rounded-full mb-4" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-16 bg-white/5 rounded-xl" />
                  <div className="h-16 bg-white/5 rounded-xl" />
                  <div className="h-16 bg-white/5 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : gasPrices.length === 0 && !error ? (
          <div className="text-center py-16 text-white/30">No gas data available. Retrying...</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gasPrices.map((gas, idx) => {
              const level = getGasLevel(gas.average)
              const chainColor = CHAIN_COLORS[gas.chainName] || '#627eea'
              return (
                <div
                  key={gas.chainId}
                  className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_0_30px_rgba(0,255,135,0.08)] animate-[fade-in_0.6s_ease-out_both]"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  {/* Chain header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{ background: `${chainColor}20`, border: `1px solid ${chainColor}40` }}
                      >
                        {gas.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{gas.chainName}</h3>
                        {gas.baseFee && (
                          <span className="text-gray-500 text-xs">Base: {parseFloat(gas.baseFee).toFixed(2)} Gwei</span>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${level.bg} ${level.color}`}>
                      {level.label}
                    </span>
                  </div>

                  {/* Gauge */}
                  <GasGauge value={parseFloat(gas.average)} />

                  {/* Price tiers */}
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="text-center p-3 bg-[#00ff87]/5 rounded-xl border border-[#00ff87]/10">
                      <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Low</div>
                      <div className="text-[#00ff87] font-mono text-sm font-semibold">{parseFloat(gas.low).toFixed(2)}</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-400/5 rounded-xl border border-yellow-400/10">
                      <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Avg</div>
                      <div className="text-yellow-400 font-mono text-sm font-semibold">{parseFloat(gas.average).toFixed(2)}</div>
                    </div>
                    <div className="text-center p-3 bg-[#ff3b3b]/5 rounded-xl border border-[#ff3b3b]/10">
                      <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">High</div>
                      <div className="text-[#ff3b3b] font-mono text-sm font-semibold">{parseFloat(gas.high).toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-gray-600 text-[10px]">{gas.unit}</span>
                    {level.label === 'Low' && (
                      <span className="text-[10px] text-[#00ff87]/70 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00ff87] animate-pulse" />
                        Good time to transact
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
