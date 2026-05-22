'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'
import { getExplorerBaseUrl } from '@/lib/validation'
import AddressInput from '@/components/AddressInput'

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
  drainerName?: string
}

export default function TrackerPage() {
  const [address, setAddress] = useState('')
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const [tracking, setTracking] = useState(false)
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const trackFunds = async () => {
    if (!address) { setError('Please enter a wallet address'); return }
    try {
      ethers.getAddress(address)
    } catch {
      setError('Invalid EVM address format'); return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setTracking(true)
    setError('')
    setTransfers([])

    try {
      const res = await fetch(`/api/track?address=${address}`, { signal: controller.signal })
      if (controller.signal.aborted) return
      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        setTransfers(data.transfers || [])
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('Failed to track funds. Please try again.')
    } finally {
      if (!controller.signal.aborted) setTracking(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    trackFunds()
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getExplorerUrl = (chainId: number, hash: string) => {
    return `${getExplorerBaseUrl(chainId)}/tx/${hash}`
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
        <div className="flex gap-4">
          <Link href="/scan" className="text-sm text-white/50 hover:text-white transition-colors">Scan</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">Dashboard</Link>
          <Link href="/wallets" className="text-sm text-white/50 hover:text-white transition-colors">Wallets</Link>
          <Link href="/history" className="text-sm text-white/50 hover:text-white transition-colors">History</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Fund Tracker</h1>
        <p className="text-white/40 mb-8">Track where stolen funds have been sent</p>

        {/* Help Text */}
        {!tracking && transfers.length === 0 && !error && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl mb-8">
            <h3 className="text-blue-400 font-semibold text-sm mb-2">💡 How Fund Tracking Works</h3>
            <p className="text-white/50 text-sm">Enter a compromised wallet address and we'll scan all supported chains (Ethereum, Base, BSC, Arbitrum, Polygon, Optimism) to trace where the funds were sent. Transfers are classified as:</p>
            <ul className="text-white/40 text-xs mt-2 space-y-1">
              <li>• <span className="text-yellow-400">🏦 Exchange deposits</span> — funds sent to known exchanges (potential recovery targets)</li>
              <li>• <span className="text-red-400">🚨 Drainer transfers</span> — transfers linked to known drainer contracts</li>
              <li>• <span className="text-green-400">Regular</span> — other wallet-to-wallet transfers</li>
            </ul>
          </div>
        )}

        {/* Track Form */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
          <div className="flex-1">
            <AddressInput
              value={address}
              onChange={setAddress}
              onResolved={setResolvedAddress}
              placeholder="Enter wallet address to track (0x...) or ENS name"
              chainId={1}
              inputClassName="text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={tracking}
            aria-label="Track fund movements"
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50"
          >
            {tracking ? 'Tracking...' : 'Track Funds'}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {tracking && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-green-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Tracking fund movements...
            </div>
          </div>
        )}

        {/* Results */}
        {transfers.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                Fund Movements ({transfers.length})
              </h2>
            </div>

            <div className="space-y-3">
              {transfers.map((transfer, i) => (
                <div key={i} className={`p-4 rounded-xl border ${
                  transfer.isExchangeDeposit
                    ? 'bg-yellow-500/5 border-yellow-500/20'
                    : transfer.isDrainerTransfer
                    ? 'bg-red-500/5 border-red-500/20'
                    : 'bg-white/[0.02] border-white/[0.05]'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-white/30 text-xs">{transfer.chainName}</span>
                        {transfer.isExchangeDeposit && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 rounded-full text-yellow-400 text-xs">
                            🏦 {transfer.exchangeName}
                          </span>
                        )}
                        {transfer.isDrainerTransfer && (
                          <span className="px-2 py-0.5 bg-red-500/20 rounded-full text-red-400 text-xs">
                            🚨 {transfer.drainerName}
                          </span>
                        )}
                      </div>

                      <div className="text-sm">
                        <span className="text-white/50">From: </span>
                        <span className="font-mono text-white/70">{transfer.from.slice(0, 8)}...{transfer.from.slice(-6)}</span>
                      </div>

                      <div className="text-sm mt-1">
                        <span className="text-white/50">To: </span>
                        <span className="font-mono text-white/70">{transfer.to.slice(0, 8)}...{transfer.to.slice(-6)}</span>
                      </div>

                      <div className="text-sm mt-2">
                        <span className="text-green-400 font-semibold">{transfer.value} {transfer.asset}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <a
                        href={getExplorerUrl(transfer.chainId, transfer.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400/50 text-xs hover:text-green-400 font-mono"
                      >
                        {transfer.hash.slice(0, 10)}...
                      </a>
                      <div className="text-white/20 text-xs mt-1">
                        {formatDate(transfer.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-8 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              <h3 className="font-semibold mb-2">Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {transfers.filter(t => !t.isExchangeDeposit && !t.isDrainerTransfer).length}
                  </div>
                  <div className="text-white/30 text-xs">Regular</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400">
                    {transfers.filter(t => t.isExchangeDeposit).length}
                  </div>
                  <div className="text-white/30 text-xs">Exchange</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">
                    {transfers.filter(t => t.isDrainerTransfer).length}
                  </div>
                  <div className="text-white/30 text-xs">Drainer</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No results */}
        {!tracking && transfers.length === 0 && !error && (
          <div className="text-center py-12 text-white/30">
            <p className="text-lg mb-2">Enter a wallet address to track</p>
            <p className="text-sm">We&apos;ll scan all chains for fund movements</p>
          </div>
        )}
      </div>
    </main>
  )
}
