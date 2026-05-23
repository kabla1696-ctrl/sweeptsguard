export default function Loading() {
  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-[#00ff87]/30 border-t-[#00ff87] rounded-full animate-spin" />
        <p className="text-white/50 text-sm">Loading...</p>
      </div>
    </div>
  )
}
