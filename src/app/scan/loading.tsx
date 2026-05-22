'use client'

export default function ScanLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        {/* Header skeleton */}
        <div className="mb-10 animate-pulse">
          <div className="h-10 w-64 bg-white/5 rounded-xl mb-3" />
          <div className="h-4 w-96 max-w-full bg-white/5 rounded-lg" />
        </div>

        {/* Address input skeleton */}
        <div className="relative mb-10">
          <div className="h-16 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
        </div>

        {/* Chain selector skeleton */}
        <div className="flex gap-3 mb-10 overflow-x-auto pb-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-10 w-28 bg-white/5 border border-white/10 rounded-xl shrink-0 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>

        {/* Progress skeleton */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8 animate-pulse">
          <div className="h-5 w-40 bg-white/5 rounded-lg mb-6" />
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-4 mb-4 last:mb-0">
              <div className="w-8 h-8 rounded-full bg-white/5" />
              <div className="flex-1">
                <div className="h-4 w-48 bg-white/5 rounded mb-1" />
                <div className="h-3 w-32 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Results skeleton */}
        <div className="grid gap-4 sm:grid-cols-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-pulse" style={{ animationDelay: `${i * 150}ms` }}>
              <div className="h-5 w-32 bg-white/5 rounded mb-4" />
              <div className="h-8 w-20 bg-white/5 rounded mb-3" />
              <div className="h-3 w-full bg-white/5 rounded" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
