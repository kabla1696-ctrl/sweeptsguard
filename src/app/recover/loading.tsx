'use client'

export default function RecoverLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="mb-10 animate-pulse">
          <div className="h-10 w-64 bg-white/5 rounded-xl mb-3" />
          <div className="h-4 w-80 max-w-full bg-white/5 rounded-lg" />
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 animate-pulse">
          <div className="flex gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex-1 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-white/5 mb-2" />
                <div className="h-3 w-16 mx-auto bg-white/5 rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-pulse">
          <div className="h-6 w-48 bg-white/5 rounded mb-6" />
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 bg-white/5 border border-white/10 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
