'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Report to Sentry endpoint
    fetch('/api/sentry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        level: 'error',
        stack: error.stack,
        context: { digest: error.digest, url: window.location.href },
      }),
    }).catch(() => {})
  }, [error])

  return (
    <html lang="en">
      <body className="antialiased">
        <main className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
          <div className="max-w-md mx-auto text-center px-6">
            <span className="text-6xl block mb-6">💥</span>
            <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
            <p className="text-white/40 text-sm mb-8">
              An unexpected error occurred. This has been logged and we&apos;ll look into it.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                aria-label="Try again"
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm hover:from-green-500 hover:to-emerald-500 transition-all"
              >
                🔄 Try Again
              </button>
              <Link
                href="/"
                className="px-6 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-sm hover:bg-white/[0.08] transition-all"
              >
                🏠 Go Home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
