'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    fetch('/api/sentry', {
      method: 'POST',
      body: JSON.stringify({ message: error.message, stack: error.stack, digest: error.digest }),
    }).catch(() => {})
  }, [error])

  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl">⚠️</div>
        <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
        <p className="text-white/50 text-sm">{error.message}</p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-[#00ff87]/10 border border-[#00ff87]/30 rounded-xl text-[#00ff87] font-medium hover:bg-[#00ff87]/20 transition-all"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
