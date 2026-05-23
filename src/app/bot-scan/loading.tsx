export default function BotScanLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-purple-500/20 rounded-full animate-spin">
            <div className="absolute top-0 left-0 w-16 h-16 border-2 border-transparent border-t-purple-400 rounded-full animate-spin" />
          </div>
        </div>
        <p className="mt-6 text-white/40 text-sm animate-pulse">Loading Bot Scanner...</p>
      </div>
    </main>
  )
}
