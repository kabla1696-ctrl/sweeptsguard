'use client'

export default function TrackerLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="mb-10 animate-pulse">
          <div className="h-10 w-56 bg-white/5 rounded-xl mb-3" />
          <div className="h-4 w-80 max-w-full bg-white/5 rounded-lg" />
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 animate-pulse">
          <div className="h-16 bg-white/5 rounded-xl" />
        </div>
        <div className="space-y-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-4 animate-pulse" style={{ animationDelay: `${i*100}ms` }}>
              <div className="w-4 h-4 rounded-full bg-white/5" />
              <div className="flex-1 h-16 bg-white/5 border border-white/10 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
