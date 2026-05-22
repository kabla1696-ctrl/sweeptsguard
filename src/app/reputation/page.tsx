'use client'

import { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { isValidAddress } from '@/lib/validation'

interface ReputationResult {
  address: string
  score: number
  level: string
  txCount: number
  firstSeen: string | null
  ageInDays: number
  scamReports: number
  isContract: boolean
  tags: string[]
  details: string[]
}

function ReputationContent() {
  const searchParams = useSearchParams()
  const addressParam = searchParams.get('address')

  const [address, setAddress] = useState(addressParam || '')
  const [result, setResult] = useState<ReputationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const checkReputation = useCallback(async (addr: string) => {
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
      const res = await fetch(`/api/reputation?address=${trimmed}`, { signal: controller.signal })
      if (controller.signal.aborted) return
      const data = await res.json() as ReputationResult & { error?: string }
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
    checkReputation(address.trim())
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'verified': return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'trusted': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'neutral': return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      case 'suspicious': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      default: return 'text-white/40 bg-white/[0.05] border-white/[0.1]'
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
        <h1 className="text-3xl font-bold mb-2">Address Reputation</h1>
        <p className="text-white/40 mb-8">Check address history, scam reports, and trust score</p>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Enter address (0x...)"
            aria-label="Address to check reputation"
            className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            aria-label="Check address reputation"
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50"
          >
            {loading ? 'Checking...' : '🔍 Check'}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">{error}</div>
        )}

        {result && (
          <div className="space-y-6">
            <div className={`p-6 rounded-2xl border ${getLevelColor(result.level)}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Reputation Score</h2>
                <span className="text-3xl font-bold">{result.score}/100</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(result.level)}`}>
                {result.level.toUpperCase()}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <span className="text-xs text-white/30 block mb-1">Transaction Count</span>
                <span className="text-lg font-semibold">{result.txCount.toLocaleString()}</span>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <span className="text-xs text-white/30 block mb-1">Age</span>
                <span className="text-lg font-semibold">{result.ageInDays > 0 ? `${result.ageInDays} days` : 'Unknown'}</span>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <span className="text-xs text-white/30 block mb-1">Contract</span>
                <span className="text-lg font-semibold">{result.isContract ? 'Yes' : 'No'}</span>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <span className="text-xs text-white/30 block mb-1">Scam Reports</span>
                <span className="text-lg font-semibold">{result.scamReports}</span>
              </div>
            </div>

            {result.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-white/50">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {result.tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-white/[0.05] border border-white/[0.1] rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.details.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-white/50">Details</h3>
                <div className="space-y-1">
                  {result.details.map((detail, i) => (
                    <p key={i} className="text-white/40 text-sm">• {detail}</p>
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

export default function ReputationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/30">Loading...</div>}>
      <ReputationContent />
    </Suspense>
  )
}
