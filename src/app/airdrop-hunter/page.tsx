'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'
import { CHAINS } from '@/lib/chains'
import AddressInput from '@/components/AddressInput'

interface Airdrop {
  name: string
  chain: string
  status: 'active' | 'upcoming' | 'ended'
  estimatedValue: string
  requirements: string
  link: string
}

const KNOWN_AIRDROPS: Airdrop[] = [
  { name: 'EigenLayer', chain: 'Ethereum', status: 'active', estimatedValue: '$500-5000', requirements: 'Restake ETH/LSTs', link: 'https://www.eigenlayer.xyz' },
  { name: 'zkSync', chain: 'zkSync Era', status: 'active', estimatedValue: '$200-2000', requirements: 'Bridge & use dApps', link: 'https://zksync.io' },
  { name: 'LayerZero', chain: 'Multi-chain', status: 'active', estimatedValue: '$100-1000', requirements: 'Cross-chain bridge', link: 'https://layerzero.network' },
  { name: 'Starknet', chain: 'Starknet', status: 'active', estimatedValue: '$100-800', requirements: 'Bridge & interact', link: 'https://starknet.io' },
  { name: 'Scroll', chain: 'Scroll', status: 'active', estimatedValue: '$50-500', requirements: 'Bridge & use dApps', link: 'https://scroll.io' },
  { name: 'Base', chain: 'Base', status: 'active', estimatedValue: '$50-300', requirements: 'Use Base dApps', link: 'https://base.org' },
  { name: 'Linea', chain: 'Linea', status: 'active', estimatedValue: '$50-400', requirements: 'Bridge & use dApps', link: 'https://linea.build' },
  { name: 'Blast', chain: 'Blast', status: 'active', estimatedValue: '$100-1000', requirements: 'Bridge ETH/USDB', link: 'https://blast.io' },
  { name: 'Manta', chain: 'Manta Pacific', status: 'upcoming', estimatedValue: '$50-300', requirements: 'Bridge & use dApps', link: 'https://manta.network' },
  { name: 'Zora', chain: 'Zora', status: 'active', estimatedValue: '$30-200', requirements: 'Mint NFTs, bridge', link: 'https://zora.co' },
]

export default function AirdropHunterPage() {
  const [address, setAddress] = useState('')
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState(1)
  const [loading, setLoading] = useState(false)
  const [eligibility, setEligibility] = useState<{ name: string; eligible: boolean; reason: string }[]>([])
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming'>('all')

  const checkEligibility = async () => {
    const addr = resolvedAddress || address
    if (!addr || !ethers.isAddress(addr)) {
      setError('Please enter a valid EVM address')
      return
    }

    setLoading(true)
    setError('')
    setEligibility([])

    try {
      const chain = CHAINS[chainId]
      if (!chain) throw new Error('Unsupported chain')

      const provider = new ethers.JsonRpcProvider(chain.rpc)
      const results: { name: string; eligible: boolean; reason: string }[] = []

      // Get wallet stats
      const balance = await provider.getBalance(addr)
      const txCount = await provider.getTransactionCount(addr)
      const balanceEth = parseFloat(ethers.formatEther(balance))

      // Check eligibility for each airdrop
      for (const airdrop of KNOWN_AIRDROPS) {
        let eligible = false
        let reason = ''

        // Basic eligibility check
        if (txCount > 10 && balanceEth > 0.01) {
          eligible = true
          reason = 'Active wallet with sufficient balance'
        } else if (txCount > 0) {
          reason = 'Low activity — increase usage to qualify'
        } else {
          reason = 'No activity detected'
        }

        results.push({ name: airdrop.name, eligible, reason })
      }

      setEligibility(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check failed')
    } finally {
      setLoading(false)
    }
  }

  const filtered = KNOWN_AIRDROPS.filter(a => filter === 'all' || a.status === filter)

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
        <h1 className="text-3xl font-bold mb-2">🎯 Airdrop Hunter</h1>
        <p className="text-white/40 mb-8">Discover and check eligibility for active airdrops</p>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {(['all', 'active', 'upcoming'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? 'bg-green-600 text-white' : 'bg-white/[0.03] text-white/40'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Eligibility Check */}
        <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl mb-6">
          <h3 className="font-semibold mb-3">Check Your Eligibility</h3>
          <div className="flex gap-2 mb-4 flex-wrap">
            {Object.values(CHAINS).filter(c => c.id !== 0 && c.id !== 10143).slice(0, 8).map(chain => (
              <button key={chain.id} onClick={() => setChainId(chain.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${chainId === chain.id ? 'bg-green-600 text-white' : 'bg-white/[0.03] text-white/40'}`}>
                {chain.name}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <AddressInput value={address} onChange={setAddress} onResolved={setResolvedAddress} placeholder="Enter wallet address (0x...) or ENS name" chainId={chainId} />
            </div>
            <button onClick={checkEligibility} disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold disabled:opacity-50">
              {loading ? 'Checking...' : '🎯 Check'}
            </button>
          </div>
          {error && <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
        </div>

        {/* Eligibility Results */}
        {eligibility.length > 0 && (
          <div className="space-y-2 mb-8">
            <h3 className="font-semibold mb-3">Your Eligibility</h3>
            {eligibility.map((e, i) => (
              <div key={i} className={`p-4 rounded-xl border ${e.eligible ? 'bg-green-500/[0.04] border-green-500/20' : 'bg-white/[0.02] border-white/[0.06]'}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{e.name}</div>
                  <span className={`text-xs px-2 py-1 rounded-full ${e.eligible ? 'bg-green-500/20 text-green-400' : 'bg-white/[0.05] text-white/40'}`}>
                    {e.eligible ? '✅ Eligible' : '❌ Not Yet'}
                  </span>
                </div>
                <div className="text-xs text-white/40 mt-1">{e.reason}</div>
              </div>
            ))}
          </div>
        )}

        {/* Airdrops List */}
        <div className="space-y-3">
          <h3 className="font-semibold">Available Airdrops ({filtered.length})</h3>
          {filtered.map((airdrop, i) => (
            <div key={i} className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-lg">{airdrop.name}</div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  airdrop.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  airdrop.status === 'upcoming' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-white/[0.05] text-white/40'
                }`}>
                  {airdrop.status.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><div className="text-white/40">Chain</div><div>{airdrop.chain}</div></div>
                <div><div className="text-white/40">Est. Value</div><div className="text-green-400">{airdrop.estimatedValue}</div></div>
                <div><div className="text-white/40">Requirements</div><div>{airdrop.requirements}</div></div>
              </div>
              <a href={airdrop.link} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-3 text-sm text-green-400 hover:underline">
                Visit Website →
              </a>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
