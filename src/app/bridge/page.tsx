'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { CHAINS } from '@/lib/chains'
import { getBridgeRoutes, type BridgeRoute } from '@/lib/bridge'

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
  routes?: BridgeRoute[]
}

export default function BridgePage() {
  const [fromChain, setFromChain] = useState(1)
  const [toChain, setToChain] = useState(8453)
  const [token, setToken] = useState('ETH')
  const [result, setResult] = useState<BridgeResult | null>(null)
  const [localRoutes, setLocalRoutes] = useState<BridgeRoute[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showGuide, setShowGuide] = useState(true)
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
    setLocalRoutes([])

    // Get local bridge routes from the bridge library
    const routes = getBridgeRoutes(fromChain, toChain, token)
    setLocalRoutes(routes)

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
        setResult({ ...data, routes })
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      // If API fails but we have local routes, still show them
      if (routes.length > 0) {
        setResult({
          fromChain,
          toChain,
          fromChainName: CHAINS[fromChain]?.name || 'Unknown',
          toChainName: CHAINS[toChain]?.name || 'Unknown',
          estimatedFee: routes[0].fee,
          estimatedTime: routes[0].estimatedTime,
          bridge: routes[0].bridge,
          bridgeUrl: routes[0].bridgeUrl,
          routes,
        })
      } else {
        setError('Failed to fetch bridge route. Please check your connection and try again.')
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-blue-500/[0.03] rounded-full blur-[100px]" />
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

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🌉 Cross-Chain Bridge</h1>
        <p className="text-white/40 mb-8">Find the best bridge route between chains</p>

        {/* Guide */}
        {showGuide && (
          <div className="mb-8 p-5 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-green-400">📖 What is a Bridge?</h2>
              <button onClick={() => setShowGuide(false)} className="text-white/30 hover:text-white/60 text-xs">Hide ✕</button>
            </div>
            <div className="space-y-2 text-xs text-white/50">
              <p>A <strong className="text-white/70">bridge</strong> lets you move tokens from one blockchain to another (e.g., Ethereum → Base).</p>
              <p>💡 Select the chain your tokens are on (From) and the chain you want them on (To), then find the best route.</p>
              <p>⚠️ Bridges charge fees and take time — we'll show you the estimated cost and duration.</p>
            </div>
          </div>
        )}

        {/* Token selector */}
        <div className="mb-6">
          <label htmlFor="token" className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Token</label>
          <select
            id="token"
            value={token}
            onChange={e => setToken(e.target.value)}
            className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white focus:outline-none focus:border-green-500/40 text-sm"
          >
            <option value="ETH">⟠ ETH</option>
            <option value="USDC">💵 USDC</option>
            <option value="USDT">💵 USDT</option>
            <option value="DAI">💵 DAI</option>
            <option value="WETH">⟠ WETH</option>
            <option value="WBTC">₿ WBTC</option>
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <label htmlFor="from-chain" className="text-xs text-white/30 uppercase tracking-wider mb-2 block">From Chain</label>
            <select
              id="from-chain"
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
            <label htmlFor="to-chain" className="text-xs text-white/30 uppercase tracking-wider mb-2 block">To Chain</label>
            <select
              id="to-chain"
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
          className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50 mb-2"
        >
          {loading ? 'Searching...' : '🔍 Find Bridge Route'}
        </button>
        {fromChain === toChain && (
          <p className="text-yellow-400/60 text-xs mb-6">⚠️ Please select two different chains to bridge between.</p>
        )}

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

            {result.routes && result.routes.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-white/30 mb-2">{result.routes.length} route{result.routes.length > 1 ? 's' : ''} found — sorted by fee</p>
                {result.routes.map((route, i) => (
                  <div key={i} className={`p-4 rounded-xl border ${i === 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-white/[0.02] border-white/[0.05]'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {i === 0 && <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full font-semibold">Best</span>}
                        <span className="font-semibold">{route.bridge}</span>
                      </div>
                      <span className="text-white/40 text-xs">{route.token}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-white/30">Fee</span>
                        <p className="font-semibold text-sm">{route.fee}</p>
                      </div>
                      <div>
                        <span className="text-xs text-white/30">Time</span>
                        <p className="font-semibold text-sm">{route.estimatedTime}</p>
                      </div>
                    </div>
                    <a
                      href={route.bridgeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-3 w-full px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-semibold text-xs text-center hover:from-green-500 hover:to-emerald-500 transition-all"
                    >
                      🔗 Open {route.bridge} →
                    </a>
                  </div>
                ))}
              </div>
            ) : result.bridge ? (
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
