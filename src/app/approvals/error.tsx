'use client'

import { useEffect } from 'react'

export default function ApprovalsError({
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
        context: { page: 'approvals', digest: error.digest },
      }),
    }).catch(() => {})
  }, [error])

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-6">
        <span className="text-6xl block mb-6">🔓</span>
        <h1 className="text-2xl font-bold mb-3 text-red-400">Approval Dashboard Error</h1>
        <p className="text-white/40 text-sm mb-8">
          Failed to load token approvals. This has been logged.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-orange-600 rounded-xl font-semibold text-sm hover:bg-orange-500 transition-all"
          >
            Retry
          </button>
          <a
            href="/scan"
            className="px-6 py-3 bg-white/10 rounded-xl font-semibold text-sm hover:bg-white/20 transition-all"
          >
            Back to Scanner
          </a>
        </div>
      </div>
    </main>
  )
}
