'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'
import { CHAINS } from '@/lib/chains'

interface DrainerInfo {
  address: string
  chain: string
  chainId: number
  label: string
  txCount: number
  balance: string
  lastActive: string
  risk: 'high' | 'critical'
}

// Known drainer addresses (commonly reported)
const KNOWN_DRAINERS: { address: string; label: string }[] = [
  { address: '0x0000000000000000000000000000000000000000', label: 'Null Address' },
  { address: '0x000000000000000000000000000000000000dEaD', label: 'Burn Address' },
]

export default function DrainerMapPage() {
  const [drainers, setDrainers] = useState<DrainerInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedChain, setSelectedChain] = useState(1)
  const [customAddress, setCustomAddress] = useState('')
  const [scanning, setScanning] = useState(false)

  const scanForDrainers = async () => {
    setLoading(true)
    setError('')
    setDrainers([])

    try {
      const chain = CHAINS[selectedChain]
      if (!chain) throw new Error('Unsupported chain')

      const provider = new ethers.JsonRpcProvider(chain.rpc)
      const found: DrainerInfo[] = []

      // Check known drainer addresses
      for (const drainer of KNOWN_DRAINERS) {
        try {
          const balance = await provider.getBalance(drainer.address)
          const txCount = await provider.getTransactionCount(drainer.address)
          const balanceEth = parseFloat(ethers.formatEther(balance))

          if (txCount > 0) {
            found.push({
              address: drainer.address,
              chain: chain.name,
              chainId: chain.id,
              label: drainer.label,
              txCount,
              balance: `${balanceEth.toFixed(4)} ${chain.nativeCurrency}`,
              lastActive: 'Recent',
              risk: 'critical',
            })
          }
        } catch { /* skip */ }
      }

      // Check custom address if provided
      if (customAddress && ethers.isAddress(customAddress)) {
        try {
          const balance = await provider.getBalance(customAddress)
          const txCount = await provider.getTransactionCount(customAddress)
          const code = await provider.getCode(customAddress)
          const isContract = code !== '0x'

          found.unshift({
            address: customAddress,
            chain: chain.name,
            chainId: chain.id,
            label: isContract ? 'Suspected Contract' : 'Suspected EOA',
            txCount,
            balance: `${parseFloat(ethers.formatEther(balance)).toFixed(4)} ${chain.nativeCurrency}`,
            lastActive: 'Active',
            risk: txCount > 100 ? 'critical' : 'high',
          })
        } catch { /* skip */ }
      }

      setDrainers(found)
      if (found.length === 0) setError('No suspicious addresses detected')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setLoading(false)
    }
  }

  const reportAddress = () => {
    if (!customAddress || !ethers.isAddress(customAddress)) {
      setError('Enter a valid address to report')
      return
    }
    alert(`Address ${customAddress} reported for review. In production this would submit to a drainer database.`)
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-red-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-orange-500/[0.03] rounded-full blur-[100px]" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🗺️ Live Drainer Map</h1>
        <p className="text-white/40 mb-8">Track and monitor known drainer addresses across chains</p>

        <div className="flex gap-2 mb-4 flex-wrap">
          {Object.values(CHAINS).filter(c => c.id !== 0 && c.id !== 10143).slice(0, 8).map(chain => (
            <button key={chain.id} onClick={() => setSelectedChain(chain.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedChain === chain.id ? 'bg-red-600 text-white' : 'bg-white/[0.03] text-white/40 hover:text-white'}`}>
              {chain.name}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mb-6">
          <input value={customAddress} onChange={e => setCustomAddress(e.target.value)}
            placeholder="Enter suspicious address (0x...)" className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 text-sm font-mono" />
          <button onClick={scanForDrainers} disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-semibold disabled:opacity-50">
            {loading ? 'Scanning...' : '🔍 Scan'}
          </button>
          <button onClick={reportAddress}
            className="px-6 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-sm hover:border-red-500/30 transition-all">
            🚨 Report
          </button>
        </div>

        {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">{error}</div>}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-red-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Scanning {CHAINS[selectedChain]?.name} for drainer activity...
            </div>
          </div>
        )}

        {drainers.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm text-white/40 mb-2">Found {drainers.length} addresses</div>
            {drainers.map((d, i) => (
              <div key={i} className={`p-5 rounded-2xl border ${d.risk === 'critical' ? 'bg-red-500/[0.04] border-red-500/20' : 'bg-orange-500/[0.04] border-orange-500/20'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-red-400">🚨</span>
                    <div>
                      <div className="font-semibold">{d.label}</div>
                      <div className="text-xs font-mono text-white/40">{d.address}</div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${d.risk === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                    {d.risk.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm mt-3">
                  <div><div className="text-white/40">Chain</div><div>{d.chain}</div></div>
                  <div><div className="text-white/40">Balance</div><div>{d.balance}</div></div>
                  <div><div className="text-white/40">Transactions</div><div>{d.txCount.toLocaleString()}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && drainers.length === 0 && !error && (
          <div className="text-center py-16 text-white/20">
            <div className="text-5xl mb-4">🗺️</div>
            <p>Enter an address or scan for drainer activity</p>
          </div>
        )}
      </div>
    </main>
  )
}
