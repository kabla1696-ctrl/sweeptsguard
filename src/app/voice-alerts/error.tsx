'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
      <div className="text-center max-w-md px-6">
        <div className="text-6xl mb-4">🔊</div>
        <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
        <p className="text-white/40 mb-6">{error.message || 'An unexpected error occurred while loading Voice Alerts.'}</p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold text-sm hover:from-purple-500 hover:to-pink-500 transition-all"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
