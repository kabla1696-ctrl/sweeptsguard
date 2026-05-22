'use client'

export default function FreezeLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="mb-10 animate-pulse">
          <div className="h-10 w-56 bg-white/5 rounded-xl mb-3" />
          <div className="h-4 w-80 max-w-full bg-white/5 rounded-lg" />
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 animate-pulse">
          <div className="h-6 w-40 bg-white/5 rounded mb-6" />
          <div className="grid sm:grid-cols-3 gap-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 bg-white/5 border border-white/10 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-pulse">
          <div className="space-y-4">
            {[1,2,3,4].map(i => (
              <div key={i}>
                <div className="h-4 w-24 bg-white/5 rounded mb-2" />
                <div className="h-12 bg-white/5 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
