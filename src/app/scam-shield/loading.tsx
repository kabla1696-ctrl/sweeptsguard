export default function ScamShieldLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-[#00ff87]/20 rounded-full animate-spin">
            <div className="absolute top-0 left-0 w-16 h-16 border-2 border-transparent border-t-[#00ff87] rounded-full animate-spin" />
          </div>
        </div>
        <p className="mt-6 text-white/40 text-sm animate-pulse">Loading Scam Shield...</p>
      </div>
    </main>
  )
}
