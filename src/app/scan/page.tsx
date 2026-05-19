'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface ScanResult {
  address: string
  delegation: {
    hasDelegation: boolean
    delegatedTo: string | null
    isDrainer: boolean
    drainerName?: string
  }
  assets: {
    type: string
    symbol: string
    balance: string
    balanceFormatted: string
    chainId: number
    chainName: string
  }[]
  chains: number[]
}

function ScanContent() {
  const searchParams = useSearchParams()
  const addressParam = searchParams.get('address')

  const [address, setAddress] = useState(addressParam || '')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')

  const scanWallet = useCallback(async (addr: string) => {
    if (!addr || !addr.startsWith('0x') || addr.length !== 42) {
      setError('Please enter a valid EVM address')
      return
    }

    setScanning(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch(`/api/scan?address=${addr}`)
      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        setResult(data)
      }
    } catch {
      setError('Failed to scan wallet. Please try again.')
    } finally {
      setScanning(false)
    }
  }, [])

  useEffect(() => {
    if (addressParam) {
      scanWallet(addressParam)
    }
  }, [addressParam, scanWallet])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    scanWallet(address)
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            SweepGuard
          </span>
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Wallet Scanner</h1>
        <p className="text-white/40 mb-8">Check for EIP-7702 delegations and wallet assets</p>

        {/* Scan Form */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter wallet address (0x...)"
            className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm"
          />
          <button
            type="submit"
            disabled={scanning}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50"
          >
            {scanning ? 'Scanning...' : 'Scan'}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {scanning && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-green-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scanning all chains...
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Delegation Warning */}
            {result.delegation.hasDelegation && (
              <div className={`p-5 rounded-2xl border ${
                result.delegation.isDrainer
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-yellow-500/10 border-yellow-500/30'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{result.delegation.isDrainer ? '🚨' : '⚠️'}</span>
                  <div>
                    <h3 className={`font-bold text-lg ${
                      result.delegation.isDrainer ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {result.delegation.isDrainer ? 'KNOWN DRAINER DETECTED' : 'EIP-7702 Delegation Found'}
                    </h3>
                    <p className="text-white/50 text-sm mt-1">
                      Delegated to: <code className="text-white/70">{result.delegation.delegatedTo}</code>
                    </p>
                    {result.delegation.drainerName && (
                      <p className="text-red-300 text-sm mt-1 font-medium">
                        ⚠️ {result.delegation.drainerName}
                      </p>
                    )}
                    <p className="text-white/40 text-xs mt-3">
                      This wallet has delegated execution to another contract. If you didn&apos;t authorize this, your wallet is compromised.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Assets */}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Assets Found ({result.assets.length})
              </h2>
              {result.assets.length === 0 ? (
                <div className="text-center py-8 text-white/30">
                  No assets found on scanned chains
                </div>
              ) : (
                <div className="space-y-2">
                  {result.assets.map((asset, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                      <div>
                        <span className="font-medium">{asset.symbol}</span>
                        <span className="text-white/30 text-xs ml-2">{asset.chainName}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm">{parseFloat(asset.balanceFormatted).toFixed(6)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Next Steps */}
            <div className="p-6 bg-green-500/5 border border-green-500/20 rounded-2xl">
              <h3 className="font-bold text-green-400 mb-3">🛡️ Protect This Wallet</h3>
              <p className="text-white/50 text-sm mb-4">
                Set up auto-sweep protection to automatically transfer any incoming funds to your safe wallet.
              </p>
              <Link
                href={`/dashboard?address=${result.address}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm hover:from-green-500 hover:to-emerald-500 transition-all"
              >
                Set Up Protection →
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/30">
        <div className="inline-flex items-center gap-3">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      </div>
    }>
      <ScanContent />
    </Suspense>
  )
}
