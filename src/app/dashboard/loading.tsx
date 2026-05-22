'use client'

export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="mb-10 animate-pulse">
          <div className="h-10 w-72 bg-white/5 rounded-xl mb-3" />
          <div className="h-4 w-80 max-w-full bg-white/5 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-pulse" style={{ animationDelay: `${i*100}ms` }}>
              <div className="h-4 w-24 bg-white/5 rounded mb-3" />
              <div className="h-8 w-16 bg-white/5 rounded mb-2" />
              <div className="h-3 w-32 bg-white/5 rounded" />
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 animate-pulse">
            <div className="h-6 w-48 bg-white/5 rounded mb-6" />
            <div className="h-48 bg-white/5 rounded-xl" />
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-pulse">
            <div className="h-6 w-32 bg-white/5 rounded mb-6" />
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-white/5" />
                <div className="flex-1 h-4 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
