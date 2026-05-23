export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
        <span className="text-white/30 text-sm">Loading Audit Bot...</span>
      </div>
    </div>
  )
}
