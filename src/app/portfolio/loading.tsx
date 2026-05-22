'use client'

export default function PortfolioLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="mb-10 animate-pulse">
          <div className="h-10 w-56 bg-white/5 rounded-xl mb-3" />
          <div className="h-4 w-80 max-w-full bg-white/5 rounded-lg" />
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 animate-pulse">
          <div className="h-8 w-48 bg-white/5 rounded mb-2" />
          <div className="h-5 w-32 bg-white/5 rounded" />
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 animate-pulse" style={{ animationDelay: `${i*80}ms` }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/5" />
                  <div className="flex-1">
                    <div className="h-4 w-20 bg-white/5 rounded mb-1" />
                    <div className="h-3 w-32 bg-white/5 rounded" />
                  </div>
                  <div className="text-right">
                    <div className="h-4 w-20 bg-white/5 rounded mb-1" />
                    <div className="h-3 w-12 bg-white/5 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-pulse">
            <div className="h-5 w-32 bg-white/5 rounded mb-6" />
            {[1,2,3,4].map(i => (
              <div key={i} className="mb-4">
                <div className="flex justify-between mb-1">
                  <div className="h-3 w-16 bg-white/5 rounded" />
                  <div className="h-3 w-8 bg-white/5 rounded" />
                </div>
                <div className="h-2 bg-white/5 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
