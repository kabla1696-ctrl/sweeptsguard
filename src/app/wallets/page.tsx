'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createWalletManager, type ManagedWallet } from '@/lib/walletManager'

export default function WalletsPage() {
  const [wallets, setWallets] = useState<ManagedWallet[]>([])
  const [newAddress, setNewAddress] = useState('')
  const [newSafeAddress, setNewSafeAddress] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const manager = createWalletManager()
    setWallets(manager.getAll())
  }, [])

  const [validationError, setValidationError] = useState('')

  const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/

  const addWallet = () => {
    setValidationError('')
    if (!ADDRESS_RE.test(newAddress)) {
      setValidationError('Invalid compromised address. Must be 0x + 40 hex characters.')
      return
    }
    if (newSafeAddress && !ADDRESS_RE.test(newSafeAddress)) {
      setValidationError('Invalid safe address. Must be 0x + 40 hex characters.')
      return
    }
    if (newSafeAddress && newSafeAddress.toLowerCase() === newAddress.toLowerCase()) {
      setValidationError('Safe address cannot be the same as the compromised address.')
      return
    }
    const manager = createWalletManager()
    const wallet = manager.add({
      address: newAddress,
      safeAddress: newSafeAddress || undefined,
      label: newLabel || `Wallet ${newAddress.slice(0, 8)}...`,
      chainIds: [1, 8453, 56, 42161, 137, 10],
      isActive: wallets.length === 0
    })
    setWallets(manager.getAll())
    setNewAddress('')
    setNewSafeAddress('')
    setNewLabel('')
  }

  const removeWallet = (id: string) => {
    const manager = createWalletManager()
    manager.remove(id)
    setWallets(manager.getAll())
  }

  const setActive = (id: string) => {
    const manager = createWalletManager()
    manager.setActive(id)
    setWallets(manager.getAll())
  }

  if (!mounted) {
    return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="inline-flex items-center gap-3 text-white/30">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading...
      </div>
    </div>
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

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Wallet Manager</h1>
        <p className="text-white/40 mb-8">Manage multiple compromised wallets from one dashboard</p>

        {/* Add Wallet Form */}
        <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl mb-8">
          <h2 className="text-lg font-semibold mb-4">Add Wallet</h2>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              value={newAddress}
              onChange={e => setNewAddress(e.target.value)}
              placeholder="Compromised address (0x...)"
              className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
            />
            <input
              type="text"
              value={newSafeAddress}
              onChange={e => setNewSafeAddress(e.target.value)}
              placeholder="Safe address (0x...)"
              className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
            />
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Label (optional)"
              className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm"
            />
          </div>
          {validationError && (
            <p className="text-red-400 text-sm mb-3">{validationError}</p>
          )}
          <button
            onClick={addWallet}
            disabled={!newAddress}
            aria-label="Add wallet to manager"
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50 hover:from-green-500 hover:to-emerald-500 transition-all"
          >
            ➕ Add Wallet
          </button>
        </div>

        {/* Wallet List */}
        {wallets.length === 0 ? (
          <div className="text-center py-12 text-white/30">
            <p className="text-lg mb-2">No wallets added yet</p>
            <p className="text-sm">Add your first compromised wallet above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {wallets.map(wallet => (
              <div
                key={wallet.id}
                className={`p-5 rounded-2xl border transition-all ${
                  wallet.isActive
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-white/[0.02] border-white/[0.05]'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{wallet.label}</h3>
                      {wallet.isActive && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Active</span>
                      )}
                    </div>
                    <p className="text-white/40 text-sm font-mono">{wallet.address}</p>
                    {wallet.safeAddress && (
                      <p className="text-white/30 text-xs font-mono mt-1">→ {wallet.safeAddress}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!wallet.isActive && (
                      <button
                        onClick={() => setActive(wallet.id)}
                        aria-label="Set wallet as active"
                      className="px-3 py-1.5 text-xs bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors"
                      >
                        Set Active
                      </button>
                    )}
                    <Link
                      href={`/dashboard?address=${wallet.address}`}
                      className="px-3 py-1.5 text-xs bg-white/[0.05] border border-white/[0.1] rounded-lg hover:bg-white/[0.08] transition-colors"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => removeWallet(wallet.id)}
                      aria-label={`Remove wallet ${wallet.label}`}
                      className="px-3 py-1.5 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
