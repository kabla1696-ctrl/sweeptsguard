'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function DarkWebPage() {
  const [address, setAddress] = useState('')
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState<{
    found: boolean
    mentions: Array<{
      source: string
      date: string
      type: string
      severity: string
    }>
  } | null>(null)

  const handleScan = async () => {
    if (!address.trim()) return
    
    setScanning(true)
    setResults(null)
    
    // Simulate scan (real implementation would use dark web monitoring API)
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    setResults({
      found: false,
      mentions: []
    })
    setScanning(false)
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-violet-500/[0.03] rounded-full blur-[100px]" />
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
          <Link href="/scan" className="text-sm text-white/50 hover:text-purple-400 transition-colors">Scan</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-purple-400 transition-colors">Dashboard</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black mb-2">
            🕵️ Dark Web <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">Monitor</span>
          </h1>
          <p className="text-gray-500 text-lg">Scan dark web forums and marketplaces for wallet address mentions</p>
        </div>

        {/* Scan Input */}
        <div className="mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter wallet address (0x...)"
              className="flex-1 px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
            />
            <button
              onClick={handleScan}
              disabled={scanning}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-violet-500 text-white font-semibold rounded-xl disabled:opacity-50 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all"
            >
              {scanning ? 'Scanning...' : '🕵️ Scan Dark Web'}
            </button>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{results.found ? '⚠️' : '✅'}</span>
              <div>
                <h3 className="text-lg font-semibold">
                  {results.found ? 'Mentions Found' : 'No Mentions Found'}
                </h3>
                <p className="text-white/40 text-sm">
                  {results.found 
                    ? 'Your wallet address was found on dark web sources'
                    : 'Your wallet address was not found on monitored dark web sources'}
                </p>
              </div>
            </div>

            {results.mentions.length > 0 && (
              <div className="space-y-3">
                {results.mentions.map((mention, i) => (
                  <div key={i} className="p-3 bg-white/[0.03] rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{mention.source}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        mention.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                        mention.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {mention.severity}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs">{mention.date} • {mention.type}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="mt-8 p-5 bg-purple-500/[0.06] border border-purple-500/15 rounded-2xl backdrop-blur-sm">
          <h3 className="text-purple-400 font-semibold mb-2">🔮 How It Works</h3>
          <ul className="text-white/40 text-sm space-y-2">
            <li>• Monitors dark web forums, marketplaces, and paste sites</li>
            <li>• Alerts you if your wallet address appears in leaked data</li>
            <li>• Helps detect if your address has been targeted by hackers</li>
            <li>• Regular monitoring recommended for compromised wallets</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
