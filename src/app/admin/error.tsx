'use client'

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen bg-[#030305] text-white flex items-center justify-center">
      <div className="text-center px-6">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold mb-2 text-red-400">Something went wrong</h2>
        <p className="text-white/30 text-sm mb-6">{error.message}</p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm"
        >
          Try Again
        </button>
      </div>
    </main>
  )
}
