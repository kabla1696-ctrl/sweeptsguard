'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { initReferralTracking } from '@/lib/referral'

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    initReferralTracking()
  }, [])

  const stats = [
    { value: '33+', label: 'Chains Supported' },
    { value: '86', label: 'TypeScript Files' },
    { value: '21', label: 'Pages' },
    { value: '0', label: 'Fund Loss Guarantee' },
  ]

  const steps = [
    {
      icon: '🔍',
      title: 'Scan',
      desc: 'Enter your wallet address, we scan all chains for leftover assets, delegations, and airdrops.',
    },
    {
      icon: '⚡',
      title: 'Recover',
      desc: 'Transfer tokens to a safe wallet using Flashbots bundles or EIP-7702 atomic rescue — invisible to drainers.',
    },
    {
      icon: '🛡️',
      title: 'Protect',
      desc: 'Revoke drainer delegation, set up 24/7 monitoring, and auto-sweep any future incoming funds.',
    },
  ]

  const features = [
    { icon: '🌐', title: 'Multi-Chain Recovery', desc: '33 EVM chains + Solana — ETH, Base, BSC, Arbitrum, Polygon, Optimism, Avalanche, and 27 more.' },
    { icon: '🔐', title: 'EIP-7702 Antidrain Rescue', desc: 'Atomic rescue using EIP-7702 delegation — your key never leaves the browser.' },
    { icon: '🖼️', title: 'NFT Rescue', desc: 'Rescue ERC-721 and ERC-1155 NFTs from compromised wallets before they get stolen.' },
    { icon: '🎁', title: 'Airdrop Claiming', desc: 'Claim all types of airdrops — ERC-20, NFT, Merkle, and more. Tokens go directly to your safe wallet.' },
    { icon: '🧩', title: 'Browser Extension', desc: 'Chrome extension with drainer detection, wallet protection, and one-click claim from any page.' },
    { icon: '📡', title: 'Real-Time Monitoring', desc: 'Watch compromised wallets 24/7. Get instant alerts when new funds arrive.' },
    { icon: '⛽', title: 'Gasless Claiming', desc: 'Atomic Flashbots bundles — gas sponsorship + claim in one transaction. Zero upfront gas needed.' },
    { icon: '📱', title: 'PWA Mobile App', desc: 'Install SweepGuard as a native app on iOS and Android. Full functionality on mobile.' },
  ]

  const pricing = [
    { name: 'Recovery', price: '20%', unit: 'platform fee', desc: 'Token recovery across all supported chains' },
    { name: 'Delegation Revoke', price: '$40', unit: 'per chain', desc: 'EIP-7702 drainer delegation removal (Base USDC)' },
    { name: 'NFT Rescue', price: '0%', unit: 'fee', desc: 'Rescue your NFTs completely free' },
    { name: 'Airdrop Claim', price: '20%', unit: 'fee', desc: 'Claim airdrops from compromised wallets' },
  ]

  const testimonials = [
    {
      name: 'Marcus Chen',
      role: 'DeFi Trader',
      text: 'SweepGuard saved $12K in tokens from my compromised wallet. The EIP-7702 rescue was instant — the drainer never saw it coming. Absolute lifesaver.',
      avatar: '🧑‍💻',
    },
    {
      name: 'Sarah Mitchell',
      role: 'NFT Collector',
      text: 'Lost access to my wallet after a phishing attack. SweepGuard recovered 47 NFTs across 3 chains in under 10 minutes. I thought they were gone forever.',
      avatar: '👩‍🎨',
    },
    {
      name: 'Alex Kowalski',
      role: 'Crypto Security Researcher',
      text: 'I recommend SweepGuard to everyone in my community. The multi-chain scanning is thorough, the auto-sweep feature is brilliant, and the 0% NFT fee is generous.',
      avatar: '🔬',
    },
  ]

  const faqs = [
    {
      q: 'How does SweepGuard recover tokens from a compromised wallet?',
      a: 'SweepGuard uses advanced techniques including Flashbots private transaction bundles and EIP-7702 atomic delegation to transfer tokens out of compromised wallets. These methods bypass public mempools, so drainers cannot front-run or intercept the recovery transactions.',
    },
    {
      q: 'Is my private key safe? Do I need to share it?',
      a: 'Absolutely not. SweepGuard never asks for or stores your private key. All signing happens locally in your browser or via our Chrome extension. The key never leaves your device. For EIP-7702 rescue, we create an atomic delegation that executes in a single transaction.',
    },
    {
      q: 'Which chains are supported?',
      a: 'We support 33+ EVM chains including Ethereum, Base, BSC, Arbitrum, Polygon, Optimism, Avalanche, Fantom, Cronos, Blast, Zora, zkEVM, Manta, zkSync, Linea, Mantle, Scroll, Gnosis, ZetaChain, Gravity, Core, Sei, Berachain, Ink, XLayer, Hemi, Kaia, Soneium, Morph, Swellchain, Mode, Monad, 0G, and Solana.',
    },
    {
      q: 'What if the drainer is still actively monitoring my wallet?',
      a: 'That\'s exactly why we use Flashbots bundles and EIP-7702 atomic transactions. These execute privately without going through the public mempool, so monitoring bots cannot detect or front-run our recovery transactions. The drainer only sees the result after it\'s done.',
    },
    {
      q: 'How does the 20% platform fee work?',
      a: 'The 20% fee is calculated on the successfully recovered amount. For example, if we recover $1,000 worth of tokens, the platform fee is $200. There\'s no upfront cost — you only pay when we successfully recover your assets. NFT rescues are completely free (0% fee).',
    },
  ]

  return (
    <main className="min-h-screen bg-[#0a0a1a] text-white relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-40%] left-[-20%] w-[800px] h-[800px] rounded-full opacity-20 blur-[180px]"
          style={{
            background: 'radial-gradient(circle, #10b981 0%, #059669 40%, transparent 70%)',
            animation: 'gradientFloat1 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute bottom-[-30%] right-[-15%] w-[700px] h-[700px] rounded-full opacity-15 blur-[160px]"
          style={{
            background: 'radial-gradient(circle, #06b6d4 0%, #0891b2 40%, transparent 70%)',
            animation: 'gradientFloat2 10s ease-in-out infinite',
          }}
        />
        <div
          className="absolute top-[20%] right-[10%] w-[500px] h-[500px] rounded-full opacity-10 blur-[140px]"
          style={{
            background: 'radial-gradient(circle, #8b5cf6 0%, #7c3aed 40%, transparent 70%)',
            animation: 'gradientFloat3 12s ease-in-out infinite',
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            SweepGuard
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link href="/scan" className="text-sm text-white/50 hover:text-green-400 transition-colors">Scan</Link>
          <Link href="/recover" className="text-sm text-white/50 hover:text-green-400 transition-colors">Recover</Link>
          <Link href="/airdrop" className="text-sm text-white/50 hover:text-green-400 transition-colors">Airdrop</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-green-400 transition-colors">Dashboard</Link>
          <Link href="/referral" className="text-sm text-white/50 hover:text-green-400 transition-colors">Referral</Link>
          <Link
            href="/scan"
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg text-sm font-semibold hover:from-green-500 hover:to-emerald-500 transition-all"
          >
            Start Recovery →
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-20 md:pt-32 pb-24">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Trusted by thousands of wallet holders
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-center leading-tight max-w-5xl">
          <span className="bg-gradient-to-r from-white via-white/95 to-white/80 bg-clip-text text-transparent">
            Recover Your Hacked Wallet
          </span>
          <br />
          <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
            — Fast, Secure, Multi-Chain
          </span>
        </h1>

        <p className="text-white/40 text-center mt-6 max-w-2xl text-lg leading-relaxed">
          SweepGuard protects compromised wallets across 33+ EVM chains and Solana.
          Flashbots bundles, EIP-7702 atomic rescue, and 24/7 auto-sweep — your funds,
          recovered before drainers can touch them.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-10">
          <Link
            href="/scan"
            className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-base hover:from-green-500 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/20"
          >
            Start Recovery →
          </Link>
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-white/[0.05] border border-white/[0.1] rounded-xl font-semibold text-base hover:bg-white/[0.08] transition-all"
          >
            View Dashboard
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="text-center p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:border-green-500/20 transition-all"
              >
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  {stat.value === '0' ? 'Zero' : stat.value}
                </div>
                <div className="text-white/30 text-sm mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              How It Works
            </span>
          </h2>
          <p className="text-white/30 text-center mb-16 max-w-xl mx-auto">
            Three simple steps to recover your compromised wallet
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={step.title} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-[calc(100%+4px)] w-[calc(100%-40px)] h-[2px] bg-gradient-to-r from-green-500/30 to-transparent" />
                )}
                <div className="p-8 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] rounded-2xl hover:border-green-500/20 transition-all text-center">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 text-sm font-bold mx-auto mb-4">
                    {i + 1}
                  </div>
                  <div className="text-4xl mb-4">{step.icon}</div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-white/30 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              Everything You Need
            </span>
          </h2>
          <p className="text-white/30 text-center mb-16 max-w-xl mx-auto">
            Comprehensive wallet protection and recovery toolkit
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] rounded-2xl hover:border-green-500/20 hover:bg-white/[0.04] transition-all group"
              >
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                <p className="text-white/30 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              Simple, Transparent Pricing
            </span>
          </h2>
          <p className="text-white/30 text-center mb-16 max-w-xl mx-auto">
            No upfront costs — pay only when we recover your assets
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className="p-6 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] rounded-2xl hover:border-green-500/30 transition-all flex flex-col"
              >
                <h3 className="text-base font-semibold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    {plan.price}
                  </span>
                  <span className="text-white/30 text-sm">{plan.unit}</span>
                </div>
                <p className="text-white/30 text-sm leading-relaxed mt-2 flex-1">{plan.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              Trusted by Users
            </span>
          </h2>
          <p className="text-white/30 text-center mb-16 max-w-xl mx-auto">
            Real stories from people who recovered their assets
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="p-6 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] rounded-2xl hover:border-green-500/20 transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-xl">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-white/30 text-xs">{t.role}</div>
                  </div>
                </div>
                <p className="text-white/50 text-sm leading-relaxed italic">&ldquo;{t.text}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              Frequently Asked Questions
            </span>
          </h2>
          <p className="text-white/30 text-center mb-16 max-w-xl mx-auto">
            Got questions? We&apos;ve got answers.
          </p>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border border-white/[0.06] rounded-xl overflow-hidden hover:border-green-500/20 transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-5 flex justify-between items-center text-left bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <span className="text-sm font-semibold pr-4">{faq.q}</span>
                  <svg
                    className={`w-5 h-5 text-white/30 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5">
                    <p className="text-white/40 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-2xl mx-auto text-center">
          <div className="p-12 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-3xl">
            <h2 className="text-3xl font-bold mb-4">Ready to Recover Your Wallet?</h2>
            <p className="text-white/40 mb-8 max-w-md mx-auto">
              Start scanning your compromised wallet now. No signup required — just paste your address.
            </p>
            <Link
              href="/scan"
              className="inline-block px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-base hover:from-green-500 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/20"
            >
              Start Recovery →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🛡️</span>
              <span className="text-lg font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                SweepGuard
              </span>
            </div>
            <div className="flex gap-6">
              <a
                href="https://github.com/kabla1696-ctrl/sweeptsguard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/30 hover:text-white/60 text-sm transition-colors"
              >
                GitHub
              </a>
              <Link href="/api-docs" className="text-white/30 hover:text-white/60 text-sm transition-colors">
                Docs
              </Link>
              <a
                href="https://x.com/SweepGuard_io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/30 hover:text-white/60 text-sm transition-colors"
              >
                Twitter
              </a>
              <Link href="/referral" className="text-white/30 hover:text-white/60 text-sm transition-colors">
                Referral
              </Link>
            </div>
            <p className="text-white/20 text-xs">Built by SweepGuard Team</p>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes gradientFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 30px) scale(1.1); }
        }
        @keyframes gradientFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, -40px) scale(1.05); }
        }
        @keyframes gradientFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 20px) scale(1.08); }
        }
      `}</style>
    </main>
  )
}
