'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'

interface Guardian {
  address: string
  label: string
  addedAt: number
  confirmed: boolean
}

export default function SocialRecoveryPage() {
  const [walletAddress, setWalletAddress] = useState('')
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [newGuardian, setNewGuardian] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [threshold, setThreshold] = useState(2)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'setup' | 'recover'>('setup')
  const [recoverAddress, setRecoverAddress] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('sg-social-recovery')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setWalletAddress(data.walletAddress || '')
        setGuardians(data.guardians || [])
        setThreshold(data.threshold || 2)
      } catch { /* ok */ }
    }
  }, [])

  const save = () => {
    localStorage.setItem('sg-social-recovery', JSON.stringify({ walletAddress, guardians, threshold }))
  }

  const addGuardian = () => {
    if (!newGuardian || !ethers.isAddress(newGuardian)) {
      setError('Please enter a valid guardian address')
      return
    }
    if (guardians.some(g => g.address.toLowerCase() === newGuardian.toLowerCase())) {
      setError('Guardian already added')
      return
    }
    setGuardians([...guardians, { address: newGuardian, label: newLabel || `Guardian ${guardians.length + 1}`, addedAt: Date.now(), confirmed: false }])
    setNewGuardian('')
    setNewLabel('')
    setError('')
    save()
  }

  const removeGuardian = (address: string) => {
    setGuardians(guardians.filter(g => g.address !== address))
    save()
  }

  const startRecovery = () => {
    if (!recoverAddress || !ethers.isAddress(recoverAddress)) {
      setError('Please enter a valid new wallet address')
      return
    }
    if (guardians.length < threshold) {
      setError(`Need at least ${threshold} guardians (currently ${guardians.length})`)
      return
    }
    alert(`Recovery request created! In production, ${threshold} guardians would need to confirm recovery to ${recoverAddress}`)
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-500/[0.04] rounded-full blur-[120px]" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
      </nav>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">👥 Social Recovery</h1>
        <p className="text-white/40 mb-8">Set up trusted guardians to recover your wallet</p>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setStep('setup')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${step === 'setup' ? 'bg-purple-600 text-white' : 'bg-white/[0.03] text-white/40'}`}>
            Setup Guardians
          </button>
          <button onClick={() => setStep('recover')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${step === 'recover' ? 'bg-purple-600 text-white' : 'bg-white/[0.03] text-white/40'}`}>
            Recover Wallet
          </button>
        </div>

        {step === 'setup' && (
          <div className="space-y-6">
            <div>
              <label className="text-sm text-white/40 mb-1 block">Protected Wallet</label>
              <input value={walletAddress} onChange={e => { setWalletAddress(e.target.value); save() }}
                placeholder="0x..." className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 text-sm font-mono" />
            </div>

            <div>
              <label className="text-sm text-white/40 mb-1 block">Recovery Threshold: {threshold} of {guardians.length}</label>
              <input type="range" min={1} max={Math.max(guardians.length, 1)} value={threshold}
                onChange={e => { setThreshold(Number(e.target.value)); save() }}
                className="w-full" />
            </div>

            <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
              <h3 className="font-semibold mb-3">Add Guardian</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={newGuardian} onChange={e => setNewGuardian(e.target.value)}
                  placeholder="Guardian address (0x...)" className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 text-sm font-mono" />
                <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                  placeholder="Label (e.g., Mom, Friend)" className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 text-sm" />
                <button onClick={addGuardian}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold">
                  + Add
                </button>
              </div>
              {error && <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
            </div>

            {guardians.length > 0 && (
              <div className="space-y-2">
                {guardians.map((g, i) => (
                  <div key={i} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-medium">{g.label}</div>
                      <div className="text-xs font-mono text-white/40">{g.address}</div>
                    </div>
                    <button onClick={() => removeGuardian(g.address)}
                      className="px-3 py-1.5 bg-red-600/20 border border-red-500/30 rounded-lg text-red-400 text-xs">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'recover' && (
          <div className="space-y-4">
            <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
              <h3 className="font-semibold mb-3">Recover Wallet</h3>
              <p className="text-sm text-white/40 mb-4">
                {guardians.length >= threshold
                  ? `${threshold} of ${guardians.length} guardians needed to recover`
                  : `Need at least ${threshold} guardians (currently ${guardians.length})`}
              </p>
              <input value={recoverAddress} onChange={e => setRecoverAddress(e.target.value)}
                placeholder="New wallet address (0x...)" className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 text-sm font-mono mb-4" />
              <button onClick={startRecovery}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold">
                🔑 Start Recovery
              </button>
              {error && <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
