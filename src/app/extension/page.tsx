'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ExtensionPage() {
  const [installing, setInstalling] = useState(false)

  const handleInstall = () => {
    setInstalling(true)
    // In production, this would link to Chrome Web Store
    setTimeout(() => {
      setInstalling(false)
      window.open('https://chrome.google.com/webstore/detail/sweeptsguard', '_blank')
    }, 1000)
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-green-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-cyan-500/[0.03] rounded-full blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            SweepGuard
          </span>
        </Link>
        <div className="flex gap-4">
          <Link href="/scan" className="text-sm text-white/50 hover:text-green-400 transition-colors">Scan</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-green-400 transition-colors">Dashboard</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black mb-2">
            🧩 Browser <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">Extension</span>
          </h1>
          <p className="text-gray-500 text-lg">Real-time protection while you browse Web3</p>
        </div>

        {/* Extension Preview */}
        <div className="mb-10 p-8 bg-white/[0.02] border border-white/[0.06] rounded-2xl backdrop-blur-sm">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-cyan-500 rounded-2xl flex items-center justify-center text-4xl">
              🛡️
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">SweepGuard Extension</h2>
              <p className="text-white/40 mb-4">Protect yourself from drainers, phishing sites, and malicious contracts</p>
              <button
                onClick={handleInstall}
                disabled={installing}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-cyan-500 text-black font-semibold rounded-xl disabled:opacity-50 hover:shadow-[0_0_30px_rgba(0,255,135,0.3)] transition-all"
              >
                {installing ? 'Opening...' : '🧩 Install Extension'}
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {[
            {
              icon: '🛡️',
              title: 'Drainer Detection',
              description: 'Automatically detects and blocks known drainer contracts before you sign'
            },
            {
              icon: '⚠️',
              title: 'Phishing Protection',
              description: 'Warns you when visiting known phishing sites targeting crypto wallets'
            },
            {
              icon: '🔍',
              title: 'Transaction Preview',
              description: 'Shows exactly what a transaction will do before you sign it'
            },
            {
              icon: '📊',
              title: 'Risk Score',
              description: 'Real-time risk scoring for every dApp you interact with'
            }
          ].map((feature, i) => (
            <div key={i} className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-xl backdrop-blur-sm">
              <span className="text-2xl mb-3 block">{feature.icon}</span>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-white/40 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Compatibility */}
        <div className="p-5 bg-green-500/[0.06] border border-green-500/15 rounded-2xl backdrop-blur-sm">
          <h3 className="text-green-400 font-semibold mb-2">🌐 Browser Support</h3>
          <div className="flex flex-wrap gap-3 mt-3">
            {['Chrome', 'Firefox', 'Brave', 'Edge', 'Opera'].map((browser) => (
              <span key={browser} className="px-3 py-1.5 bg-white/[0.05] rounded-lg text-sm text-white/60">
                {browser}
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
