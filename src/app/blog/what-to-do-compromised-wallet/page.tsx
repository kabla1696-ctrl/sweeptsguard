'use client'
import { useState } from 'react'

export default function CompromisedWalletGuidePage() {
  const [activeSection, setActiveSection] = useState(0)

  const sections = [
    {
      title: 'Signs Your Wallet Is Compromised',
      content: `If you notice unauthorized transactions, tokens being moved without your consent, or unknown approvals granted to suspicious contracts, your wallet may be compromised. Time is critical — every second counts.

Key warning signs:
• Unexpected token transfers out of your wallet
• Unknown token approvals to contracts you never interacted with
• Small "dust" transactions from unknown addresses (address poisoning)
• Your wallet interacting with known drainer contracts
• Funds moving to centralized exchanges (potential cashout attempts)`
    },
    {
      title: 'Immediate Steps to Take',
      content: `The moment you suspect compromise, act fast:

1. DO NOT interact with the compromised wallet further
2. Create a brand new wallet with a fresh seed phrase
3. If any funds remain, attempt to rescue them immediately
4. Check token approvals and revoke any suspicious ones
5. Report to relevant exchanges if funds were sent there
6. Document all suspicious transactions with TX hashes

Critical: Never import your compromised wallet's seed phrase into any new wallet — the attacker likely has it too.`
    },
    {
      title: 'How SweepGuard Rescues Your Funds',
      content: `SweepGuard uses Flashbots private transactions to rescue funds from compromised wallets. Here's how it works:

1. You provide your compromised wallet's private key
2. We create a sponsor wallet that pays gas fees
3. Using Flashbots, we bundle a gas transfer + token sweep in the same block
4. The drainer bot never sees the pending transaction
5. Your tokens arrive in your safe wallet

This works because Flashbots transactions bypass the public mempool entirely. The drainer's monitoring bots cannot detect or frontrun our rescue transaction.`
    },
    {
      title: 'Prevention: Protecting Your New Wallet',
      content: `After rescuing your funds, take these steps to protect your new wallet:

• Use a hardware wallet (Ledger, Trezor) for significant holdings
• Never sign transactions you don't understand
• Regularly audit your token approvals
• Use a separate "hot wallet" for DeFi interactions
• Enable transaction simulation before signing
• Never share your seed phrase or private key
• Be wary of phishing sites that mimic legitimate protocols
• Use browser extensions that warn about malicious sites`
    }
  ]

  return (
    <div className="min-h-screen bg-[#030305] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute rounded-full blur-[100px] animate-pulse" style={{ background: 'rgba(0,255,136,0.06)', width: 500, height: 500, top: '-10%', left: '-10%' }} />
        <div className="absolute rounded-full blur-[100px] animate-pulse" style={{ background: 'rgba(168,85,247,0.04)', width: 400, height: 400, bottom: '10%', right: '-5%', animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <div className="mb-8">
          <span className="text-xs text-green-400 font-mono uppercase tracking-wider">Blog / Guide</span>
          <h1 className="text-4xl md:text-5xl font-black mt-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            What To Do If Your Crypto Wallet Is Compromised
          </h1>
          <p className="text-gray-500 mt-4">A step-by-step guide to securing your funds and recovering from a wallet hack.</p>
          <div className="flex gap-4 mt-4 text-xs text-gray-600">
            <span>📅 May 22, 2026</span>
            <span>⏱️ 8 min read</span>
            <span>🏷️ Security, Recovery</span>
          </div>
        </div>

        <div className="space-y-4 mb-12">
          {sections.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveSection(i)}
              className={`w-full text-left p-6 rounded-2xl border transition-all ${
                activeSection === i
                  ? 'bg-white/[0.04] border-green-500/30 shadow-lg shadow-green-500/5'
                  : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  activeSection === i ? 'bg-green-500/20 text-green-400' : 'bg-white/[0.05] text-gray-500'
                }`}>
                  {i + 1}
                </span>
                <h3 className={`text-lg font-semibold ${activeSection === i ? 'text-green-400' : 'text-white/80'}`}>
                  {s.title}
                </h3>
              </div>
              {activeSection === i && (
                <div className="mt-4 ml-12 text-gray-400 text-sm leading-relaxed whitespace-pre-line">
                  {s.content}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl">
          <h3 className="text-xl font-bold text-green-400 mb-2">Need Help Right Now?</h3>
          <p className="text-gray-400 text-sm mb-4">Use SweepGuard to rescue your funds from a compromised wallet using Flashbots private transactions.</p>
          <a href="/scan" className="inline-block px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm hover:from-green-500 hover:to-emerald-500 transition-all">
            Start Rescue →
          </a>
        </div>
      </div>
    </div>
  )
}
