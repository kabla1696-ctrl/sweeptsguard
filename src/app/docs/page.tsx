import Link from 'next/link'

export const metadata = {
  title: 'Documentation — SweepGuard',
  description: 'Learn how to use SweepGuard for crypto wallet recovery, monitoring, and security across 33+ chains.',
  openGraph: {
    title: 'Documentation — SweepGuard',
    description: 'Learn how to use SweepGuard for crypto wallet recovery, monitoring, and security.',
  },
}

interface DocSection {
  slug: string
  title: string
  description: string
  icon: string
}

const sections: DocSection[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    description: 'Set up SweepGuard and recover your first wallet in minutes.',
    icon: '🚀',
  },
  {
    slug: 'how-recovery-works',
    title: 'How Recovery Works',
    description: 'Understand Flashbots, EIP-7702, and the recovery pipeline.',
    icon: '🔄',
  },
  {
    slug: 'chain-support',
    title: 'Chain Support',
    description: 'Full list of supported EVM chains and Solana networks.',
    icon: '⛓️',
  },
  {
    slug: 'extension-setup',
    title: 'Extension Setup',
    description: 'Configure the browser extension for real-time protection.',
    icon: '🧩',
  },
  {
    slug: 'api-reference',
    title: 'API Reference',
    description: 'Integrate SweepGuard into your own applications.',
    icon: '📡',
  },
  {
    slug: 'faq',
    title: 'FAQ',
    description: 'Frequently asked questions about SweepGuard.',
    icon: '❓',
  },
  {
    slug: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'Common issues and how to resolve them.',
    icon: '🔧',
  },
]

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#030305] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-green-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-cyan-500/[0.03] rounded-full blur-[100px]" />
      </div>
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/blog" className="text-sm text-zinc-400 hover:text-white transition">Blog</Link>
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition">Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-3">📚 Documentation</h1>
          <p className="text-zinc-400 text-lg">
            Everything you need to know about using SweepGuard for wallet recovery, monitoring, and security.
          </p>
        </div>

        {/* Quick Start */}
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6 mb-10">
          <h2 className="text-lg font-semibold mb-2">⚡ Quick Start</h2>
          <p className="text-zinc-300 text-sm mb-4">
            New to SweepGuard? Start here to recover your first wallet in under 5 minutes.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/docs/getting-started"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-black font-semibold text-sm hover:brightness-110 transition"
            >
              Getting Started →
            </Link>
            <Link
              href="/docs/how-recovery-works"
              className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm font-medium hover:bg-white/[0.1] transition"
            >
              How Recovery Works
            </Link>
          </div>
        </div>

        {/* Sections Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map(section => (
            <Link
              key={section.slug}
              href={`/docs/${section.slug}`}
              className="group bg-[#111118] border border-white/[0.06] rounded-xl p-5 hover:border-green-500/20 transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{section.icon}</span>
                <div>
                  <h3 className="font-semibold group-hover:text-green-400 transition-colors">{section.title}</h3>
                  <p className="text-sm text-zinc-400 mt-1">{section.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Additional Resources */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <a
            href="https://sweeptsguard.vercel.app/api-docs"
            target="_blank"
            rel="noopener"
            className="bg-[#111118] border border-white/[0.06] rounded-xl p-4 text-center hover:border-green-500/20 transition"
          >
            <span className="text-xl block mb-2">📡</span>
            <span className="text-sm font-medium">API Docs</span>
          </a>
          <Link
            href="/bot"
            className="bg-[#111118] border border-white/[0.06] rounded-xl p-4 text-center hover:border-green-500/20 transition"
          >
            <span className="text-xl block mb-2">🤖</span>
            <span className="text-sm font-medium">Telegram Bot</span>
          </Link>
          <Link
            href="/discord"
            className="bg-[#111118] border border-white/[0.06] rounded-xl p-4 text-center hover:border-green-500/20 transition"
          >
            <span className="text-xl block mb-2">💜</span>
            <span className="text-sm font-medium">Discord Bot</span>
          </Link>
        </div>
      </div>
    </main>
  )
}
