'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { CHAINS } from '@/lib/chains'

interface BridgeResult {
  fromChain: number
  toChain: number
  fromChainName: string
  toChainName: string
  estimatedFee: string
  estimatedTime: string
  bridge: string
  bridgeUrl: string
  message?: string
  suggestedBridges?: { name: string; url: string }[]
}

export default function BridgePage() {
  const [fromChain, setFromChain] = useState(1)
  const [toChain, setToChain] = useState(8453)
  const [result, setResult] = useState<BridgeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const chains = Object.values(CHAINS)

  const handleSearch = async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`/api/bridge?from=${fromChain}&to=${toChain}`, { signal: controller.signal })
      if (controller.signal.aborted) return
      if (!res.ok) {
        const errData = await res.json().catch(() => null) as { error?: string } | null
        setError(errData?.error || `Request failed with status ${res.status}`)
        return
      }
      const data = await res.json() as BridgeResult & { error?: string }
      if (data.error) {
        setError(data.error)
      } else {
        setResult(data)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('Failed to fetch bridge route. Please check your connection and try again.')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
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

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🌉 Cross-Chain Bridge</h1>
        <p className="text-white/40 mb-8">Find the best bridge route between chains</p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">From Chain</label>
            <select
              value={fromChain}
              onChange={e => setFromChain(Number(e.target.value))}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white focus:outline-none focus:border-green-500/40 text-sm"
            >
              {chains.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">To Chain</label>
            <select
              value={toChain}
              onChange={e => setToChain(Number(e.target.value))}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white focus:outline-none focus:border-green-500/40 text-sm"
            >
              {chains.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading || fromChain === toChain}
          aria-label="Find bridge route"
          className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50 mb-8"
        >
          {loading ? 'Searching...' : '🔍 Find Bridge Route'}
        </button>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">{error}</div>
        )}

        {result && (
          <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-lg font-semibold">{result.fromChainName}</span>
              <span className="text-white/30">→</span>
              <span className="text-lg font-semibold">{result.toChainName}</span>
            </div>

            {result.bridge ? (
              <div className="space-y-3">
                <div className="p-3 bg-green-500/5 rounded-xl">
                  <span className="text-xs text-white/30">Recommended Bridge</span>
                  <p className="font-semibold text-green-400">{result.bridge}</p>
                </div>
                <div className="p-3 bg-white/[0.02] rounded-xl">
                  <span className="text-xs text-white/30">Estimated Time</span>
                  <p className="font-semibold">{result.estimatedTime}</p>
                </div>
                <div className="p-3 bg-white/[0.02] rounded-xl">
                  <span className="text-xs text-white/30">Estimated Fee</span>
                  <p className="font-semibold">{result.estimatedFee}</p>
                </div>
                {result.bridgeUrl && (
                  <a
                    href={result.bridgeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm text-center hover:from-green-500 hover:to-emerald-500 transition-all"
                  >
                    🔗 Open {result.bridge} →
                  </a>
                )}
              </div>
            ) : (
              <div>
                <p className="text-white/40 text-sm mb-4">{result.message}</p>
                {result.suggestedBridges && (
                  <div className="space-y-2">
                    {result.suggestedBridges.map((b, i) => (
                      <a
                        key={i}
                        href={b.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:border-green-500/20 transition-all"
                      >
                        <span className="text-green-400">{b.name}</span>
                        <span className="text-white/30 text-xs ml-2">{b.url}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
