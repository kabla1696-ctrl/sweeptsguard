'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 p-6 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl text-white font-bold mb-2">Something went wrong</h2>
        <p className="text-gray-400 mb-4">{error.message}</p>
        <button onClick={reset} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">Try Again</button>
      </div>
    </div>
  )
}
