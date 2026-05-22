export default function FamilyLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-[#00ff87]/20 blur-[40px] animate-pulse" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#00ff87] to-[#00e5ff] flex items-center justify-center mx-auto">
            <span className="text-3xl">👨‍👩‍👧‍👦</span>
          </div>
        </div>
        <div className="inline-flex items-center gap-3 text-[#00ff87]">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-medium">Loading Family Protection...</span>
        </div>
      </div>
    </main>
  )
}
