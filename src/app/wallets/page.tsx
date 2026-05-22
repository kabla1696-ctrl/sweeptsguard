'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createWalletManager, type ManagedWallet } from '@/lib/walletManager'

const CHAIN_ICONS: Record<number, string> = {
  1: '⟠',
  8453: '🔵',
  56: '🔶',
  42161: '🔵',
  137: '🟣',
  10: '🔴',
}

export default function WalletsPage() {
  const [wallets, setWallets] = useState<ManagedWallet[]>([])
  const [newAddress, setNewAddress] = useState('')
  const [newSafeAddress, setNewSafeAddress] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [mounted, setMounted] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    setMounted(true)
    const manager = createWalletManager()
    setWallets(manager.getAll())
  }, [])

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
    manager.add({
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
    setShowAdd(false)
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
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#050507] via-[#0a0a0f] to-[#050507] flex items-center justify-center">
        <div className="inline-flex items-center gap-3 text-gray-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#00ff87]/3 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-[#00e5ff]/3 rounded-full blur-[128px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 animate-[fade-in_0.6s_ease-out]">
          <div>
            <h1 className="text-4xl md:text-5xl font-black mb-2">
              👛 Wallet <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">Manager</span>
            </h1>
            <p className="text-gray-500 text-lg">Manage multiple compromised wallets from one dashboard</p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#00ff87] to-[#00e5ff] text-black font-semibold rounded-xl text-sm hover:shadow-[0_0_30px_rgba(0,255,135,0.3)] transition-all duration-300 active:scale-95"
          >
            <span className="text-lg">+</span> Add Wallet
          </button>
        </div>

        {/* Add Wallet Form */}
        {showAdd && (
          <div className="mb-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 animate-[slide-up_0.4s_ease-out]">
            <h2 className="text-lg font-semibold mb-1">Add New Wallet</h2>
            <p className="text-gray-500 text-xs mb-5">Enter the addresses of your compromised wallet and a safe wallet to sweep funds to.</p>
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 block">Compromised Address</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  placeholder="0x..."
                  aria-label="Compromised wallet address"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00ff87]/40 focus:shadow-[0_0_15px_rgba(0,255,135,0.08)] text-sm font-mono transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 block">Safe Address</label>
                <input
                  type="text"
                  value={newSafeAddress}
                  onChange={e => setNewSafeAddress(e.target.value)}
                  placeholder="0x..."
                  aria-label="Safe wallet address"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00e5ff]/40 focus:shadow-[0_0_15px_rgba(0,229,255,0.08)] text-sm font-mono transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 block">Label</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="My wallet"
                  aria-label="Wallet label"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 text-sm transition-all"
                />
              </div>
            </div>
            {validationError && (
              <p className="text-[#ff3b3b] text-sm mb-3">{validationError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={addWallet}
                disabled={!newAddress}
                aria-label="Add wallet to manager"
                className="px-6 py-3 bg-gradient-to-r from-[#00ff87] to-[#00e5ff] text-black font-semibold rounded-xl text-sm disabled:opacity-40 hover:shadow-[0_0_20px_rgba(0,255,135,0.2)] transition-all active:scale-95"
              >
                Add Wallet
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Wallet Cards */}
        {wallets.length === 0 ? (
          <div className="text-center py-20 animate-[fade-in_0.6s_ease-out]">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-[#00ff87]/10 blur-3xl rounded-full" />
              <span className="text-7xl relative">👛</span>
            </div>
            <p className="text-gray-500 text-lg mb-2">No wallets added yet</p>
            <p className="text-gray-600 text-sm">Click &quot;Add Wallet&quot; to get started</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {wallets.map((wallet, idx) => (
              <div
                key={wallet.id}
                className={`group relative bg-white/5 backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 animate-[fade-in_0.5s_ease-out_both] ${
                  wallet.isActive
                    ? 'border-[#00ff87]/30 shadow-[0_0_30px_rgba(0,255,135,0.08)]'
                    : 'border-white/10 hover:border-white/20'
                }`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Active indicator */}
                {wallet.isActive && (
                  <div className="absolute top-4 right-4">
                    <span className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full bg-[#00ff87]/10 text-[#00ff87] border border-[#00ff87]/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00ff87] animate-pulse" />
                      Active
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="font-semibold text-white text-lg">{wallet.label}</h3>
                  <p className="text-gray-500 text-xs font-mono mt-1 break-all">{wallet.address}</p>
                  {wallet.safeAddress && (
                    <p className="text-gray-600 text-xs font-mono mt-1 flex items-center gap-1">
                      <span className="text-[#00ff87]">→</span> {wallet.safeAddress}
                    </p>
                  )}
                </div>

                {/* Chain icons */}
                <div className="flex gap-1 mb-5">
                  {(wallet.chainIds || [1, 8453, 56, 42161, 137, 10]).map(cid => (
                    <span key={cid} className="w-6 h-6 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-[10px]" title={`Chain ${cid}`}>
                      {CHAIN_ICONS[cid] || '⛓'}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {!wallet.isActive && (
                    <button
                      onClick={() => setActive(wallet.id)}
                      aria-label="Set wallet as active"
                      className="px-3 py-1.5 text-xs bg-[#00ff87]/10 border border-[#00ff87]/20 text-[#00ff87] rounded-lg hover:bg-[#00ff87]/20 transition-all"
                    >
                      Set Active
                    </button>
                  )}
                  <Link
                    href={`/dashboard?address=${wallet.address}`}
                    className="px-3 py-1.5 text-xs bg-[#00e5ff]/10 border border-[#00e5ff]/20 text-[#00e5ff] rounded-lg hover:bg-[#00e5ff]/20 transition-all"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href={`/scan?address=${wallet.address}`}
                    className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:text-white hover:bg-white/10 transition-all"
                  >
                    Scan
                  </Link>
                  <button
                    onClick={() => removeWallet(wallet.id)}
                    aria-label={`Remove wallet ${wallet.label}`}
                    className="px-3 py-1.5 text-xs bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 text-[#ff3b3b] rounded-lg hover:bg-[#ff3b3b]/20 transition-all ml-auto"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
