'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'

const EXCHANGES = [
  { id: 'binance', name: 'Binance', email: 'security@binance.com', url: 'https://www.binance.com/en/support' },
  { id: 'coinbase', name: 'Coinbase', email: 'support@coinbase.com', url: 'https://help.coinbase.com' },
  { id: 'kraken', name: 'Kraken', email: 'support@kraken.com', url: 'https://support.kraken.com' },
  { id: 'kucoin', name: 'KuCoin', email: 'support@kucoin.com', url: 'https://www.kucoin.com/support' },
  { id: 'bybit', name: 'Bybit', email: 'support@bybit.com', url: 'https://www.bybit.com/en/help' },
  { id: 'okx', name: 'OKX', email: 'support@okx.com', url: 'https://www.okx.com/support' },
]

export default function FreezePage() {
  const [step, setStep] = useState(1)
  const [exchange, setExchange] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [drainerAddress, setDrainerAddress] = useState('')
  const [txHash, setTxHash] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [generated, setGenerated] = useState('')
  const [error, setError] = useState('')

  const generateRequest = () => {
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      setError('Please enter a valid wallet address')
      return
    }
    if (!exchange) {
      setError('Please select an exchange')
      return
    }

    const ex = EXCHANGES.find(e => e.id === exchange)
    if (!ex) return

    const template = `URGENT: Freeze Request — Stolen Funds

To: ${ex.email}
Subject: URGENT — Freeze stolen funds deposit

Dear ${ex.name} Security Team,

I am writing to report stolen cryptocurrency that was deposited to your platform. Please freeze the following account immediately:

STOLEN FUNDS DETAILS:
• Victim Wallet: ${walletAddress}
• Drainer/Receiver: ${drainerAddress || 'Unknown'}
• Transaction Hash: ${txHash || 'Pending investigation'}
• Amount: ${amount || 'Under investigation'}
• Date: ${new Date().toISOString().split('T')[0]}

${description ? `INCIDENT DESCRIPTION:\n${description}\n` : ''}
REQUEST:
Please freeze all funds associated with the drainer address and preserve all transaction records for law enforcement.

I have filed a police report and can provide additional documentation upon request.

Best regards,
[Your name]
[Your contact information]`

    setGenerated(template)
    setStep(3)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generated)
    alert('Copied to clipboard!')
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-500/[0.04] rounded-full blur-[120px]" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
      </nav>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🧊 Freeze Request</h1>
        <p className="text-white/40 mb-8">Generate an exchange freeze request for stolen funds</p>

        {/* Step indicator */}
        <div className="flex items-center gap-4 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex items-center gap-2 ${step >= s ? 'text-blue-400' : 'text-white/20'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? 'bg-blue-600' : 'bg-white/[0.05]'}`}>{s}</div>
              <span className="text-sm">{s === 1 ? 'Exchange' : s === 2 ? 'Details' : 'Generated'}</span>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <h3 className="font-semibold mb-4">Select Exchange</h3>
            {EXCHANGES.map(ex => (
              <button key={ex.id} onClick={() => { setExchange(ex.id); setStep(2) }}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  exchange === ex.id ? 'bg-blue-500/[0.06] border-blue-500/20' : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                }`}>
                <div className="font-semibold">{ex.name}</div>
                <div className="text-xs text-white/40">{ex.email}</div>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <button onClick={() => setStep(1)} className="text-sm text-white/40 hover:text-white">← Back</button>
            <h3 className="font-semibold">Incident Details</h3>

            <div>
              <label className="text-sm text-white/40 mb-1 block">Your Wallet Address *</label>
              <input value={walletAddress} onChange={e => setWalletAddress(e.target.value)}
                placeholder="0x..." className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 text-sm font-mono" />
            </div>

            <div>
              <label className="text-sm text-white/40 mb-1 block">Drainer Address</label>
              <input value={drainerAddress} onChange={e => setDrainerAddress(e.target.value)}
                placeholder="0x..." className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 text-sm font-mono" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/40 mb-1 block">Transaction Hash</label>
                <input value={txHash} onChange={e => setTxHash(e.target.value)}
                  placeholder="0x..." className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 text-sm font-mono" />
              </div>
              <div>
                <label className="text-sm text-white/40 mb-1 block">Amount Stolen</label>
                <input value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="e.g., 5.2 ETH" className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 text-sm" />
              </div>
            </div>

            <div>
              <label className="text-sm text-white/40 mb-1 block">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe what happened..." rows={4}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 text-sm resize-none" />
            </div>

            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}

            <button onClick={generateRequest}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-semibold">
              Generate Freeze Request
            </button>
          </div>
        )}

        {step === 3 && generated && (
          <div className="space-y-4">
            <button onClick={() => setStep(2)} className="text-sm text-white/40 hover:text-white">← Back</button>
            <h3 className="font-semibold">Generated Freeze Request</h3>
            <div className="p-5 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
              <pre className="text-sm text-white/70 whitespace-pre-wrap font-mono">{generated}</pre>
            </div>
            <div className="flex gap-3">
              <button onClick={copyToClipboard}
                className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold">
                📋 Copy to Clipboard
              </button>
              <button onClick={() => { setStep(1); setGenerated(''); setWalletAddress(''); setDrainerAddress(''); setTxHash(''); setAmount(''); setDescription('') }}
                className="px-6 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl">
                New Request
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
