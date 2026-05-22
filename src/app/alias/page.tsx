'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'

interface AliasResult {
  alias: string
  address: string
  owner: string
  verified: boolean
  ensName?: string
  tags: string[]
  createdAt: number
  expiresAt: number
}

interface MarketplaceEntry {
  alias: string
  price: string
  seller: string
  listedAt: number
}

const DEMO_ALIASES: AliasResult[] = [
  { alias: 'abir.sweeptsguard', address: '0xd8dA…6045', owner: '0xd8dA…6045', verified: true, tags: ['founder', 'vip'], createdAt: Date.now() - 86400000 * 30, expiresAt: Date.now() + 86400000 * 335 },
  { alias: 'vitalik.sweeptsguard', address: '0xd8dA…6045', owner: '0xd8dA…6045', verified: true, ensName: 'vitalik.eth', tags: ['verified'], createdAt: Date.now() - 86400000 * 10, expiresAt: Date.now() + 86400000 * 355 },
  { alias: 'satoshi.sweeptsguard', address: '0x0000…0001', owner: '0x0000…0001', verified: false, tags: ['reserved'], createdAt: Date.now() - 86400000 * 60, expiresAt: Date.now() + 86400000 * 305 },
]

const DEMO_LISTINGS: MarketplaceEntry[] = [
  { alias: 'whale.sweeptsguard', price: '2.5', seller: '0xAb58…9B', listedAt: Date.now() - 86400000 * 5 },
  { alias: 'defi.sweeptsguard', price: '1.8', seller: '0xAb58…9B', listedAt: Date.now() - 86400000 * 3 },
  { alias: 'nft.sweeptsguard', price: '0.9', seller: '0x1234…5678', listedAt: Date.now() - 86400000 },
  { alias: 'trader.sweeptsguard', price: '3.2', seller: '0xDead…Beef', listedAt: Date.now() - 86400000 * 7 },
]

export default function AliasPage() {
  const [activeTab, setActiveTab] = useState<'lookup' | 'register' | 'marketplace'>('lookup')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState<AliasResult | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  // Registration
  const [regAlias, setRegAlias] = useState('')
  const [regAddress, setRegAddress] = useState('')
  const [regEns, setRegEns] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regSuccess, setRegSuccess] = useState(false)
  const [regError, setRegError] = useState('')

  // QR
  const [qrAlias, setQrAlias] = useState<string | null>(null)

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setSearchResult(null)
    await new Promise(r => setTimeout(r, 600))
    const found = DEMO_ALIASES.find(a => a.alias.includes(searchQuery.toLowerCase().trim()))
    setSearchResult(found || null)
    setSearchLoading(false)
  }, [searchQuery])

  const handleRegister = useCallback(async () => {
    setRegError('')
    setRegSuccess(false)
    if (!regAlias.trim() || !regAddress.trim()) {
      setRegError('Alias and address are required')
      return
    }
    if (regAlias.length < 3) {
      setRegError('Alias must be at least 3 characters')
      return
    }
    if (!regAddress.startsWith('0x') || regAddress.length !== 42) {
      setRegError('Invalid Ethereum address')
      return
    }
    setRegLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    setRegSuccess(true)
    setRegLoading(false)
  }, [regAlias, regAddress, regEns])

  const generateQR = (alias: string) => {
    setQrAlias(alias)
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/scan" className="text-sm text-white/50 hover:text-white">Scan</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white">Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Address Aliases</span>
          </h1>
          <p className="text-white/40">Register human-readable names for your wallet addresses. Send funds using aliases instead of 0x addresses.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-white/[0.03] rounded-xl p-1 border border-white/[0.05]">
          {(['lookup', 'register', 'marketplace'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {tab === 'lookup' ? '🔍 Lookup' : tab === 'register' ? '✨ Register' : '🏪 Marketplace'}
            </button>
          ))}
        </div>

        {/* Lookup Tab */}
        {activeTab === 'lookup' && (
          <div className="space-y-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search alias (e.g. abir.sweeptsguard)"
                className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm"
              />
              <button
                onClick={handleSearch}
                disabled={searchLoading}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50"
              >
                {searchLoading ? '...' : '🔍 Search'}
              </button>
            </div>

            {searchResult && (
              <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-green-400">{searchResult.alias}</h3>
                    <p className="text-white/40 text-sm font-mono mt-1">{searchResult.address}</p>
                  </div>
                  {searchResult.verified && (
                    <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-medium">✓ Verified</span>
                  )}
                </div>
                {searchResult.ensName && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-white/30">ENS:</span>
                    <span className="text-blue-400">{searchResult.ensName}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  {searchResult.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-white/[0.05] rounded-full text-xs text-white/50">{tag}</span>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => generateQR(searchResult.alias)}
                    className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm hover:bg-white/[0.08] transition-all"
                  >
                    📱 QR Code
                  </button>
                  <button
                    onClick={() => navigator.clipboard?.writeText(searchResult.address)}
                    className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm hover:bg-white/[0.08] transition-all"
                  >
                    📋 Copy Address
                  </button>
                </div>
              </div>
            )}

            {searchQuery && !searchLoading && !searchResult && (
              <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-center">
                <p className="text-white/30 text-sm">No alias found for &quot;{searchQuery}&quot;</p>
                <button
                  onClick={() => { setActiveTab('register'); setRegAlias(searchQuery) }}
                  className="mt-3 px-4 py-2 bg-green-600/20 border border-green-500/20 rounded-lg text-green-400 text-sm hover:bg-green-600/30 transition-all"
                >
                  Register this alias →
                </button>
              </div>
            )}

            {/* Popular aliases */}
            <div>
              <h3 className="text-sm font-medium text-white/30 mb-3">Popular Aliases</h3>
              <div className="grid gap-2">
                {DEMO_ALIASES.map(a => (
                  <button
                    key={a.alias}
                    onClick={() => { setSearchQuery(a.alias); setSearchResult(a) }}
                    className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">👤</span>
                      <div>
                        <span className="text-sm font-medium">{a.alias}</span>
                        <p className="text-xs text-white/30 font-mono">{a.address}</p>
                      </div>
                    </div>
                    {a.verified && <span className="text-green-400 text-xs">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Register Tab */}
        {activeTab === 'register' && (
          <div className="space-y-6">
            <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-4">
              <h3 className="text-lg font-semibold">Register New Alias</h3>
              <p className="text-white/30 text-sm">Create a human-readable name for your wallet address. Registration costs 0.01 ETH/year.</p>

              <div>
                <label className="block text-sm text-white/40 mb-1">Alias Name</label>
                <div className="flex items-center gap-0">
                  <input
                    type="text"
                    value={regAlias}
                    onChange={e => setRegAlias(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                    placeholder="yourname"
                    maxLength={32}
                    className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-l-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm"
                  />
                  <span className="px-3 py-3 bg-white/[0.05] border border-l-0 border-white/[0.06] rounded-r-xl text-white/30 text-sm">.sweeptsguard</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/40 mb-1">Wallet Address</label>
                <input
                  type="text"
                  value={regAddress}
                  onChange={e => setRegAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-sm text-white/40 mb-1">ENS Name (optional)</label>
                <input
                  type="text"
                  value={regEns}
                  onChange={e => setRegEns(e.target.value)}
                  placeholder="yourname.eth"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm"
                />
              </div>

              {regError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{regError}</div>
              )}
              {regSuccess && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
                  ✅ Alias <strong>{regAlias}.sweeptsguard</strong> registered successfully!
                </div>
              )}

              <button
                onClick={handleRegister}
                disabled={regLoading}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50"
              >
                {regLoading ? 'Registering...' : '✨ Register Alias (0.01 ETH/year)'}
              </button>
            </div>

            {/* Alias format guide */}
            <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
              <h3 className="text-sm font-semibold mb-3">Alias Rules</h3>
              <ul className="space-y-2 text-sm text-white/40">
                <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> 3-32 characters, lowercase letters, numbers, dots, hyphens</li>
                <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> Must start and end with alphanumeric character</li>
                <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> Auto-appends .sweeptsguard suffix</li>
                <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> ENS name linking for verified identity</li>
                <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> Valid for 1 year from registration</li>
              </ul>
            </div>
          </div>
        )}

        {/* Marketplace Tab */}
        {activeTab === 'marketplace' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Alias Marketplace</h3>
              <span className="text-xs text-white/30">{DEMO_LISTINGS.length} listings</span>
            </div>
            {DEMO_LISTINGS.map(listing => (
              <div
                key={listing.alias}
                className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏷️</span>
                  <div>
                    <span className="text-sm font-medium">{listing.alias}</span>
                    <p className="text-xs text-white/30 font-mono">{listing.seller}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-lg font-bold text-green-400">{listing.price} ETH</span>
                    <p className="text-xs text-white/30">{Math.floor((Date.now() - listing.listedAt) / 86400000)}d ago</p>
                  </div>
                  <button className="px-4 py-2 bg-green-600/20 border border-green-500/20 rounded-lg text-green-400 text-sm hover:bg-green-600/30 transition-all">
                    Buy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* QR Code Modal */}
        {qrAlias && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setQrAlias(null)}>
            <div className="bg-[#12121a] border border-white/[0.08] rounded-2xl p-8 max-w-sm w-full mx-4 text-center" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">QR Code</h3>
              <div className="w-48 h-48 mx-auto bg-white rounded-xl flex items-center justify-center mb-4">
                {/* Simple QR placeholder using SVG pattern */}
                <svg viewBox="0 0 100 100" className="w-40 h-40">
                  <rect width="100" height="100" fill="white"/>
                  <rect x="5" y="5" width="25" height="25" fill="black" rx="2"/>
                  <rect x="70" y="5" width="25" height="25" fill="black" rx="2"/>
                  <rect x="5" y="70" width="25" height="25" fill="black" rx="2"/>
                  <rect x="10" y="10" width="15" height="15" fill="white" rx="1"/>
                  <rect x="75" y="10" width="15" height="15" fill="white" rx="1"/>
                  <rect x="10" y="75" width="15" height="15" fill="white" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" fill="black"/>
                  <rect x="79" y="14" width="7" height="7" fill="black"/>
                  <rect x="14" y="79" width="7" height="7" fill="black"/>
                  {[35,45,55,65].map(x => [35,45,55,65].map(y => (
                    <rect key={`${x}-${y}`} x={x} y={y} width={5} height={5} fill={Math.random()>0.5?"black":"white"}/>
                  )))}
                  <rect x="35" y="5" width="5" height="5" fill="black"/>
                  <rect x="50" y="5" width="5" height="5" fill="black"/>
                  <rect x="5" y="35" width="5" height="5" fill="black"/>
                  <rect x="5" y="50" width="5" height="5" fill="black"/>
                </svg>
              </div>
              <p className="text-green-400 font-mono text-sm mb-1">{qrAlias}</p>
              <p className="text-white/30 text-xs mb-4">Scan to send funds to this alias</p>
              <button
                onClick={() => setQrAlias(null)}
                className="px-6 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm hover:bg-white/[0.08] transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
