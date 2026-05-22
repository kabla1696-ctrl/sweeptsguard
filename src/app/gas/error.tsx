'use client'

import { useEffect } from 'react'

export default function GasError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    fetch('/api/sentry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: error.message, level: 'error', context: { page: 'gas', digest: error.digest } }),
    }).catch(() => {})
  }, [error])

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#050507] via-[#0a0a0f] to-[#050507] text-white flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-6 animate-[fade-in_0.6s_ease-out]">
        <div className="relative mb-8"><div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" /><span className="text-7xl block relative">⛽</span></div>
        <h1 className="text-2xl font-bold mb-3 text-red-400">Gas Tracker Error</h1>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">Failed to load gas prices. This has been logged.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={reset} className="px-6 py-3 bg-gradient-to-r from-[#00ff87] to-[#00e5ff] text-black font-semibold rounded-xl text-sm hover:shadow-[0_0_30px_rgba(0,255,135,0.3)] transition-all duration-300">Retry</button>
          <a href="/dashboard" className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:bg-white/10 transition-all duration-300">Dashboard</a>
        </div>
      </div>
    </main>
  )
}
