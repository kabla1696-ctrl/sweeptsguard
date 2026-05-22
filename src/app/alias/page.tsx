'use client'

import { useState } from 'react'
import Link from 'next/link'

const MOCK_ALIASES = [
  { alias: 'alice.eth', address: '0x1234567890abcdef1234567890abcdef12345678', verified: true, created: '2026-01-15' },
  { alias: 'bob.wallet', address: '0xabcdef1234567890abcdef1234567890abcdef12', verified: true, created: '2026-02-20' },
  { alias: 'treasury', address: '0x9876543210fedcba9876543210fedcba98765432', verified: false, created: '2026-03-10' },
]

export default function AliasPage() {
  const [alias, setAlias] = useState('')
  const [address, setAddress] = useState('')
  const [lookupQuery, setLookupQuery] = useState('')
  const [lookupResult, setLookupResult] = useState<any>(null)
  const [registering, setRegistering] = useState(false)
  const [looking, setLooking] = useState(false)
  const [showQR, setShowQR] = useState<string | null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegistering(true)
    await new Promise(r => setTimeout(r, 1500))
    setRegistering(false)
    setAlias('')
    setAddress('')
  }

  const handleLookup = async () => {
    if (!lookupQuery) return
    setLooking(true)
    await new Promise(r => setTimeout(r, 1000))
    setLookupResult({
      alias: lookupQuery,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      verified: true,
      created: '2026-01-15',
    })
    setLooking(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-violet-500/5 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#00ff87]/5 rounded-full blur-[128px] animate-pulse delay-1000" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-[#00ff87] to-[#00e5ff] bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-6">
          <Link href="/dashboard" className="text-sm text-white/40 hover:text-white/80 transition-colors">Dashboard</Link>
          <Link href="/alias" className="text-sm text-violet-400 font-semibold">Address Alias</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Human-Readable Addresses
          </div>
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-[#00e5ff] bg-clip-text text-transparent">Address</span>{' '}
            <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Alias</span>
          </h1>
          <p className="text-white/40 text-lg max-w-xl mx-auto">Replace complex addresses with memorable names. Send to &quot;alice.eth&quot; instead of 0x...</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Register */}
          <div className="space-y-6">
            <form onSubmit={handleRegister} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 hover:border-violet-500/20 transition-all duration-500">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-violet-400">✏️</span> Register Alias
              </h2>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Alias Name</label>
                  <input value={alias} onChange={e => setAlias(e.target.value)} placeholder="myalias.eth" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 transition-all" />
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Wallet Address</label>
                  <input value={address} onChange={e => setAddress(e.target.value)} placeholder="0x..." className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 transition-all font-mono" />
                </div>
              </div>
              <button type="submit" disabled={registering} className="w-full py-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all duration-300 disabled:opacity-50">
                {registering ? 'Registering...' : 'Register Alias'}
              </button>
            </form>

            {/* Lookup */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-[#00e5ff]">🔍</span> Lookup Alias
              </h2>
              <div className="flex gap-2 mb-4">
                <input
                  value={lookupQuery}
                  onChange={e => setLookupQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleLookup() }}
                  placeholder="Enter alias..."
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 transition-all"
                />
                <button onClick={handleLookup} disabled={looking} className="px-5 py-3 bg-[#00e5ff]/10 border border-[#00e5ff]/20 text-[#00e5ff] rounded-xl text-sm font-medium hover:bg-[#00e5ff]/20 transition-all disabled:opacity-50">
                  {looking ? '...' : 'Lookup'}
                </button>
              </div>
              {lookupResult && (
                <div className="bg-white/[0.04] rounded-xl p-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-white/90">{lookupResult.alias}</span>
                    {lookupResult.verified && <span className="text-green-400 text-xs">✓ Verified</span>}
                  </div>
                  <div className="font-mono text-xs text-white/50 break-all">{lookupResult.address}</div>
                  <button onClick={() => setShowQR(lookupResult.address)} className="mt-3 text-xs text-violet-400 hover:text-violet-300 transition-colors">
                    📱 Show QR Code
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Alias List */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-[#00ff87]">📋</span> Your Aliases
            </h2>
            <div className="space-y-3">
              {MOCK_ALIASES.map((a, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-4 hover:border-violet-500/20 transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white/90">{a.alias}</span>
                      {a.verified && <span className="text-green-400 text-[10px]">✓</span>}
                    </div>
                    <button onClick={() => setShowQR(a.address)} className="text-xs text-white/30 hover:text-violet-400 transition-colors opacity-0 group-hover:opacity-100">
                      📱 QR
                    </button>
                  </div>
                  <div className="font-mono text-xs text-white/40 break-all">{a.address}</div>
                  <div className="text-xs text-white/20 mt-2">Created: {a.created}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* QR Modal */}
        {showQR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowQR(null)}>
            <div className="bg-white/[0.05] backdrop-blur-xl border border-white/[0.1] rounded-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="w-48 h-48 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <div className="text-black font-mono text-xs break-all px-4">{showQR}</div>
              </div>
              <p className="text-white/40 text-sm font-mono break-all">{showQR}</p>
              <button onClick={() => setShowQR(null)} className="mt-4 px-6 py-2 bg-white/10 rounded-xl text-sm hover:bg-white/20 transition-all">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
