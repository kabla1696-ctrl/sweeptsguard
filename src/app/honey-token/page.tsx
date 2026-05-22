"use client"

import Link from 'next/link'

export default function HoneyTokenPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">Dashboard</Link>
          <Link href="/audit-bot" className="text-sm text-white/50 hover:text-white transition-colors">Audit Bot</Link>
          <Link href="/security-quests" className="text-sm text-white/50 hover:text-white transition-colors">Quests</Link>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-4xl">🍯</span>
          <div>
            <h1 className="text-3xl font-bold">Honey Token</h1>
            <p className="text-white/40">Deploy decoy tokens to detect unauthorized access to your wallet before real assets are at risk.</p>
          </div>
        </div>
        <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
          <div className="text-6xl mb-4">🍯</div>
          <h2 className="text-xl font-bold mb-2">Coming Soon</h2>
          <p className="text-white/40 text-sm mb-6 max-w-md mx-auto">This feature is under active development. Check back soon!</p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard" className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-400 rounded-xl text-sm font-semibold hover:opacity-90 transition-all">Back to Dashboard</Link>
            <Link href="/security-quests" className="px-5 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white/60 hover:text-white transition-all">View Quests</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
