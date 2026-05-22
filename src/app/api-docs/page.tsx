'use client'

import { useState } from 'react'
import Link from 'next/link'

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/v1/scan',
    title: 'Scan Wallet',
    description: 'Scan a wallet across all 33 chains for assets, delegations, and threats.',
    params: [
      { name: 'address', type: 'string', required: true, description: 'EVM wallet address (0x...)' },
      { name: 'chain', type: 'string', required: false, description: 'Filter to specific chain name' }
    ],
    example: 'curl "https://sweeptsguard.vercel.app/api/v1/scan?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"'
  },
  {
    method: 'GET',
    path: '/api/v1/drainers',
    title: 'Check Drainer',
    description: 'Check if an address is a known drainer contract or destination.',
    params: [
      { name: 'address', type: 'string', required: true, description: 'EVM address to check' }
    ],
    example: 'curl "https://sweeptsguard.vercel.app/api/v1/drainers?address=0xCce0A2eBE17c5E532802896Fc8AfCaaB8aBD8ba0"'
  },
  {
    method: 'POST',
    path: '/api/v1/drainers',
    title: 'Report Drainer',
    description: 'Report a new drainer address with evidence. Requires API key.',
    params: [
      { name: 'address', type: 'string', required: true, description: 'Drainer address' },
      { name: 'evidence', type: 'string', required: true, description: 'Evidence description (min 10 chars)' },
      { name: 'type', type: 'string', required: false, description: 'Drainer type (eip7702, approval, permit, etc.)' }
    ],
    example: 'curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer sg_free_KEY" -d \'{"address":"0x...","evidence":"Drained 5 ETH via fake site"}\' "https://sweeptsguard.vercel.app/api/v1/drainers"'
  },
  {
    method: 'GET',
    path: '/api/v1/reputation',
    title: 'Address Reputation',
    description: 'Get a reputation score (0-100) for an address based on on-chain analysis.',
    params: [
      { name: 'address', type: 'string', required: true, description: 'EVM address' },
      { name: 'chainId', type: 'number', required: false, description: 'Chain ID (default: 1)' }
    ],
    example: 'curl "https://sweeptsguard.vercel.app/api/v1/reputation?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"'
  },
  {
    method: 'GET',
    path: '/api/v1/gas',
    title: 'Gas Prices',
    description: 'Get current gas prices (slow/standard/fast) for all supported chains.',
    params: [
      { name: 'chainId', type: 'number', required: false, description: 'Specific chain ID' },
      { name: 'chain', type: 'string', required: false, description: 'Chain name (e.g., ethereum)' }
    ],
    example: 'curl "https://sweeptsguard.vercel.app/api/v1/gas?chainId=1"'
  },
  {
    method: 'GET',
    path: '/api/v1/airdrops',
    title: 'Check Airdrops',
    description: 'Check available airdrops for a wallet across all chains.',
    params: [
      { name: 'address', type: 'string', required: true, description: 'EVM wallet address' }
    ],
    example: 'curl "https://sweeptsguard.vercel.app/api/v1/airdrops?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"'
  },
  {
    method: 'POST',
    path: '/api/v1/keys',
    title: 'Generate API Key',
    description: 'Generate a new API key for authenticated access.',
    params: [
      { name: 'email', type: 'string', required: true, description: 'Your email address' },
      { name: 'tier', type: 'string', required: false, description: '"free" or "pro" (default: free)' }
    ],
    example: 'curl -X POST -H "Content-Type: application/json" -d \'{"email":"you@example.com"}\' "https://sweeptsguard.vercel.app/api/v1/keys"'
  },
  {
    method: 'GET',
    path: '/api/v1/keys',
    title: 'Check API Key',
    description: 'Check the status and usage of an API key.',
    params: [
      { name: 'key', type: 'string', required: true, description: 'Your API key' }
    ],
    example: 'curl "https://sweeptsguard.vercel.app/api/v1/keys?key=sg_free_..."'
  }
]

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-500/20 text-green-400 border-green-500/30',
  POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PUT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30'
}

export default function ApiDocsPage() {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [tryResult, setTryResult] = useState<string | null>(null)
  const [tryLoading, setTryLoading] = useState(false)
  const [tryEndpoint, setTryEndpoint] = useState<number | null>(null)
  const [tryParams, setTryParams] = useState<Record<string, string>>({})

  const handleTryIt = async (idx: number, endpoint: typeof ENDPOINTS[0]) => {
    setTryLoading(true)
    setTryEndpoint(idx)
    setTryResult(null)

    try {
      let url = endpoint.path
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

      if (endpoint.method === 'GET') {
        const params = new URLSearchParams()
        Object.entries(tryParams).forEach(([k, v]) => {
          if (v) params.set(k, v)
        })
        url += '?' + params.toString()
      }

      const res = await fetch(url, {
        method: endpoint.method,
        headers,
        body: endpoint.method === 'POST' ? JSON.stringify(tryParams) : undefined
      })

      const data = await res.json()
      setTryResult(JSON.stringify(data, null, 2))
    } catch (err) {
      setTryResult(`Error: ${err instanceof Error ? err.message : 'Request failed'}`)
    } finally {
      setTryLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-green-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-cyan-500/[0.03] rounded-full blur-[100px]" />
      </div>
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            SweepGuard
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-white/50 hover:text-green-400 transition-colors">Home</Link>
          <Link href="/scan" className="text-sm text-white/50 hover:text-green-400 transition-colors">Scan</Link>
          <a href="/docs/API.md" target="_blank" className="text-sm text-violet-400/70 hover:text-violet-400 transition-colors">Full Docs</a>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              API Documentation
            </span>
          </h1>
          <p className="text-white/40 text-lg">
            Integrate SweepGuard into your apps. Scan wallets, check drainers, get gas prices, and more.
          </p>

          {/* Base URL */}
          <div className="mt-6 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
            <p className="text-white/30 text-xs font-semibold mb-1">Base URL</p>
            <code className="text-violet-400 text-sm">https://sweeptsguard.vercel.app/api/v1</code>
          </div>
        </div>

        {/* Rate Limits */}
        <div className="mb-12 p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <h2 className="text-lg font-semibold mb-4">📊 Rate Limits</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              <p className="text-white/30 text-xs">Free Tier</p>
              <p className="text-xl font-bold text-green-400">100</p>
              <p className="text-white/20 text-xs">requests/day</p>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              <p className="text-white/30 text-xs">Pro Tier</p>
              <p className="text-xl font-bold text-violet-400">500</p>
              <p className="text-white/20 text-xs">requests/day</p>
            </div>
          </div>
        </div>

        {/* API Key Input */}
        <div className="mb-12 p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <h2 className="text-lg font-semibold mb-4">🔑 Try It Out</h2>
          <p className="text-white/30 text-sm mb-4">Enter your API key to test endpoints (optional for read endpoints).</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sg_free_your_api_key_here"
              className="flex-1 px-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50"
            />
            <Link
              href="#generate-key"
              className="px-4 py-2 bg-violet-600/20 border border-violet-500/30 rounded-xl text-sm text-violet-400 hover:bg-violet-600/30 transition-all whitespace-nowrap"
            >
              Get Key
            </Link>
          </div>
        </div>

        {/* Endpoints */}
        <div className="space-y-4">
          {ENDPOINTS.map((endpoint, idx) => (
            <div
              key={idx}
              className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden"
            >
              {/* Endpoint Header */}
              <button
                onClick={() => setExpanded(expanded === idx ? null : idx)}
                className="w-full flex items-center gap-3 px-6 py-4 hover:bg-white/[0.02] transition-colors text-left"
              >
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${METHOD_COLORS[endpoint.method]}`}>
                  {endpoint.method}
                </span>
                <code className="text-sm text-white/70 font-mono flex-1">{endpoint.path}</code>
                <span className="text-white/30 text-sm">{endpoint.title}</span>
                <span className="text-white/20 ml-2">{expanded === idx ? '▲' : '▼'}</span>
              </button>

              {/* Expanded Content */}
              {expanded === idx && (
                <div className="px-6 pb-6 border-t border-white/[0.05]">
                  <p className="text-white/40 text-sm mt-4 mb-4">{endpoint.description}</p>

                  {/* Parameters */}
                  <div className="mb-4">
                    <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Parameters</h3>
                    <div className="space-y-2">
                      {endpoint.params.map((param) => (
                        <div key={param.name} className="flex items-start gap-3 p-2 bg-white/[0.02] rounded-lg">
                          <code className="text-violet-400 text-xs font-mono min-w-[80px]">{param.name}</code>
                          <span className="text-white/20 text-xs">{param.type}</span>
                          {param.required && (
                            <span className="text-red-400/60 text-xs">required</span>
                          )}
                          <span className="text-white/30 text-xs flex-1">{param.description}</span>
                          <input
                            type="text"
                            placeholder={param.required ? 'required' : 'optional'}
                            value={tryParams[param.name] || ''}
                            onChange={(e) => setTryParams(prev => ({ ...prev, [param.name]: e.target.value }))}
                            className="px-2 py-1 bg-white/[0.03] border border-white/[0.08] rounded text-xs text-white placeholder:text-white/15 focus:outline-none focus:border-violet-500/50 w-48"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* cURL Example */}
                  <div className="mb-4">
                    <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Example</h3>
                    <pre className="p-3 bg-black/30 rounded-xl text-xs text-green-400/70 overflow-x-auto">
                      <code>{endpoint.example}</code>
                    </pre>
                  </div>

                  {/* Try It Button */}
                  <button
                    onClick={() => handleTryIt(idx, endpoint)}
                    disabled={tryLoading && tryEndpoint === idx}
                    className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-50"
                  >
                    {tryLoading && tryEndpoint === idx ? '⏳ Sending...' : '▶ Try It'}
                  </button>

                  {/* Result */}
                  {tryEndpoint === idx && tryResult && (
                    <div className="mt-4">
                      <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Response</h3>
                      <pre className="p-3 bg-black/30 rounded-xl text-xs text-white/60 overflow-x-auto max-h-64">
                        <code>{tryResult}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Generate Key Section */}
        <div id="generate-key" className="mt-12 p-6 bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-2xl">
          <h2 className="text-lg font-semibold mb-2">🔑 Get Your API Key</h2>
          <p className="text-white/40 text-sm mb-4">
            Get a free API key for higher rate limits and drainer reporting access.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 px-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50"
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const email = (e.target as HTMLInputElement).value
                  if (email) {
                    const res = await fetch('/api/v1/keys', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email })
                    })
                    const data = await res.json()
                    if (data.success) {
                      setApiKey(data.data.key)
                      alert(`Your API key: ${data.data.key}\n\nSave this key! It won't be shown again.`)
                    } else {
                      alert(data.error || 'Failed to generate key')
                    }
                  }
                }
              }}
            />
            <button
              className="px-4 py-2 bg-violet-600 rounded-xl text-sm font-semibold hover:bg-violet-500 transition-all"
              onClick={async () => {
                const input = document.querySelector('#generate-key input') as HTMLInputElement
                const email = input?.value
                if (email) {
                  const res = await fetch('/api/v1/keys', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                  })
                  const data = await res.json()
                  if (data.success) {
                    setApiKey(data.data.key)
                    alert(`Your API key: ${data.data.key}\n\nSave this key! It won't be shown again.`)
                  } else {
                    alert(data.error || 'Failed to generate key')
                  }
                }
              }}
            >
              Generate Key
            </button>
          </div>
        </div>

        {/* Code Examples */}
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-6">💻 Code Examples</h2>
          <div className="space-y-4">
            {[
              {
                lang: 'JavaScript',
                code: `const response = await fetch('https://sweeptsguard.vercel.app/api/v1/scan?address=0x...', {
  headers: { 'Authorization': 'Bearer sg_free_your_key' }
})
const data = await response.json()
console.log(data.data.assets)`
              },
              {
                lang: 'Python',
                code: `import requests

response = requests.get(
    'https://sweeptsguard.vercel.app/api/v1/scan',
    params={'address': '0x...'},
    headers={'Authorization': 'Bearer sg_free_your_key'}
)
data = response.json()
print(data['data']['assets'])`
              },
              {
                lang: 'cURL',
                code: `curl -H "Authorization: Bearer sg_free_your_key" \\
  "https://sweeptsguard.vercel.app/api/v1/scan?address=0x..."`
              }
            ].map((example) => (
              <div key={example.lang} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="px-4 py-2 border-b border-white/[0.05]">
                  <span className="text-white/40 text-xs font-semibold">{example.lang}</span>
                </div>
                <pre className="p-4 text-xs text-green-400/70 overflow-x-auto">
                  <code>{example.code}</code>
                </pre>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/[0.05] text-center text-white/20 text-xs">
          <p>SweepGuard API v1 — Open Source Wallet Protection</p>
          <p className="mt-1">
            <a href="https://github.com/kabla1696-ctrl/sweeptsguard" target="_blank" rel="noopener noreferrer" className="text-violet-400/30 hover:text-violet-400/50">GitHub</a>
            <span className="mx-2">•</span>
            <Link href="/" className="text-violet-400/30 hover:text-violet-400/50">Home</Link>
          </p>
        </footer>
      </div>
    </main>
  )
}
