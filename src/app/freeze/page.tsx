'use client'

import { useState } from 'react'
import Link from 'next/link'
import { isValidAddress, isValidTxHash } from '@/lib/validation'

interface FreezeTemplate {
  exchange: string
  subject: string
  body: string
}

const EXCHANGES = [
  { name: 'Binance', icon: '🔶', color: '#f3ba2f' },
  { name: 'Coinbase', icon: '🔵', color: '#0052ff' },
  { name: 'OKX', icon: '⚫', color: '#ffffff' },
  { name: 'Bybit', icon: '🟡', color: '#f7a600' },
]

const STATUS_STEPS = [
  { label: 'Generate Template', icon: '📝' },
  { label: 'Send to Exchange', icon: '📧' },
  { label: 'Under Review', icon: '⏳' },
  { label: 'Frozen / Resolved', icon: '✅' },
]

function generateTemplate(exchange: string, walletAddress: string, txHash: string, amount: string, asset: string): FreezeTemplate {
  const subject = `URGENT: Freeze Request - Compromised Wallet ${walletAddress.slice(0, 10)}...`
  const date = new Date().toISOString().split('T')[0]

  const templates: Record<string, string> = {
    Binance: `Dear Binance Security Team,

I am writing to request an urgent freeze on funds that were stolen from my compromised wallet and deposited to your exchange.

Details:
- Compromised Wallet: ${walletAddress}
- Transaction Hash: ${txHash}
- Amount: ${amount} ${asset}
- Date: ${date}

I have reported this incident to law enforcement and request that you freeze the receiving account pending investigation.

Please contact me at your earliest convenience.

Best regards,
[Your Name]
[Your Email]
[Your Phone]`,

    Coinbase: `Dear Coinbase Security Team,

I am reporting stolen funds that were deposited from my compromised wallet to a Coinbase account.

Details:
- Source Wallet (Compromised): ${walletAddress}
- Transaction Hash: ${txHash}
- Amount: ${amount} ${asset}
- Date: ${date}

Please freeze the receiving account and preserve all records for law enforcement investigation.

Thank you for your prompt attention.

Best regards,
[Your Name]
[Your Email]`,

    OKX: `Dear OKX Security Team,

URGENT: Request to freeze stolen funds deposited from my compromised wallet.

Wallet Address: ${walletAddress}
Transaction: ${txHash}
Amount: ${amount} ${asset}
Date: ${date}

Please freeze the destination account immediately. I am filing a police report and will provide case number upon request.

Regards,
[Your Name]`,

    Bybit: `Dear Bybit Security Team,

I am requesting an immediate freeze on stolen funds deposited to your platform.

Compromised Wallet: ${walletAddress}
TX Hash: ${txHash}
Amount: ${amount} ${asset}
Date: ${date}

These funds were stolen from my wallet. Please freeze the receiving account pending investigation.

Best regards,
[Your Name]`
  }

  return { exchange, subject, body: templates[exchange] || templates.Binance }
}

export default function FreezePage() {
  const [walletAddress, setWalletAddress] = useState('')
  const [txHash, setTxHash] = useState('')
  const [amount, setAmount] = useState('')
  const [asset, setAsset] = useState('ETH')
  const [selectedExchange, setSelectedExchange] = useState('Binance')
  const [template, setTemplate] = useState<FreezeTemplate | null>(null)
  const [copied, setCopied] = useState<'subject' | 'body' | null>(null)
  const [validationError, setValidationError] = useState('')

  const handleGenerate = () => {
    setValidationError('')
    if (!isValidAddress(walletAddress)) { setValidationError('Invalid wallet address.'); return }
    if (txHash && !isValidTxHash(txHash)) { setValidationError('Invalid transaction hash.'); return }
    if (amount && (isNaN(Number(amount)) || Number(amount) < 0)) { setValidationError('Amount must be valid.'); return }
    setTemplate(generateTemplate(selectedExchange, walletAddress, txHash, amount, asset))
  }

  const handleCopy = async (text: string, type: 'subject' | 'body') => {
    try { await navigator.clipboard.writeText(text); setCopied(type); setTimeout(() => setCopied(null), 2000) } catch {}
  }

  const handleDownload = () => {
    if (!template) return
    const blob = new Blob([`Subject: ${template.subject}\n\n${template.body}`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `freeze-request-${selectedExchange.toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#00e5ff]/3 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-[#00ff87]/3 rounded-full blur-[128px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        {/* Header */}
        <div className="mb-10 animate-[fade-in_0.6s_ease-out]">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            🧊 Freeze Request
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">Generate freeze request templates for major exchanges</p>
        </div>

        {/* Status Steps */}
        <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2 animate-[fade-in_0.6s_ease-out_0.1s_both]">
          {STATUS_STEPS.map((step, i) => (
            <div key={i} className="flex items-center gap-2 shrink-0">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-medium ${
                template && i === 0
                  ? 'bg-[#00ff87]/10 border-[#00ff87]/20 text-[#00ff87]'
                  : 'bg-white/5 border-white/10 text-gray-500'
              }`}>
                <span>{step.icon}</span>
                <span>{step.label}</span>
              </div>
              {i < STATUS_STEPS.length - 1 && <div className="w-6 h-px bg-white/10" />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-5 animate-[fade-in_0.6s_ease-out_0.2s_both]">
            {/* Exchange selector */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 block">Select Exchange</label>
              <div className="grid grid-cols-2 gap-2">
                {EXCHANGES.map(ex => (
                  <button
                    key={ex.name}
                    onClick={() => setSelectedExchange(ex.name)}
                    aria-label={`Select ${ex.name}`}
                    aria-pressed={selectedExchange === ex.name}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border ${
                      selectedExchange === ex.name
                        ? 'bg-white/10 border-[#00ff87]/30 text-white shadow-[0_0_15px_rgba(0,255,135,0.1)]'
                        : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <span className="text-xl">{ex.icon}</span>
                    {ex.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Form fields */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
              <div>
                <label htmlFor="compromised-wallet-freeze" className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 block">Compromised Wallet</label>
                <input
                  id="compromised-wallet-freeze"
                  type="text"
                  value={walletAddress}
                  onChange={e => setWalletAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00ff87]/40 focus:shadow-[0_0_15px_rgba(0,255,135,0.08)] text-sm font-mono transition-all"
                />
              </div>
              <div>
                <label htmlFor="tx-hash-freeze" className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 block">Transaction Hash</label>
                <input
                  id="tx-hash-freeze"
                  type="text"
                  value={txHash}
                  onChange={e => setTxHash(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00e5ff]/40 focus:shadow-[0_0_15px_rgba(0,229,255,0.08)] text-sm font-mono transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="amount-freeze" className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 block">Amount</label>
                  <input
                    id="amount-freeze"
                    type="text"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="1.5"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 text-sm transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="asset-freeze" className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 block">Asset</label>
                  <input
                    id="asset-freeze"
                    type="text"
                    value={asset}
                    onChange={e => setAsset(e.target.value)}
                    placeholder="ETH"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 text-sm transition-all"
                  />
                </div>
              </div>
              {validationError && <p className="text-[#ff3b3b] text-sm">{validationError}</p>}
            </div>

            <button
              onClick={handleGenerate}
              disabled={!walletAddress}
              className="w-full px-6 py-4 bg-gradient-to-r from-[#00ff87] to-[#00e5ff] text-black font-semibold rounded-xl text-sm disabled:opacity-40 hover:shadow-[0_0_30px_rgba(0,255,135,0.3)] transition-all duration-300 active:scale-95"
            >
              📧 Generate Freeze Request
            </button>
          </div>

          {/* Preview */}
          <div className="animate-[fade-in_0.6s_ease-out_0.3s_both]">
            {template ? (
              <div className="space-y-4">
                {/* Subject */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Subject</span>
                    <button
                      onClick={() => handleCopy(template.subject, 'subject')}
                      className="text-xs text-[#00ff87] hover:text-[#00ff87]/80 transition-colors"
                    >
                      {copied === 'subject' ? '✅ Copied!' : '📋 Copy'}
                    </button>
                  </div>
                  <p className="text-sm font-mono text-white/80">{template.subject}</p>
                </div>

                {/* Body */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Body</span>
                    <button
                      onClick={() => handleCopy(template.body, 'body')}
                      className="text-xs text-[#00ff87] hover:text-[#00ff87]/80 transition-colors"
                    >
                      {copied === 'body' ? '✅ Copied!' : '📋 Copy'}
                    </button>
                  </div>
                  <pre className="text-sm whitespace-pre-wrap text-gray-400 font-mono leading-relaxed">{template.body}</pre>
                </div>

                {/* Download */}
                <button
                  onClick={handleDownload}
                  className="w-full px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
                >
                  📥 Download as Text
                </button>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl mb-4 opacity-20">📧</div>
                  <p className="text-gray-600 text-sm">Fill in the details to generate a template</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
