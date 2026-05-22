'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'
import { CHAINS } from '@/lib/chains'
import AddressInput from '@/components/AddressInput'

interface DeFiPosition {
  protocol: string
  type: 'lending' | 'dex' | 'yield' | 'staking'
  chain: string
  balance: string
  risk: 'low' | 'medium' | 'high'
}

export default function DeFiPage() {
  const [address, setAddress] = useState('')
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState(1)
  const [loading, setLoading] = useState(false)
  const [positions, setPositions] = useState<DeFiPosition[]>([])
  const [error, setError] = useState('')

  const scanDeFi = async () => {
    const addr = resolvedAddress || address
    if (!addr || !ethers.isAddress(addr)) {
      setError('Please enter a valid EVM address')
      return
    }

    setLoading(true)
    setError('')
    setPositions([])

    try {
      const chain = CHAINS[chainId]
      if (!chain) throw new Error('Unsupported chain')

      const provider = new ethers.JsonRpcProvider(chain.rpc)
      const positions: DeFiPosition[] = []

      // Check balance
      const balance = await provider.getBalance(addr)
      const balanceEth = parseFloat(ethers.formatEther(balance))

      if (balanceEth > 0) {
        positions.push({
          protocol: 'Native Balance',
          type: 'staking',
          chain: chain.name,
          balance: `${balanceEth.toFixed(4)} ${chain.nativeCurrency}`,
          risk: 'low',
        })
      }

      // Check tx count for activity
      const txCount = await provider.getTransactionCount(addr)
      if (txCount > 0) {
        positions.push({
          protocol: 'On-Chain Activity',
          type: 'dex',
          chain: chain.name,
          balance: `${txCount} transactions`,
          risk: 'low',
        })
      }

      // Check if contract (could be LP token, vault, etc.)
      const code = await provider.getCode(addr)
      if (code !== '0x') {
        positions.push({
          protocol: 'Smart Contract',
          type: 'yield',
          chain: chain.name,
          balance: `${(code.length - 2) / 2} bytes`,
          risk: 'medium',
        })
      }

      setPositions(positions)
      if (positions.length === 0) setError('No DeFi positions found')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-green-500/[0.04] rounded-full blur-[120px]" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🌾 DeFi Integration</h1>
        <p className="text-white/40 mb-8">Scan DeFi positions and protocol interactions</p>

        <div className="flex gap-2 mb-4 flex-wrap">
          {Object.values(CHAINS).filter(c => c.id !== 0 && c.id !== 10143).slice(0, 10).map(chain => (
            <button key={chain.id} onClick={() => setChainId(chain.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${chainId === chain.id ? 'bg-green-600 text-white' : 'bg-white/[0.03] text-white/40 hover:text-white'}`}>
              {chain.name}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mb-6">
          <div className="flex-1">
            <AddressInput value={address} onChange={setAddress} onResolved={setResolvedAddress} placeholder="Enter wallet address (0x...) or ENS name" chainId={chainId} />
          </div>
          <button onClick={scanDeFi} disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold disabled:opacity-50">
            {loading ? 'Scanning...' : '🌾 Scan DeFi'}
          </button>
        </div>

        {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">{error}</div>}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-green-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Scanning DeFi positions...
            </div>
          </div>
        )}

        {positions.length > 0 && (
          <div className="space-y-3">
            {positions.map((p, i) => (
              <div key={i} className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">{p.protocol}</div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    p.risk === 'high' ? 'bg-red-500/20 text-red-400' :
                    p.risk === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {p.type.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><div className="text-white/40">Chain</div><div>{p.chain}</div></div>
                  <div><div className="text-white/40">Balance</div><div>{p.balance}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && positions.length === 0 && !error && (
          <div className="text-center py-16 text-white/20">
            <div className="text-5xl mb-4">🌾</div>
            <p>Enter an address to scan DeFi positions</p>
          </div>
        )}
      </div>
    </main>
  )
}
