'use client'

import { useState } from 'react'
import Link from 'next/link'

const CODE_EXAMPLES = {
  javascript: `// JavaScript / Node.js
const response = await fetch('https://sweeptsguard.xyz/api/v1/white-label', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sg_free_YOUR_API_KEY'
  },
  body: JSON.stringify({
    action: 'scan',
    walletAddress: '0x...'
  })
});
const data = await response.json();
console.log(data);`,

  python: `# Python
import requests

response = requests.post(
    'https://sweeptsguard.xyz/api/v1/white-label',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sg_free_YOUR_API_KEY'
    },
    json={
        'action': 'scan',
        'walletAddress': '0x...'
    }
)
data = response.json()
print(data)`,

  curl: `# cURL
curl -X POST https://sweeptsguard.xyz/api/v1/white-label \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sg_free_YOUR_API_KEY" \\
  -d '{"action": "scan", "walletAddress": "0x..."}'`,
}

export default function WhiteLabelPage() {
  const [activeTab, setActiveTab] = useState<'docs' | 'manage' | 'pricing'>('docs')
  const [codeLang, setCodeLang] = useState<keyof typeof CODE_EXAMPLES>('javascript')
  const [apiEmail, setApiEmail] = useState('')
  const [apiKeyResult, setApiKeyResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerateKey = async () => {
    if (!apiEmail || !apiEmail.includes('@')) {
      setError('Valid email required')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: apiEmail, tier: 'free' }),
      })
      const data = await res.json() as { key?: string; error?: string }
      if (data.error) setError(data.error)
      else if (data.key) setApiKeyResult(data.key)
    } catch {
      setError('Failed to generate API key')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-green-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-cyan-500/[0.03] rounded-full blur-[100px]" />
      </div>
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/api-docs" className="text-sm text-white/50 hover:text-white">API Docs</Link>
          <Link href="/scan" className="text-sm text-white/50 hover:text-white">Scan</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🔌 White-Label API</h1>
        <p className="text-white/40 mb-8">Embed SweepGuard&apos;s recovery and scanning features into your protocol</p>

        {/* Tab selector */}
        <div className="flex gap-2 mb-8">
          {(['docs', 'manage', 'pricing'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-green-600 text-white'
                  : 'bg-white/[0.03] text-white/50 hover:text-white/70'
              }`}
            >
              {tab === 'docs' ? '📖 Documentation' : tab === 'manage' ? '🔑 API Keys' : '💰 Pricing'}
            </button>
          ))}
        </div>

        {/* Documentation */}
        {activeTab === 'docs' && (
          <div className="space-y-8">
            {/* Quick Start */}
            <section className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl">
              <h2 className="text-lg font-bold mb-4">🚀 Quick Start</h2>
              <ol className="space-y-3 text-sm text-white/50">
                <li className="flex gap-2"><span className="text-green-400 font-bold">1.</span> Generate an API key from the <button onClick={() => setActiveTab('manage')} className="text-green-400 hover:underline">API Keys</button> tab</li>
                <li className="flex gap-2"><span className="text-green-400 font-bold">2.</span> Include your key in the <code className="bg-white/[0.05] px-1 rounded">Authorization: Bearer &lt;key&gt;</code> header</li>
                <li className="flex gap-2"><span className="text-green-400 font-bold">3.</span> Make a POST request to <code className="bg-white/[0.05] px-1 rounded">/api/v1/white-label</code></li>
              </ol>
            </section>

            {/* Endpoints */}
            <section>
              <h2 className="text-lg font-bold mb-4">📡 Endpoints</h2>
              <div className="space-y-4">
                {[
                  { action: 'register', desc: 'Register your platform for white-label integration', method: 'POST' },
                  { action: 'scan', desc: 'Trigger a wallet scan via your platform', method: 'POST' },
                  { action: 'insurance', desc: 'Get insurance quotes for your users', method: 'POST' },
                ].map((ep) => (
                  <div key={ep.action} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-mono rounded">{ep.method}</span>
                      <code className="text-sm font-mono text-white/70">action: &quot;{ep.action}&quot;</code>
                    </div>
                    <p className="text-sm text-white/40">{ep.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Code Examples */}
            <section>
              <h2 className="text-lg font-bold mb-4">💻 Code Examples</h2>
              <div className="flex gap-2 mb-4">
                {(Object.keys(CODE_EXAMPLES) as (keyof typeof CODE_EXAMPLES)[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setCodeLang(lang)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      codeLang === lang
                        ? 'bg-green-600 text-white'
                        : 'bg-white/[0.03] text-white/50'
                    }`}
                  >
                    {lang === 'javascript' ? 'JavaScript' : lang === 'python' ? 'Python' : 'cURL'}
                  </button>
                ))}
              </div>
              <pre className="p-5 bg-[#0d0d14] border border-white/[0.05] rounded-xl overflow-x-auto">
                <code className="text-sm text-green-400 font-mono">{CODE_EXAMPLES[codeLang]}</code>
              </pre>
            </section>

            {/* Features */}
            <section>
              <h2 className="text-lg font-bold mb-4">✨ Features</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { icon: '🔍', title: 'Wallet Scanning', desc: 'Detect drainers, delegations, and at-risk assets' },
                  { icon: '🛡️', title: 'Recovery Engine', desc: 'Execute safe recoveries with gasless relay' },
                  { icon: '🏦', title: 'Insurance', desc: 'Offer recovery insurance to your users' },
                  { icon: '🌐', title: 'Multi-chain', desc: '30+ EVM chains supported' },
                  { icon: '🎨', title: 'Custom Branding', desc: 'White-label under your platform name' },
                  { icon: '📊', title: 'Webhooks', desc: 'Real-time callbacks on recovery success' },
                ].map((f) => (
                  <div key={f.title} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                    <span className="text-xl">{f.icon}</span>
                    <h3 className="font-semibold mt-2">{f.title}</h3>
                    <p className="text-sm text-white/40 mt-1">{f.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* API Key Management */}
        {activeTab === 'manage' && (
          <div className="space-y-6">
            <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
              <h2 className="text-lg font-bold mb-4">🔑 Generate API Key</h2>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={apiEmail}
                  onChange={e => setApiEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm"
                />
                <button
                  onClick={handleGenerateKey}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate'}
                </button>
              </div>

              {error && (
                <p className="text-red-400 text-sm mt-3">{error}</p>
              )}

              {apiKeyResult && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <p className="text-green-400 font-semibold mb-2">✅ API Key Generated!</p>
                  <code className="text-sm font-mono text-white break-all">{apiKeyResult}</code>
                  <p className="text-xs text-white/30 mt-2">Save this key — it won&apos;t be shown again.</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
              <h2 className="text-lg font-bold mb-4">Authentication Methods</h2>
              <div className="space-y-3 text-sm text-white/50">
                <div className="p-3 bg-white/[0.02] rounded-lg">
                  <p className="text-white/70 font-mono mb-1">Authorization: Bearer &lt;key&gt;</p>
                  <p className="text-xs">Recommended. Pass in the Authorization header.</p>
                </div>
                <div className="p-3 bg-white/[0.02] rounded-lg">
                  <p className="text-white/70 font-mono mb-1">X-API-Key: &lt;key&gt;</p>
                  <p className="text-xs">Alternative header method.</p>
                </div>
                <div className="p-3 bg-white/[0.02] rounded-lg">
                  <p className="text-white/70 font-mono mb-1">?api_key=&lt;key&gt;</p>
                  <p className="text-xs">Query parameter (least secure, avoid in production).</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pricing */}
        {activeTab === 'pricing' && (
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Free',
                price: '$0',
                period: '/month',
                calls: '100 API calls/month',
                features: ['Basic wallet scan', 'Drainer detection', 'Up to 3 chains', 'Community support'],
                highlight: false,
              },
              {
                name: 'Pro',
                price: '$99',
                period: '/month',
                calls: '10,000 API calls/month',
                features: ['Full recovery engine', 'Insurance integration', 'Up to 10 chains', 'Webhooks', 'Custom branding', 'Priority support'],
                highlight: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: '',
                calls: '100,000+ API calls/month',
                features: ['All Pro features', 'Unlimited chains', 'Dedicated infrastructure', 'Custom integrations', 'SLA guarantee', 'Dedicated account manager'],
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`p-6 rounded-2xl border ${
                  plan.highlight
                    ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30'
                    : 'bg-white/[0.02] border-white/[0.05]'
                }`}
              >
                {plan.highlight && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full">Most Popular</span>
                )}
                <h3 className="text-xl font-bold mt-3">{plan.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-white/40 text-sm">{plan.period}</span>
                </div>
                <p className="text-sm text-white/40 mt-1">{plan.calls}</p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/50">
                      <span className="text-green-400">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button className={`w-full mt-6 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  plan.highlight
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                    : 'bg-white/[0.05] text-white/70 hover:bg-white/[0.08]'
                }`}>
                  {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
