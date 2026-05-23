'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'
import { CHAINS } from '@/lib/chains'

interface Wallet {
  address: string
  label: string
  chainId: number
  chainName: string
  balance: string
  txCount: number
  addedAt: number
}

export default function WalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [newAddress, setNewAddress] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [chainId, setChainId] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('sg-wallets')
    if (saved) {
      try { setWallets(JSON.parse(saved)) } catch { /* ok */ }
    }
  }, [])

  const saveWallets = (w: Wallet[]) => {
    setWallets(w)
    localStorage.setItem('sg-wallets', JSON.stringify(w))
  }

  const addWallet = async () => {
    if (!newAddress || !ethers.isAddress(newAddress)) {
      setError('Please enter a valid EVM address')
      return
    }

    if (wallets.some(w => w.address.toLowerCase() === newAddress.toLowerCase())) {
      setError('Wallet already added')
      return
    }

    setLoading(true)
    setError('')

    try {
      const chain = CHAINS[chainId]
      if (!chain) throw new Error('Unsupported chain')

      const provider = new ethers.JsonRpcProvider(chain.rpc)
      const balance = await provider.getBalance(newAddress)
      const txCount = await provider.getTransactionCount(newAddress)

      const wallet: Wallet = {
        address: newAddress,
        label: newLabel || `Wallet ${wallets.length + 1}`,
        chainId,
        chainName: chain.name,
        balance: `${parseFloat(ethers.formatEther(balance)).toFixed(4)} ${chain.nativeCurrency}`,
        txCount,
        addedAt: Date.now(),
      }

      saveWallets([...wallets, wallet])
      setNewAddress('')
      setNewLabel('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add wallet')
    } finally {
      setLoading(false)
    }
  }

  const removeWallet = (address: string) => {
    saveWallets(wallets.filter(w => w.address !== address))
  }

  const refreshAll = async () => {
    setLoading(true)
    try {
      const updated: Wallet[] = []
      for (const w of wallets) {
        try {
          const chain = CHAINS[w.chainId]
          if (!chain) { updated.push(w); continue }
          const provider = new ethers.JsonRpcProvider(chain.rpc)
          const balance = await provider.getBalance(w.address)
          const txCount = await provider.getTransactionCount(w.address)
          updated.push({
            ...w,
            balance: `${parseFloat(ethers.formatEther(balance)).toFixed(4)} ${chain.nativeCurrency}`,
            txCount,
          })
        } catch { updated.push(w) }
      }
      saveWallets(updated)
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">💼 Wallet Manager</h1>
            <p className="text-white/40 mt-1">Track and manage your wallets across chains</p>
          </div>
          {wallets.length > 0 && (
            <button onClick={refreshAll} disabled={loading}
              className="px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-lg text-green-400 text-sm hover:bg-green-600/30 disabled:opacity-50">
              {loading ? 'Refreshing...' : '🔄 Refresh All'}
            </button>
          )}
        </div>

        {/* Add Wallet */}
        <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl mb-6">
          <h3 className="font-semibold mb-3">Add Wallet</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input value={newAddress} onChange={e => setNewAddress(e.target.value)}
              placeholder="0x..." className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 text-sm font-mono" />
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
              placeholder="Label (optional)" className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 text-sm" />
            <select value={chainId} onChange={e => setChainId(Number(e.target.value))}
              className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm">
              {Object.values(CHAINS).filter(c => c.id !== 0 && c.id !== 10143).slice(0, 10).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button onClick={addWallet} disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold disabled:opacity-50">
              {loading ? 'Adding...' : '+ Add'}
            </button>
          </div>
          {error && <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
        </div>

        {/* Wallets List */}
        {wallets.length > 0 ? (
          <div className="space-y-3">
            {wallets.map((w, i) => (
              <div key={i} className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold">{w.label}</div>
                    <div className="text-xs font-mono text-white/40">{w.address}</div>
                  </div>
                  <button onClick={() => removeWallet(w.address)}
                    className="px-3 py-1.5 bg-red-600/20 border border-red-500/30 rounded-lg text-red-400 text-xs hover:bg-red-600/30">
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div><div className="text-white/40">Chain</div><div>{w.chainName}</div></div>
                  <div><div className="text-white/40">Balance</div><div>{w.balance}</div></div>
                  <div><div className="text-white/40">Transactions</div><div>{w.txCount.toLocaleString()}</div></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-white/20">
            <div className="text-5xl mb-4">💼</div>
            <p>No wallets added yet</p>
            <p className="text-sm mt-1">Add a wallet address above to start tracking</p>
          </div>
        )}
      </div>
    </main>
  )
}
