import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Multi-Chain Wallet Security: Best Practices for 33+ EVM Chains',
  description: 'Learn how to secure your crypto wallet across Ethereum, Base, Arbitrum, Polygon, Optimism, and 30+ other EVM chains. Unified security strategies for multi-chain users.',
  keywords: ['multi-chain security', 'evm wallet security', 'ethereum security', 'base security', 'arbitrum security', 'polygon security', 'cross-chain security', 'wallet best practices'],
  openGraph: { title: 'Multi-Chain Wallet Security Guide', description: 'Secure your wallet across 33+ EVM chains.', url: 'https://sweeptsguard.vercel.app/blog/multi-chain-wallet-security', siteName: 'SweepGuard', type: 'article' },
  twitter: { card: 'summary_large_image', title: 'Multi-Chain Wallet Security', description: 'Secure your wallet across 33+ EVM chains.' },
  alternates: { canonical: 'https://sweeptsguard.vercel.app/blog/multi-chain-wallet-security' },
}

const jsonLd = { '@context': 'https://schema.org', '@type': 'Article', headline: 'Multi-Chain Wallet Security', url: 'https://sweeptsguard.vercel.app/blog/multi-chain-wallet-security', datePublished: '2025-05-12', author: { '@type': 'Organization', name: 'SweepGuard' } }

export default function ArticlePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="min-h-screen bg-[#030305] text-white">
        <article className="max-w-3xl mx-auto px-6 py-12">
          <Link href="/blog" className="text-sm text-white/40 hover:text-green-400 mb-8 inline-block">← Back to Blog</Link>
          <header className="mb-10">
            <span className="text-xs text-blue-400 font-medium px-3 py-1 bg-blue-500/10 rounded-full">Guide</span>
            <h1 className="text-3xl md:text-4xl font-black mt-4 mb-4">Multi-Chain Wallet Security: Best Practices for 33+ EVM Chains</h1>
            <div className="flex items-center gap-3 text-sm text-white/40"><span>May 12, 2025</span><span>•</span><span>9 min read</span></div>
          </header>
          <div className="space-y-6 text-white/70 leading-relaxed">
            <p className="text-lg">The multi-chain era has arrived. With 33+ EVM chains available, users are spreading their assets across Ethereum, Base, Arbitrum, Polygon, Optimism, Avalanche, and dozens more. But each chain introduces new security considerations.</p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">The Multi-Chain Security Challenge</h2>
            <p>Each EVM chain has its own:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Bridge contracts:</strong> Cross-chain bridges are prime targets for hackers</li>
              <li><strong>RPC endpoints:</strong> Malicious RPCs can modify transactions</li>
              <li><strong>Token standards:</strong> Different chains have different token implementations</li>
              <li><strong>Gas mechanics:</strong> Gas prices and mechanisms vary by chain</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">Essential Multi-Chain Security Practices</h2>
            <ol className="list-decimal pl-6 space-y-3">
              <li><strong>Audit approvals per chain:</strong> Token approvals are chain-specific. An approval on Ethereum doesn't affect Arbitrum.</li>
              <li><strong>Verify bridge contracts:</strong> Always verify bridge contract addresses before bridging.</li>
              <li><strong>Use trusted RPCs:</strong> Stick to official RPC endpoints or trusted providers.</li>
              <li><strong>Monitor all chains:</strong> A drainer can attack on any chain. Monitor them all.</li>
              <li><strong>Separate wallets:</strong> Use different wallets for different risk levels.</li>
            </ol>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">How SweepGuard Protects You Across Chains</h2>
            <p>SweepGuard provides unified security across all 33+ supported chains:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Single dashboard to monitor all chains</li>
              <li>Cross-chain approval scanning</li>
              <li>Multi-chain drainer detection</li>
              <li>Unified auto-sweep across all chains</li>
              <li>Chain-specific risk scoring</li>
            </ul>

            <div className="mt-10 p-6 bg-gradient-to-br from-blue-500/[0.06] to-indigo-500/[0.06] border border-blue-500/20 rounded-2xl">
              <h3 className="text-xl font-bold mb-3">🌐 Scan All Your Chains</h3>
              <p className="text-white/50 mb-4">Check your wallet security across 33+ EVM chains at once.</p>
              <Link href="/scan" className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-semibold text-sm">Scan Now →</Link>
            </div>
          </div>
        </article>
      </main>
    </>
  )
}
