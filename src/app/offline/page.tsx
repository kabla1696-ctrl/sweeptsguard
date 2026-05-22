'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.href = '/'
    } else {
      window.location.reload()
    }
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="text-6xl mb-6">🛡️</div>

        {/* Status */}
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6 ${
          isOnline
            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`} />
          {isOnline ? 'Back Online' : 'You\'re Offline'}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-3">
          {isOnline ? 'Connection Restored' : 'No Connection'}
        </h1>

        {/* Description */}
        <p className="text-white/40 text-sm mb-8">
          {isOnline
            ? 'Your connection has been restored. Tap below to continue.'
            : 'SweepGuard needs an internet connection to scan wallets and protect your funds. Some cached pages may still be available.'
          }
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl font-semibold text-sm hover:from-violet-500 hover:to-purple-500 transition-all"
          >
            {isOnline ? 'Continue →' : '↻ Retry Connection'}
          </button>

          <Link
            href="/"
            className="px-6 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl font-semibold text-sm hover:bg-white/[0.08] transition-all"
          >
            Go Home
          </Link>
        </div>

        {/* Cached features hint */}
        {!isOnline && (
          <div className="mt-8 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl text-left">
            <p className="text-white/30 text-xs font-semibold mb-2">📦 Available Offline:</p>
            <ul className="text-white/20 text-xs space-y-1">
              <li>• Previously visited pages</li>
              <li>• Cached scan results</li>
              <li>• Static assets</li>
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}
