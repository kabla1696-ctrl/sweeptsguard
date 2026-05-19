'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Home() {
  const [walletAddress, setWalletAddress] = useState('')

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[-10%] w-[600px] h-[600px] rounded-full bg-green-600/10 blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/8 blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-[30%] right-[20%] w-[400px] h-[400px] rounded-full bg-teal-500/5 blur-[100px] animate-pulse" style={{ animationDelay: '3s' }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            SweepGuard
          </span>
        </div>
        <div className="flex gap-4">
          <Link href="/scan" className="text-sm text-white/50 hover:text-white transition-colors">Scan</Link>
          <Link href="/tracker" className="text-sm text-white/50 hover:text-white transition-colors">Tracker</Link>
          <Link href="/airdrop" className="text-sm text-white/50 hover:text-white transition-colors">Airdrop</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">Dashboard</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 pt-20 md:pt-32">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Protecting wallets in real-time
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-center leading-tight max-w-4xl">
          <span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
            Auto-Sweep
          </span>
          <br />
          <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Protection
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-white/40 text-center mt-6 max-w-2xl text-lg leading-relaxed">
          Compromised wallet? Funds still flowing in? SweepGuard automatically detects
          incoming funds and transfers them to your safe wallet before hackers can drain them.
        </p>

        {/* CTA */}
        <div className="mt-10 w-full max-w-xl">
          <div className="flex gap-2 p-1.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Enter compromised wallet address (0x...)"
              className="flex-1 px-4 py-3 bg-transparent text-white placeholder:text-white/20 focus:outline-none text-sm"
            />
            <Link
              href={walletAddress ? `/scan?address=${walletAddress}` : '#'}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm hover:from-green-500 hover:to-emerald-500 transition-all whitespace-nowrap"
            >
              Scan Now →
            </Link>
          </div>
          <p className="text-center text-white/15 text-xs mt-3">
            Supports Ethereum, Base, BSC, Arbitrum, Polygon, Optimism
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-20 max-w-lg">
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-green-400">6</div>
            <div className="text-white/30 text-xs mt-1">Chains</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-emerald-400">&lt;5s</div>
            <div className="text-white/30 text-xs mt-1">Detection</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-teal-400">24/7</div>
            <div className="text-white/30 text-xs mt-1">Monitoring</div>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-32 max-w-4xl w-full">
          <h2 className="text-2xl font-bold text-center mb-12 text-white/80">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🔍', title: '1. Scan', desc: 'Enter your compromised wallet address. We check all chains for assets and EIP-7702 delegations.' },
              { icon: '🔗', title: '2. Track', desc: 'Track where your stolen funds went. See if they reached an exchange or drainer wallet.' },
              { icon: '⚡', title: '3. Auto-Sweep', desc: 'When funds arrive, we automatically sweep them to your safe wallet within seconds.' }
            ].map((step) => (
              <div key={step.title} className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:border-green-500/20 transition-all">
                <div className="text-3xl mb-4">{step.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-white/30 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-32 pb-8 text-center text-white/20 text-xs">
          <p>SweepGuard — Open Source Wallet Protection</p>
          <p className="mt-1">Protecting EVM wallets from drainer attacks</p>
        </footer>
      </div>
    </main>
  )
}
