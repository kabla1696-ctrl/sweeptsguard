'use client'

import { useEffect } from 'react'

export default function BotScanError({
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
      body: JSON.stringify({ message: error.message, level: 'error', context: { page: 'bot-scan', digest: error.digest } }),
    }).catch(() => {})
  }, [error])

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-6">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <span className="text-4xl">🤖</span>
        </div>
        <h1 className="text-2xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">Bot Error</h1>
        <p className="text-white/40 text-sm mb-8">The bot scanner encountered an error.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-6 py-3 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-xl font-semibold text-sm hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all">
            Retry
          </button>
          <a href="/dashboard" className="px-6 py-3 bg-white/10 rounded-xl font-semibold text-sm hover:bg-white/20 transition-all">
            Dashboard
          </a>
        </div>
      </div>
    </main>
  )
}
