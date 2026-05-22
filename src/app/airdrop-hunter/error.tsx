'use client'

import { useEffect } from 'react'

export default function AirdropHunterError({
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
        context: { page: 'airdrop-hunter', digest: error.digest },
      }),
    }).catch(() => {})
  }, [error])

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-6">
        <span className="text-6xl block mb-6">🎁</span>
        <h1 className="text-2xl font-bold mb-3 text-red-400">Airdrop Hunter Error</h1>
        <p className="text-white/40 text-sm mb-8">
          The airdrop hunter encountered an error. This has been logged.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-purple-600 rounded-xl font-semibold text-sm hover:bg-purple-500 transition-all"
          >
            Retry
          </button>
          <a
            href="/airdrop"
            className="px-6 py-3 bg-white/10 rounded-xl font-semibold text-sm hover:bg-white/20 transition-all"
          >
            Airdrops
          </a>
        </div>
      </div>
    </main>
  )
}
