'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'
import { CHAINS } from '@/lib/chains'
import AddressInput from '@/components/AddressInput'

interface ChainLink {
  chainId: number
  chainName: string
  address: string
  balance: string
  txCount: number
  isContract: boolean
}

export default function CrossChainPage() {
  const [address, setAddress] = useState('')
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [links, setLinks] = useState<ChainLink[]>([])
  const [error, setError] = useState('')

  const scanAllChains = async () => {
    const addr = resolvedAddress || address
    if (!addr || !ethers.isAddress(addr)) {
      setError('Please enter a valid EVM address')
      return
    }

    setLoading(true)
    setError('')
    setLinks([])

    try {
      const chains = Object.values(CHAINS).filter(c => c.id !== 0 && c.id !== 10143).slice(0, 12)
      const results: ChainLink[] = []

      for (const chain of chains) {
        try {
          const provider = new ethers.JsonRpcProvider(chain.rpc)
          const [balance, txCount, code] = await Promise.all([
            provider.getBalance(addr),
            provider.getTransactionCount(addr),
            provider.getCode(addr),
          ])

          const balanceEth = parseFloat(ethers.formatEther(balance))
          if (txCount > 0 || balanceEth > 0) {
            results.push({
              chainId: chain.id,
              chainName: chain.name,
              address: addr,
              balance: `${balanceEth.toFixed(4)} ${chain.nativeCurrency}`,
              txCount,
              isContract: code !== '0x',
            })
          }
        } catch { /* skip failed chains */ }
      }

      setLinks(results)
      if (results.length === 0) setError('Address not found on any scanned chain')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/[0.04] rounded-full blur-[120px]" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🔗 Cross-Chain Linking</h1>
        <p className="text-white/40 mb-8">Find the same address across all EVM chains</p>

        <div className="flex gap-3 mb-6">
          <div className="flex-1">
            <AddressInput value={address} onChange={setAddress} onResolved={setResolvedAddress} placeholder="Enter address (0x...) or ENS name" chainId={1} />
          </div>
          <button onClick={scanAllChains} disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-semibold disabled:opacity-50">
            {loading ? 'Scanning...' : '🔗 Scan All Chains'}
          </button>
        </div>

        {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">{error}</div>}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-cyan-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Scanning across {Object.keys(CHAINS).length} chains...
            </div>
          </div>
        )}

        {links.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm text-white/40 mb-2">Found on {links.length} chain(s)</div>
            {links.map((link, i) => (
              <div key={i} className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-lg">{link.chainName}</div>
                  <span className="text-xs font-mono text-white/40">ID: {link.chainId}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div><div className="text-white/40">Balance</div><div className="font-medium">{link.balance}</div></div>
                  <div><div className="text-white/40">Transactions</div><div className="font-medium">{link.txCount.toLocaleString()}</div></div>
                  <div><div className="text-white/40">Type</div><div className="font-medium">{link.isContract ? 'Contract' : 'EOA'}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && links.length === 0 && !error && (
          <div className="text-center py-16 text-white/20">
            <div className="text-5xl mb-4">🔗</div>
            <p>Enter an address to find across all EVM chains</p>
          </div>
        )}
      </div>
    </main>
  )
}
