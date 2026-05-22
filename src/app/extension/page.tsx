'use client'

import { useState } from 'react'
import Link from 'next/link'

const FEATURES = [
  {
    icon: '🛡️',
    title: 'Drainer Detection',
    description: 'Automatically detects and blocks known drainer contracts before you sign',
    details: ['Real-time drainer database', 'ML-powered pattern recognition', 'Zero-day drainer detection'],
    status: 'active',
  },
  {
    icon: '⚠️',
    title: 'Phishing Protection',
    description: 'Warns you when visiting known phishing sites targeting crypto wallets',
    details: ['10,000+ phishing domains tracked', 'URL similarity detection', 'Typosquatting alerts'],
    status: 'active',
  },
  {
    icon: '🔍',
    title: 'Transaction Simulation',
    description: 'Shows exactly what a transaction will do BEFORE you sign it',
    details: ['Token transfer previews', 'NFT movement tracking', 'Approval changes highlighted'],
    status: 'active',
  },
  {
    icon: '📊',
    title: 'Risk Score',
    description: 'Real-time risk scoring for every dApp you interact with',
    details: ['Contract audit integration', 'Community trust score', 'Historical exploit data'],
    status: 'active',
  },
  {
    icon: '🔐',
    title: 'Approval Manager',
    description: 'Monitor and revoke token approvals from one place',
    details: ['Unlimited approval alerts', 'One-click revoke', 'Approval history log'],
    status: 'new',
  },
  {
    icon: '🌐',
    title: 'Multi-Chain Support',
    description: 'Protection across 33+ EVM chains simultaneously',
    details: ['Ethereum, Base, BNB, Arbitrum', 'Polygon, Optimism, Avalanche', 'All major L2s supported'],
    status: 'active',
  },
  {
    icon: '⚡',
    title: 'EIP-7702 Rescue',
    description: 'Rescue funds from compromised wallets using EIP-7702 delegation',
    details: ['Key NEVER leaves browser', 'Sponsor pays gas', 'Atomic batch transactions'],
    status: 'new',
  },
  {
    icon: '🔔',
    title: 'Real-Time Alerts',
    description: 'Instant notifications for suspicious activity on your wallets',
    details: ['Browser push notifications', 'Telegram/Discord alerts', 'Custom alert rules'],
    status: 'beta',
  },
]

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-500/20', text: 'text-green-400', label: '✅ Active' },
  new: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: '🆕 New' },
  beta: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '🧪 Beta' },
}

export default function ExtensionPage() {
  const [installing, setInstalling] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState<number | null>(null)

  const handleInstall = () => {
    setInstalling(true)
    // Download the extension ZIP
    const link = document.createElement('a')
    link.href = '/sweeptsguard-extension.zip'
    link.download = 'sweeptsguard-extension.zip'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => setInstalling(false), 1000)
  }

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
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black mb-2">
            🧩 Browser <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">Extension</span>
          </h1>
          <p className="text-gray-500 text-lg">Real-time protection while you browse Web3</p>
        </div>

        {/* Extension Preview */}
        <div className="mb-10 p-8 bg-gradient-to-br from-green-500/[0.06] to-cyan-500/[0.06] border border-green-500/20 rounded-2xl backdrop-blur-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-cyan-500 rounded-2xl flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(0,255,135,0.2)]">
              🛡️
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">SweepGuard Extension</h2>
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">v2.0</span>
              </div>
              <p className="text-white/40 mb-4">Protect yourself from drainers, phishing sites, and malicious contracts in real-time</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-cyan-500 text-black font-semibold rounded-xl disabled:opacity-50 hover:shadow-[0_0_30px_rgba(0,255,135,0.3)] transition-all"
                >
                  {installing ? 'Downloading...' : '🧩 Install for Chrome'}
                </button>
                <button
                  onClick={handleDownloadCRX}
                  className="px-6 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white/60 hover:text-white hover:border-white/20 transition-all"
                >
                  📦 Download CRX
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { value: '33+', label: 'Chains Protected' },
            { value: '10K+', label: 'Drainers Blocked' },
            { value: '50K+', label: 'Users Protected' },
            { value: '0', label: 'Keys Exposed' },
          ].map((stat, i) => (
            <div key={i} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl text-center">
              <div className="text-2xl font-bold text-green-400">{stat.value}</div>
              <div className="text-xs text-white/40 mt-1">{stat.label}</div>
            </div>
          ))}
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

        {/* How It Works */}
        <div className="mb-10 p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <h2 className="text-xl font-bold mb-6">⚙️ How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                title: 'Install Extension',
                desc: 'One-click install from Chrome Web Store. No account needed.',
                icon: '📦',
              },
              {
                step: '2',
                title: 'Connect Wallet',
                desc: 'Extension detects your wallet (MetaMask, Rabby, etc.) automatically.',
                icon: '🔗',
              },
              {
                step: '3',
                title: 'Browse Protected',
                desc: 'Every transaction is simulated and risk-scored before you sign.',
                icon: '🛡️',
              },
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

        {/* Installation Guide */}
        <div className="mb-10 p-6 bg-gradient-to-br from-yellow-500/[0.06] to-orange-500/[0.06] border border-yellow-500/15 rounded-2xl">
          <h2 className="text-xl font-bold mb-4">📦 Installation Guide</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-xs font-bold">1</span>
              <div>
                <div className="font-medium">Download the extension</div>
                <div className="text-white/40">Click "Install for Chrome" or "Download CRX" above to get the ZIP file</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-xs font-bold">2</span>
              <div>
                <div className="font-medium">Extract the ZIP file</div>
                <div className="text-white/40">Unzip the downloaded file to a folder on your computer</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-xs font-bold">3</span>
              <div>
                <div className="font-medium">Open Chrome Extensions</div>
                <div className="text-white/40">Go to <code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-green-400">chrome://extensions</code> and enable "Developer mode"</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-xs font-bold">4</span>
              <div>
                <div className="font-medium">Load unpacked</div>
                <div className="text-white/40">Click "Load unpacked" and select the extracted extension folder</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-xs font-bold">5</span>
              <div>
                <div className="font-medium">Done! 🎉</div>
                <div className="text-white/40">SweepGuard icon will appear in your toolbar — you're protected!</div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="mb-10 p-6 bg-gradient-to-br from-purple-500/[0.06] to-blue-500/[0.06] border border-purple-500/15 rounded-2xl">
          <h2 className="text-xl font-bold mb-4">🔧 Technical Details</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-green-400 mt-0.5">✅</span>
                <div>
                  <div className="font-medium">Manifest V3</div>
                  <div className="text-white/40 text-xs">Latest extension standard — secure, fast, audited</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 mt-0.5">✅</span>
                <div>
                  <div className="font-medium">Local Processing</div>
                  <div className="text-white/40 text-xs">All analysis happens on your device — nothing sent to servers</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 mt-0.5">✅</span>
                <div>
                  <div className="font-medium">EIP-7702 Support</div>
                  <div className="text-white/40 text-xs">Industry-standard rescue protocol for compromised wallets</div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-green-400 mt-0.5">✅</span>
                <div>
                  <div className="font-medium">Open Source</div>
                  <div className="text-white/40 text-xs">Fully auditable code on GitHub</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 mt-0.5">✅</span>
                <div>
                  <div className="font-medium">Auto-Updates</div>
                  <div className="text-white/40 text-xs">Drainer database updated every hour</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 mt-0.5">✅</span>
                <div>
                  <div className="font-medium">Zero Telemetry</div>
                  <div className="text-white/40 text-xs">No tracking, no analytics, no data collection</div>
                </div>
              </div>
            </div>
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
              { name: 'Firefox', icon: '🦊' },
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
