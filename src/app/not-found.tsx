import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-6">
        <span className="text-6xl block mb-6">🔍</span>
        <h1 className="text-4xl font-bold mb-3">404</h1>
        <p className="text-white/40 text-sm mb-2">Page not found</p>
        <p className="text-white/30 text-xs mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm hover:from-green-500 hover:to-emerald-500 transition-all"
          >
            🏠 Go Home
          </Link>
          <Link
            href="/scan"
            className="px-6 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-sm hover:bg-white/[0.08] transition-all"
          >
            🔍 Scan Wallet
          </Link>
        </div>
      </div>
    </main>
  )
}
