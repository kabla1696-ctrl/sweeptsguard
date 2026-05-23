import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'SweepGuard Blog — Crypto Security Guides & Wallet Protection Tips',
  description: 'Learn how to protect your crypto wallet from hackers, drainers, and phishing attacks. Expert guides on Flashbots, EIP-7702, token approvals, multi-chain security, and fund recovery.',
  keywords: ['crypto security blog', 'wallet protection guide', 'recover hacked wallet', 'flashbots tutorial', 'eip-7702 guide', 'crypto drainer protection', 'token approval safety', 'multi-chain security'],
  openGraph: {
    title: 'SweepGuard Blog — Crypto Security Guides & Wallet Protection Tips',
    description: 'Expert guides on protecting your crypto wallet from hackers, drainers, and phishing attacks.',
    url: 'https://sweeptsguard.vercel.app/blog',
    siteName: 'SweepGuard',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SweepGuard Blog — Crypto Security Guides',
    description: 'Expert guides on protecting your crypto wallet from hackers and drainers.',
  },
  alternates: {
    canonical: 'https://sweeptsguard.vercel.app/blog',
  },
}

const articles = [
  {
    slug: 'how-to-recover-hacked-wallet',
    title: 'How to Recover a Hacked Crypto Wallet in 2025',
    description: 'Step-by-step guide to recovering funds from a compromised wallet using Flashbots, EIP-7702 delegation, and auto-sweep strategies.',
    category: 'Recovery',
    readTime: '8 min',
    date: '2025-05-22',
    featured: true,
  },
  {
    slug: 'flashbots-private-transactions',
    title: 'Flashbots Private Transactions: Complete Guide',
    description: 'Learn how to use Flashbots to send private transactions that bypass the public mempool, preventing MEV attacks and sandwich bots.',
    category: 'Security',
    readTime: '10 min',
    date: '2025-05-20',
    featured: true,
  },
  {
    slug: 'eip-7702-delegation-guide',
    title: 'EIP-7702 Delegation: Rescue Funds from Compromised Wallets',
    description: 'Complete guide to EIP-7702 wallet delegation — rescue trapped funds from compromised wallets without exposing private keys.',
    category: 'Technology',
    readTime: '12 min',
    date: '2025-05-18',
    featured: true,
  },
  {
    slug: 'crypto-drainer-protection',
    title: 'How to Protect Your Wallet from Crypto Drainers',
    description: 'Comprehensive guide to identifying and protecting against crypto drainer contracts, phishing sites, and malicious token approvals.',
    category: 'Protection',
    readTime: '7 min',
    date: '2025-05-15',
  },
  {
    slug: 'multi-chain-wallet-security',
    title: 'Multi-Chain Wallet Security: Best Practices for 33+ EVM Chains',
    description: 'Learn how to secure your wallet across Ethereum, Base, Arbitrum, Polygon, and 30+ other EVM chains with unified security strategies.',
    category: 'Guide',
    readTime: '9 min',
    date: '2025-05-12',
  },
  {
    slug: 'token-approval-safety',
    title: 'Token Approval Safety: How to Revoke Dangerous Approvals',
    description: 'Understanding ERC-20 token approvals, unlimited approvals risk, and how to safely revoke dangerous token permissions.',
    category: 'Tutorial',
    readTime: '6 min',
    date: '2025-05-10',
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'SweepGuard Blog',
  description: 'Crypto security guides and wallet protection tips',
  url: 'https://sweeptsguard.vercel.app/blog',
  publisher: {
    '@type': 'Organization',
    name: 'SweepGuard',
    url: 'https://sweeptsguard.vercel.app',
  },
  blogPost: articles.map(a => ({
    '@type': 'BlogPosting',
    headline: a.title,
    description: a.description,
    url: `https://sweeptsguard.vercel.app/blog/${a.slug}`,
    datePublished: a.date,
    author: { '@type': 'Organization', name: 'SweepGuard' },
  })),
}

export default function BlogPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="min-h-screen bg-[#030305] text-white">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-green-500/[0.04] rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-cyan-500/[0.03] rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
          <header className="mb-12">
            <h1 className="text-4xl md:text-5xl font-black mb-4">
              📚 SweepGuard <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">Blog</span>
            </h1>
            <p className="text-white/40 text-lg max-w-2xl">
              Expert guides on crypto wallet security, fund recovery, and protecting your assets from hackers and drainers.
            </p>
          </header>

          {/* Featured Articles */}
          <section className="mb-12">
            <h2 className="text-xl font-bold mb-6 text-white/60">Featured</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {articles.filter(a => a.featured).map(article => (
                <Link key={article.slug} href={`/blog/${article.slug}`}
                  className="group p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:border-green-500/20 hover:bg-green-500/[0.02] transition-all">
                  <span className="text-xs text-green-400 font-medium">{article.category}</span>
                  <h3 className="text-lg font-bold mt-2 mb-3 group-hover:text-green-400 transition-colors">{article.title}</h3>
                  <p className="text-white/40 text-sm mb-4 line-clamp-2">{article.description}</p>
                  <div className="flex items-center gap-3 text-xs text-white/30">
                    <span>{article.date}</span>
                    <span>•</span>
                    <span>{article.readTime} read</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* All Articles */}
          <section>
            <h2 className="text-xl font-bold mb-6 text-white/60">All Articles</h2>
            <div className="space-y-4">
              {articles.map(article => (
                <Link key={article.slug} href={`/blog/${article.slug}`}
                  className="group flex items-start gap-6 p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:border-green-500/20 hover:bg-green-500/[0.02] transition-all">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs text-green-400 font-medium px-2 py-0.5 bg-green-500/10 rounded-full">{article.category}</span>
                      <span className="text-xs text-white/30">{article.date}</span>
                      <span className="text-xs text-white/30">•</span>
                      <span className="text-xs text-white/30">{article.readTime} read</span>
                    </div>
                    <h3 className="text-lg font-bold mb-2 group-hover:text-green-400 transition-colors">{article.title}</h3>
                    <p className="text-white/40 text-sm">{article.description}</p>
                  </div>
                  <span className="text-white/20 group-hover:text-green-400 transition-colors text-2xl">→</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Newsletter */}
          <section className="mt-16 p-8 bg-gradient-to-br from-green-500/[0.06] to-cyan-500/[0.06] border border-green-500/20 rounded-2xl text-center">
            <h2 className="text-2xl font-bold mb-3">🛡️ Stay Protected</h2>
            <p className="text-white/40 mb-6">Get the latest crypto security tips delivered to your inbox.</p>
            <div className="flex gap-3 max-w-md mx-auto">
              <input type="email" placeholder="your@email.com"
                className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 text-sm" />
              <button className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm">
                Subscribe
              </button>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
