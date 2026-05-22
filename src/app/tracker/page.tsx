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
    try { ethers.getAddress(address) } catch { setError('Invalid EVM address format'); return }

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
      if (data.error) setError(data.error)
      else setTransfers(data.transfers || [])
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('Failed to track funds. Please try again.')
    } finally {
      if (!controller.signal.aborted) setTracking(false)
    }
  }

  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString()
  const getExplorerUrl = (chainId: number, hash: string) => `${getExplorerBaseUrl(chainId)}/tx/${hash}`

  const regular = transfers.filter(t => !t.isExchangeDeposit && !t.isDrainerTransfer)
  const exchange = transfers.filter(t => t.isExchangeDeposit)
  const drainer = transfers.filter(t => t.isDrainerTransfer)

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#00ff87]/3 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-[#00e5ff]/3 rounded-full blur-[128px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        {/* Header */}
        <div className="mb-10 animate-[fade-in_0.6s_ease-out]">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            ⛓️ Fund Tracker
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">Track where stolen funds have been sent across all chains</p>
        </div>

        {/* Input */}
        <form onSubmit={e => { e.preventDefault(); trackFunds() }} className="mb-10 animate-[fade-in_0.6s_ease-out_0.1s_both]">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00ff87]/20 to-[#00e5ff]/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex gap-2">
              <div className="flex-1">
                <AddressInput
                  value={address}
                  onChange={setAddress}
                  onResolved={setResolvedAddress}
                  placeholder="Enter wallet address (0x...) or ENS name"
                  chainId={1}
                  inputClassName="text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={tracking}
                className="px-6 py-4 bg-gradient-to-r from-[#00ff87] to-[#00e5ff] text-black font-semibold rounded-2xl text-sm disabled:opacity-40 hover:shadow-[0_0_30px_rgba(0,255,135,0.3)] transition-all duration-300 active:scale-95"
              >
                {tracking ? '...' : '⛓️ Track'}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="p-4 bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 rounded-xl text-[#ff3b3b] text-sm mb-6 animate-[fade-in_0.3s_ease-out]">{error}</div>
        )}

        {/* Loading */}
        {tracking && (
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-4 animate-pulse" style={{ animationDelay: `${i*100}ms` }}>
                <div className="w-4 h-4 rounded-full bg-white/5 shrink-0" />
                <div className="flex-1 h-16 bg-white/5 border border-white/10 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {transfers.length > 0 && (
          <div className="animate-[fade-in_0.6s_ease-out]">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { label: 'Regular', count: regular.length, color: '#00ff87', icon: '✓' },
                { label: 'Exchange', count: exchange.length, color: '#fbbf24', icon: '🏦' },
                { label: 'Drainer', count: drainer.length, color: '#ff3b3b', icon: '🚨' },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center transition-all duration-300 hover:-translate-y-0.5 animate-[fade-in_0.5s_ease-out_both]"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</div>
                  <div className="text-gray-500 text-xs">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <h2 className="text-lg font-semibold mb-4 text-white/80">Fund Movements ({transfers.length})</h2>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[7px] top-0 bottom-0 w-px bg-white/5" />

              <div className="space-y-4">
                {transfers.map((transfer, i) => {
                  const borderColor = transfer.isExchangeDeposit
                    ? 'border-yellow-400/20'
                    : transfer.isDrainerTransfer
                    ? 'border-[#ff3b3b]/20'
                    : 'border-white/10'
                  const dotColor = transfer.isExchangeDeposit
                    ? 'bg-yellow-400'
                    : transfer.isDrainerTransfer
                    ? 'bg-[#ff3b3b]'
                    : 'bg-[#00ff87]'

                  return (
                    <div key={i} className="flex gap-4 animate-[fade-in_0.4s_ease-out_both]" style={{ animationDelay: `${i * 60}ms` }}>
                      {/* Dot */}
                      <div className="relative z-10 mt-5">
                        <div className={`w-[15px] h-[15px] rounded-full ${dotColor} shadow-[0_0_8px_currentColor]`} />
                      </div>

                      {/* Card */}
                      <div className={`flex-1 bg-white/5 backdrop-blur-xl border ${borderColor} rounded-xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.07]`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500 border border-white/5">
                                {transfer.chainName}
                              </span>
                              {transfer.isExchangeDeposit && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                                  🏦 {transfer.exchangeName}
                                </span>
                              )}
                              {transfer.isDrainerTransfer && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff3b3b]/10 text-[#ff3b3b] border border-[#ff3b3b]/20">
                                  🚨 {transfer.drainerName}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 space-y-0.5">
                              <p>From: <code className="text-gray-400 font-mono">{transfer.from.slice(0, 8)}...{transfer.from.slice(-6)}</code></p>
                              <p>To: <code className="text-gray-400 font-mono">{transfer.to.slice(0, 8)}...{transfer.to.slice(-6)}</code></p>
                            </div>
                            <div className="mt-2">
                              <span className="text-[#00ff87] font-semibold text-sm">{transfer.value} {transfer.asset}</span>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <a
                              href={getExplorerUrl(transfer.chainId, transfer.hash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#00ff87]/40 text-xs hover:text-[#00ff87] transition-colors font-mono"
                            >
                              {transfer.hash.slice(0, 10)}...
                            </a>
                            <div className="text-gray-600 text-xs mt-1">{formatDate(transfer.timestamp)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!tracking && transfers.length === 0 && !error && (
          <div className="text-center py-20 animate-[fade-in_0.6s_ease-out]">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-[#00e5ff]/10 blur-3xl rounded-full" />
              <span className="text-7xl relative">⛓️</span>
            </div>
            <p className="text-gray-500 text-lg mb-2">Enter a wallet address to track</p>
            <p className="text-gray-600 text-sm">We&apos;ll scan all chains for fund movements</p>
          </div>
        )}
      </div>
    </main>
  )
}
