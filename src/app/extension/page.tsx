'use client'

import { useState } from 'react'
import Link from 'next/link'

const FEATURES = [
  { icon: '🛡️', title: 'Drainer Detection', description: 'Auto-blocks known drainer contracts before you sign', details: ['10,000+ drainer addresses tracked', 'Real-time pattern analysis', 'Zero-day drainer detection'], status: 'active' },
  { icon: '⚠️', title: 'Phishing Protection', description: 'Warns on known phishing sites targeting wallets', details: ['10,000+ phishing domains', 'URL similarity detection', 'Typosquatting alerts'], status: 'active' },
  { icon: '🔍', title: 'TX Simulation', description: 'Shows what a transaction does BEFORE you sign', details: ['Token transfer previews', 'NFT movement tracking', 'Approval changes highlighted'], status: 'active' },
  { icon: '📊', title: 'Risk Score', description: 'Real-time risk scoring for every dApp', details: ['Contract audit integration', 'Community trust score', 'Historical exploit data'], status: 'active' },
  { icon: '🔐', title: 'Approval Manager', description: 'Scan and revoke dangerous token approvals', details: ['Unlimited approval alerts', 'One-click revoke', 'Multi-chain scanning'], status: 'new' },
  { icon: '🎁', title: 'Airdrop Scanner', description: 'Check eligibility for active airdrops', details: ['10+ active airdrops tracked', 'Eligibility checker', 'Direct claim links'], status: 'new' },
  { icon: '💰', title: 'Wallet Dashboard', description: 'See balances and tokens right in the extension', details: ['Multi-chain balances', 'Token list', 'Quick copy address'], status: 'active' },
  { icon: '⚡', title: 'EIP-7702 Rescue', description: 'Rescue funds from compromised wallets', details: ['Key never leaves browser', 'Sponsor pays gas', 'Atomic batch tx'], status: 'new' },
]

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-500/20', text: 'text-green-400', label: '✅ Active' },
  new: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: '🆕 New' },
  beta: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '🧪 Beta' },
}

export default function ExtensionPage() {
  const [installing, setInstalling] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'wallet' | 'airdrops' | 'approvals' | 'protect'>('wallet')

  const handleDownload = () => {
    setInstalling(true)
    const link = document.createElement('a')
    link.href = '/sweeptsguard-extension.zip'
    link.download = 'sweeptsguard-extension.zip'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => setInstalling(false), 1000)
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-green-500/[0.05] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-purple-500/[0.03] rounded-full blur-[100px]" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/scan" className="text-sm text-white/50 hover:text-green-400 transition-colors">Scan</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-green-400 transition-colors">Dashboard</Link>
          <Link href="/blog" className="text-sm text-white/50 hover:text-green-400 transition-colors">Blog</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            v2.0 — Now with Airdrop Scanner + Approval Manager
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-4">
            🧩 Browser <span className="bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">Extension</span>
          </h1>
          <p className="text-white/40 text-lg max-w-2xl mx-auto mb-8">
            Real-time protection while you browse Web3. Block drainers, scan airdrops, manage approvals — all from your toolbar.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={handleDownload} disabled={installing}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-cyan-500 text-black font-bold rounded-xl text-lg disabled:opacity-50 hover:shadow-[0_0_40px_rgba(0,255,135,0.3)] transition-all">
              {installing ? '⏳ Downloading...' : '🧩 Download Extension'}
            </button>
            <a href="#features" className="px-8 py-4 bg-white/[0.05] border border-white/10 rounded-xl text-white/60 hover:text-white hover:border-white/20 transition-all">
              ↓ View Features
            </a>
          </div>
        </div>

        {/* Live Demo Preview */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">📱 Extension Preview</h2>
          <div className="max-w-md mx-auto bg-[#0a0a12] border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,255,135,0.1)]">
            {/* Mock Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-green-500/[0.03]">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛡️</span>
                <span className="text-sm font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">SweepGuard</span>
              </div>
              <span className="text-[10px] text-white/30 bg-white/[0.05] px-2 py-0.5 rounded">v2.0</span>
            </div>

            {/* Mock Tabs */}
            <div className="flex border-b border-white/[0.06]">
              {(['wallet', 'airdrops', 'approvals', 'protect'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 text-[11px] font-semibold text-center border-b-2 transition-all ${
                    activeTab === tab ? 'text-green-400 border-green-400' : 'text-white/30 border-transparent'
                  }`}>
                  {tab === 'wallet' ? '💰 Wallet' : tab === 'airdrops' ? '🎁 Airdrops' : tab === 'approvals' ? '🔐 Approvals' : '🛡️ Protect'}
                </button>
              ))}
            </div>

            {/* Mock Content */}
            <div className="p-4 min-h-[280px]">
              {activeTab === 'wallet' && (
                <div>
                  <div className="p-4 bg-gradient-to-br from-green-500/[0.08] to-cyan-500/[0.08] border border-green-500/15 rounded-xl mb-3">
                    <div className="text-[10px] text-white/30 font-mono mb-1">0x7A37...2C2A</div>
                    <div className="text-2xl font-bold text-green-400">2.4531 ETH</div>
                    <div className="text-[10px] text-white/30 mt-1">on Ethereum</div>
                  </div>
                  <div className="space-y-2">
                    {['ETH • 1.2345', 'USDC • 500.00', 'PEPE • 1,234,567'].map((t, i) => (
                      <div key={i} className="flex justify-between items-center p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                        <span className="text-xs font-semibold">{t.split(' • ')[0]}</span>
                        <span className="text-xs text-green-400">{t.split(' • ')[1]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'airdrops' && (
                <div className="space-y-2">
                  {['EigenLayer • $500-5000', 'zkSync • $200-2000', 'LayerZero • $100-1000'].map((a, i) => (
                    <div key={i} className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold">{a.split(' • ')[0]}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">✅ Eligible</span>
                      </div>
                      <div className="text-[10px] text-white/30">{a.split(' • ')[1]}</div>
                      <button className="w-full mt-2 py-1.5 bg-gradient-to-r from-green-600 to-cyan-600 rounded text-[10px] font-bold text-black">🎁 Claim Now</button>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'approvals' && (
                <div className="space-y-2">
                  {[
                    { token: 'USDC', spender: '0x1234...abcd', amount: 'Unlimited ⚠️' },
                    { token: 'WETH', spender: '0x5678...efgh', amount: '100' },
                    { token: 'PEPE', spender: '0x9abc...ijkl', amount: 'Unlimited ⚠️' },
                  ].map((a, i) => (
                    <div key={i} className="p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold">{a.token}</span>
                        <button className="px-2 py-0.5 bg-red-500/15 border border-red-500/30 rounded text-red-400 text-[10px]">Revoke</button>
                      </div>
                      <div className="text-[10px] text-white/20 font-mono mt-1">{a.spender}</div>
                      <div className="text-[10px] text-yellow-400 mt-1">{a.amount}</div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'protect' && (
                <div className="space-y-2">
                  {[
                    { icon: '🛡️', name: 'Drainer Detection', on: true },
                    { icon: '⚠️', name: 'Phishing Block', on: true },
                    { icon: '🔍', name: 'TX Simulation', on: true },
                    { icon: '🔔', name: 'Alerts', on: true },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                      <div className="flex items-center gap-2">
                        <span>{p.icon}</span>
                        <span className="text-xs font-semibold">{p.name}</span>
                      </div>
                      <div className={`w-8 h-4 rounded-full relative ${p.on ? 'bg-green-500' : 'bg-white/10'}`}>
                        <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 ${p.on ? 'left-4' : 'left-0.5'}`} />
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 p-3 bg-green-500/[0.04] border border-green-500/10 rounded-lg">
                    <div className="text-[10px] text-white/30">Threats Blocked</div>
                    <div className="text-lg font-bold text-green-400">247</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {[
            { value: '33+', label: 'Chains Protected', icon: '🌐' },
            { value: '10K+', label: 'Drainers Blocked', icon: '🛡️' },
            { value: '50K+', label: 'Users Protected', icon: '👥' },
            { value: '0', label: 'Keys Exposed', icon: '🔐' },
          ].map((stat, i) => (
            <div key={i} className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-center hover:border-green-500/20 transition-all">
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-black text-green-400">{stat.value}</div>
              <div className="text-xs text-white/40 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div id="features" className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-10">🛡️ Features</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {FEATURES.map((feature, i) => {
              const status = STATUS_COLORS[feature.status]
              return (
                <button key={i} onClick={() => setSelectedFeature(selectedFeature === i ? null : i)}
                  className={`p-6 bg-white/[0.02] border rounded-2xl text-left transition-all ${
                    selectedFeature === i ? 'border-green-500/30 bg-green-500/[0.04]' : 'border-white/[0.06] hover:border-white/[0.12]'
                  }`}>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{feature.icon}</span>
                    <span className={`px-2 py-0.5 ${status.bg} ${status.text} text-[10px] rounded-full font-medium`}>{status.label}</span>
                  </div>
                  <h3 className="text-lg font-bold mb-1">{feature.title}</h3>
                  <p className="text-white/40 text-sm mb-3">{feature.description}</p>
                  {selectedFeature === i && (
                    <ul className="space-y-2 pt-3 border-t border-white/[0.06]">
                      {feature.details.map((detail, j) => (
                        <li key={j} className="text-xs text-white/50 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
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
        <div className="mb-16 p-8 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <h2 className="text-2xl font-bold text-center mb-8">⚙️ How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Download & Install', desc: 'Download the ZIP, extract it, load as unpacked extension in Chrome.', icon: '📦' },
              { step: '2', title: 'Connect Wallet', desc: 'Extension auto-detects MetaMask, Rabby, or any Web3 wallet.', icon: '🔗' },
              { step: '3', title: 'Browse Protected', desc: 'Every transaction is checked, every site is verified, every approval is monitored.', icon: '🛡️' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500/10 to-cyan-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center text-2xl">{item.icon}</div>
                <div className="text-xs text-green-400 font-bold mb-2">STEP {item.step}</div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-white/40 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Download Section */}
        <div className="text-center p-10 bg-gradient-to-br from-green-500/[0.06] to-cyan-500/[0.06] border border-green-500/20 rounded-2xl">
          <h2 className="text-3xl font-bold mb-4">🧩 Download SweepGuard Extension</h2>
          <p className="text-white/40 mb-8 max-w-lg mx-auto">Works on Chrome, Brave, Edge, Opera, and all Chromium-based browsers. No account needed.</p>
          <button onClick={handleDownload} disabled={installing}
            className="px-10 py-4 bg-gradient-to-r from-green-500 to-cyan-500 text-black font-bold rounded-xl text-lg disabled:opacity-50 hover:shadow-[0_0_40px_rgba(0,255,135,0.3)] transition-all">
            {installing ? '⏳ Downloading...' : '📦 Download ZIP (22 KB)'}
          </button>
          <p className="text-white/20 text-xs mt-4">Manifest V3 • Open Source • Zero Telemetry</p>
        </div>
      </div>
    </main>
  )
}
