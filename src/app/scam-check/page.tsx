'use client'

import { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { isValidAddress } from '@/lib/validation'

interface ScamResult {
  address: string
  riskScore: number
  riskLevel: string
  flags: { type: string; severity: string; description: string }[]
  recommendation: string
}

function ScamCheckContent() {
  const searchParams = useSearchParams()
  const addressParam = searchParams.get('address')

  const [address, setAddress] = useState(addressParam || '')
  const [result, setResult] = useState<ScamResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const checkAddress = useCallback(async (addr: string) => {
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
    setResult(null)
    try {
      const res = await fetch(`/api/scam-check?address=${trimmed}`, { signal: controller.signal })
      if (controller.signal.aborted) return
      const data = await res.json() as ScamResult & { error?: string }
      if (data.error) {
        setError(data.error)
      } else {
        setResult(data)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('Check failed')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    checkAddress(address.trim())
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/20'
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/20'
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      default: return 'text-green-400 bg-green-500/10 border-green-500/20'
    }
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-red-500/[0.04] rounded-full blur-[120px]" />
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

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">AI Scam Detection</h1>
        <p className="text-white/40 mb-8">Analyze transaction patterns and detect potential scams</p>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Enter address or token contract (0x...)"
            aria-label="Address or token to check for scam"
            className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            aria-label="Check for scam indicators"
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : '🔍 Check'}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">{error}</div>
        )}

        {result && (
          <div className="space-y-6">
            <div className={`p-6 rounded-2xl border ${getRiskColor(result.riskLevel)}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Risk Assessment</h2>
                <span className="text-3xl font-bold">{result.riskScore}/100</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(result.riskLevel)}`}>
                  {result.riskLevel.toUpperCase()}
                </span>
              </div>
              <p className="text-white/60 text-sm mt-3">{result.recommendation}</p>
            </div>

            {result.flags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Flags Detected</h3>
                <div className="space-y-2">
                  {result.flags.map((flag, i) => (
                    <div key={i} className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl flex items-start gap-3">
                      <span className={flag.severity === 'danger' ? 'text-red-400' : flag.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'}>
                        {flag.severity === 'danger' ? '🚨' : flag.severity === 'warning' ? '⚠️' : 'ℹ️'}
                      </span>
                      <div>
                        <span className="text-sm font-medium">{flag.type}</span>
                        <p className="text-white/40 text-xs mt-0.5">{flag.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

export default function ScamCheckPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030305] flex items-center justify-center text-white/30">Loading...</div>}>
      <ScamCheckContent />
    </Suspense>
  )
}
