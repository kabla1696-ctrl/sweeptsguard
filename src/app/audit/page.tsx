'use client'

import { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { isValidAddress } from '@/lib/validation'

interface AuditResult {
  address: string
  chainId: number
  isAudited: boolean
  auditors: string[]
  riskScore: number
  issues: string[]
  source: string
  reportUrl?: string
}

function AuditContent() {
  const searchParams = useSearchParams()
  const addressParam = searchParams.get('address')

  const [address, setAddress] = useState(addressParam || '')
  const [result, setResult] = useState<AuditResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const checkAudit = useCallback(async (addr: string) => {
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
      const res = await fetch(`/api/audit?address=${trimmed}`, { signal: controller.signal })
      if (controller.signal.aborted) return
      const data = await res.json() as AuditResult & { error?: string }
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
    checkAudit(address.trim())
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
        <h1 className="text-3xl font-bold mb-2">Contract Audit Checker</h1>
        <p className="text-white/40 mb-8">Check if a smart contract is audited by known security firms</p>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Enter contract address (0x...)"
            className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            aria-label="Check contract audit status"
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
            <div className={`p-6 rounded-2xl border ${
              result.isAudited
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-yellow-500/10 border-yellow-500/20'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{result.isAudited ? '✅' : '⚠️'}</span>
                <div>
                  <h2 className="text-xl font-bold">
                    {result.isAudited ? 'Contract Audited' : 'No Audit Found'}
                  </h2>
                  <span className="text-white/40 text-sm">Source: {result.source}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-sm">Risk Score:</span>
                <span className={`font-bold text-lg ${
                  result.riskScore >= 70 ? 'text-green-400' :
                  result.riskScore >= 40 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {result.riskScore}/100
                </span>
              </div>
            </div>

            {result.auditors.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-white/50">Auditors</h3>
                <div className="flex flex-wrap gap-2">
                  {result.auditors.map((auditor, i) => (
                    <span key={i} className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-xs text-green-400">
                      {auditor}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.issues.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-white/50">Issues</h3>
                <div className="space-y-1">
                  {result.issues.map((issue, i) => (
                    <p key={i} className="text-yellow-400/80 text-sm">⚠️ {issue}</p>
                  ))}
                </div>
              </div>
            )}

            {result.reportUrl && (
              <a
                href={result.reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm text-center hover:from-green-500 hover:to-emerald-500 transition-all"
              >
                📄 View Audit Report →
              </a>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

export default function AuditPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/30">Loading...</div>}>
      <AuditContent />
    </Suspense>
  )
}
