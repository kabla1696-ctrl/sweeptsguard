'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'
import { CHAINS } from '@/lib/chains'

interface GasData {
  chainId: number
  chainName: string
  gasPrice: string
  maxFeePerGas: string
  maxPriorityFee: string
  estimatedCost: string
  speed: 'slow' | 'standard' | 'fast'
}

export default function GasOptimizerPage() {
  const [gasData, setGasData] = useState<GasData[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedChain, setSelectedChain] = useState<number | null>(null)
  const [txValue, setTxValue] = useState('0.1')
  const [error, setError] = useState('')

  const fetchGasPrices = async () => {
    setLoading(true)
    setError('')
    try {
      const chains = Object.values(CHAINS).filter(c => c.id !== 0 && c.id !== 10143).slice(0, 12)
      const results: GasData[] = []

      for (const chain of chains) {
        try {
          const provider = new ethers.JsonRpcProvider(chain.rpc)
          const feeData = await provider.getFeeData()

          const gasPrice = feeData.gasPrice || 0n
          const maxFee = feeData.maxFeePerGas || gasPrice
          const maxPriority = feeData.maxPriorityFeePerGas || 0n

          // Estimate cost for a simple ETH transfer (21000 gas)
          const gasLimit = 21000n
          const cost = maxFee * gasLimit
          const costEth = parseFloat(ethers.formatEther(cost))

          results.push({
            chainId: chain.id,
            chainName: chain.name,
            gasPrice: ethers.formatUnits(gasPrice, 'gwei'),
            maxFeePerGas: ethers.formatUnits(maxFee, 'gwei'),
            maxPriorityFee: ethers.formatUnits(maxPriority, 'gwei'),
            estimatedCost: `${costEth.toFixed(6)} ${chain.nativeCurrency}`,
            speed: costEth < 0.001 ? 'slow' : costEth < 0.01 ? 'standard' : 'fast'
          })
        } catch {
          // Skip failed chains
        }
      }

      setGasData(results.sort((a, b) => parseFloat(a.maxFeePerGas) - parseFloat(b.maxFeePerGas)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch gas prices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGasPrices()
  }, [])

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-yellow-500/[0.04] rounded-full blur-[120px]" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">⛽ Gas Optimizer</h1>
        <p className="text-white/40 mb-8">Compare gas prices across all chains in real-time</p>

        <button
          onClick={fetchGasPrices}
          disabled={loading}
          className="mb-6 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl font-semibold disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : '🔄 Refresh Gas Prices'}
        </button>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">{error}</div>
        )}

        {loading && gasData.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-yellow-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Fetching gas prices from {Object.keys(CHAINS).length} chains...
            </div>
          </div>
        )}

        {gasData.length > 0 && (
          <div className="space-y-3">
            {gasData.map((data, i) => (
              <button
                key={data.chainId}
                onClick={() => setSelectedChain(selectedChain === data.chainId ? null : data.chainId)}
                className={`w-full p-5 rounded-2xl border text-left transition-all ${
                  selectedChain === data.chainId
                    ? 'bg-green-500/[0.06] border-green-500/20'
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-white/30">#{i + 1}</span>
                    <div>
                      <div className="font-semibold">{data.chainName}</div>
                      <div className="text-xs text-white/40">Chain ID: {data.chainId}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">{data.maxFeePerGas} gwei</div>
                    <div className={`text-xs ${
                      data.speed === 'slow' ? 'text-green-400' :
                      data.speed === 'standard' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {data.estimatedCost}
                    </div>
                  </div>
                </div>

                {selectedChain === data.chainId && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06] grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-white/40">Gas Price</div>
                      <div className="font-mono">{data.gasPrice} gwei</div>
                    </div>
                    <div>
                      <div className="text-white/40">Max Fee</div>
                      <div className="font-mono">{data.maxFeePerGas} gwei</div>
                    </div>
                    <div>
                      <div className="text-white/40">Priority Fee</div>
                      <div className="font-mono">{data.maxPriorityFee} gwei</div>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {!loading && gasData.length === 0 && !error && (
          <div className="text-center py-16 text-white/20">
            <div className="text-5xl mb-4">⛽</div>
            <p>Click refresh to fetch gas prices</p>
          </div>
        )}
      </div>
    </main>
  )
}
