'use client'

import { useEffect } from 'react'

export default function HoneyTokenError({
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
      body: JSON.stringify({
        message: error.message,
        level: 'error',
        context: { page: 'honey-token', digest: error.digest },
      }),
    }).catch(() => {})
  }, [error])

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-6">
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-[#ffd700]/10 blur-[40px]" />
          <span className="relative text-6xl block">🍯</span>
        </div>
        <h1 className="text-2xl font-bold mb-3 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] bg-clip-text text-transparent">Honey Token Error</h1>
        <p className="text-white/40 text-sm mb-8">
          The honey token system encountered an error. This has been logged.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-6 py-3 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] rounded-xl font-semibold text-sm text-black hover:shadow-[0_0_30px_rgba(255,215,0,0.2)] transition-all">
            Retry
          </button>
          <a href="/dashboard" className="px-6 py-3 bg-white/[0.05] backdrop-blur-xl border border-white/[0.08] rounded-xl font-semibold text-sm hover:bg-white/[0.08] transition-all">
            Dashboard
          </a>
        </div>
      </div>
    </main>
  )
}
