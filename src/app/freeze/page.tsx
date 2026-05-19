'use client'

import { useState } from 'react'
import Link from 'next/link'

interface FreezeTemplate {
  exchange: string
  subject: string
  body: string
}

const EXCHANGES = ['Binance', 'Coinbase', 'OKX', 'Bybit']

function generateTemplate(
  exchange: string,
  walletAddress: string,
  txHash: string,
  amount: string,
  asset: string
): FreezeTemplate {
  const subject = `URGENT: Freeze Request - Compromised Wallet ${walletAddress.slice(0, 10)}...`

  const templates: Record<string, string> = {
    Binance: `Dear Binance Security Team,

I am writing to request an urgent freeze on funds that were stolen from my compromised wallet and deposited to your exchange.

Details:
- Compromised Wallet: ${walletAddress}
- Transaction Hash: ${txHash}
- Amount: ${amount} ${asset}
- Date: ${new Date().toISOString().split('T')[0]}

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
- Date: ${new Date().toISOString().split('T')[0]}

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
Date: ${new Date().toISOString().split('T')[0]}

Please freeze the destination account immediately. I am filing a police report and will provide case number upon request.

Regards,
[Your Name]`,

    Bybit: `Dear Bybit Security Team,

I am requesting an immediate freeze on stolen funds deposited to your platform.

Compromised Wallet: ${walletAddress}
TX Hash: ${txHash}
Amount: ${amount} ${asset}
Date: ${new Date().toISOString().split('T')[0]}

These funds were stolen from my wallet. Please freeze the receiving account pending investigation.

Best regards,
[Your Name]`
  }

  return {
    exchange,
    subject,
    body: templates[exchange] || templates.Binance
  }
}

export default function FreezePage() {
  const [walletAddress, setWalletAddress] = useState('')
  const [txHash, setTxHash] = useState('')
  const [amount, setAmount] = useState('')
  const [asset, setAsset] = useState('ETH')
  const [selectedExchange, setSelectedExchange] = useState('Binance')
  const [template, setTemplate] = useState<FreezeTemplate | null>(null)
  const [copied, setCopied] = useState<'subject' | 'body' | null>(null)

  const handleGenerate = () => {
    if (!walletAddress) return
    const t = generateTemplate(selectedExchange, walletAddress, txHash, amount, asset)
    setTemplate(t)
  }

  const handleCopy = (text: string, type: 'subject' | 'body') => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
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
        <h1 className="text-3xl font-bold mb-2">Exchange Freeze Request Generator</h1>
        <p className="text-white/40 mb-8">Generate freeze request templates for major exchanges</p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Exchange</label>
              <div className="grid grid-cols-2 gap-2">
                {EXCHANGES.map(ex => (
                  <button
                    key={ex}
                    onClick={() => setSelectedExchange(ex)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedExchange === ex
                        ? 'bg-green-600 text-white'
                        : 'bg-white/[0.05] text-white/50 hover:text-white'
                    }`}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Compromised Wallet</label>
              <input
                type="text"
                value={walletAddress}
                onChange={e => setWalletAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Transaction Hash</label>
              <input
                type="text"
                value={txHash}
                onChange={e => setTxHash(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Amount</label>
                <input
                  type="text"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="1.5"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Asset</label>
                <input
                  type="text"
                  value={asset}
                  onChange={e => setAsset(e.target.value)}
                  placeholder="ETH"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm"
                />
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={!walletAddress}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50 hover:from-green-500 hover:to-emerald-500 transition-all"
            >
              📧 Generate Freeze Request
            </button>
          </div>

          {/* Preview */}
          <div>
            {template ? (
              <div className="space-y-4">
                <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-white/30">Subject</span>
                    <button
                      onClick={() => handleCopy(template.subject, 'subject')}
                      className="text-xs text-green-400 hover:text-green-300"
                    >
                      {copied === 'subject' ? '✅ Copied!' : '📋 Copy'}
                    </button>
                  </div>
                  <p className="text-sm font-mono">{template.subject}</p>
                </div>
                <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-white/30">Body</span>
                    <button
                      onClick={() => handleCopy(template.body, 'body')}
                      className="text-xs text-green-400 hover:text-green-300"
                    >
                      {copied === 'body' ? '✅ Copied!' : '📋 Copy'}
                    </button>
                  </div>
                  <pre className="text-sm whitespace-pre-wrap text-white/70 font-mono">{template.body}</pre>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-white/20 text-sm">
                Fill in the details and generate a template
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
