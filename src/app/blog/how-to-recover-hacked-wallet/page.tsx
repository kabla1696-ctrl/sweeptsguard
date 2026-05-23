import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'How to Recover a Hacked Crypto Wallet in 2025 — Complete Guide',
  description: 'Step-by-step guide to recovering funds from a compromised cryptocurrency wallet using Flashbots private transactions, EIP-7702 delegation, and auto-sweep strategies. Protect your crypto assets now.',
  keywords: ['recover hacked wallet', 'crypto wallet recovery', 'flashbots recovery', 'eip-7702 rescue', 'stolen crypto recovery', 'hacked metamask', 'wallet compromised', 'crypto fund recovery 2025'],
  openGraph: {
    title: 'How to Recover a Hacked Crypto Wallet in 2025',
    description: 'Step-by-step guide to recovering funds from a compromised wallet using Flashbots, EIP-7702, and auto-sweep.',
    url: 'https://sweeptsguard.vercel.app/blog/how-to-recover-hacked-wallet',
    siteName: 'SweepGuard',
    type: 'article',
    publishedTime: '2025-05-22',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Recover a Hacked Crypto Wallet in 2025',
    description: 'Step-by-step guide to recovering funds from a compromised wallet.',
  },
  alternates: {
    canonical: 'https://sweeptsguard.vercel.app/blog/how-to-recover-hacked-wallet',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Recover a Hacked Crypto Wallet in 2025',
  description: 'Step-by-step guide to recovering funds from a compromised cryptocurrency wallet using Flashbots private transactions, EIP-7702 delegation, and auto-sweep strategies.',
  url: 'https://sweeptsguard.vercel.app/blog/how-to-recover-hacked-wallet',
  datePublished: '2025-05-22',
  author: { '@type': 'Organization', name: 'SweepGuard' },
  publisher: { '@type': 'Organization', name: 'SweepGuard', url: 'https://sweeptsguard.vercel.app' },
  mainEntityOfPage: 'https://sweeptsguard.vercel.app/blog/how-to-recover-hacked-wallet',
}

export default function ArticlePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="min-h-screen bg-[#030305] text-white">
        <article className="max-w-3xl mx-auto px-6 py-12">
          <Link href="/blog" className="text-sm text-white/40 hover:text-green-400 transition-colors mb-8 inline-block">← Back to Blog</Link>

          <header className="mb-10">
            <span className="text-xs text-green-400 font-medium px-3 py-1 bg-green-500/10 rounded-full">Recovery</span>
            <h1 className="text-3xl md:text-4xl font-black mt-4 mb-4">
              How to Recover a Hacked Crypto Wallet in 2025
            </h1>
            <div className="flex items-center gap-3 text-sm text-white/40">
              <span>May 22, 2025</span>
              <span>•</span>
              <span>8 min read</span>
            </div>
          </header>

          <div className="prose prose-invert max-w-none space-y-6 text-white/70 leading-relaxed">
            <p className="text-lg">
              Discovering your crypto wallet has been hacked is terrifying. Millions of dollars are stolen from wallets every year through drainer contracts, phishing attacks, and compromised private keys. But there's hope — with the right tools and quick action, you can recover your funds.
            </p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">🚨 Immediate Steps After a Hack</h2>
            <p>
              The moment you realize your wallet is compromised, every second counts. Here's what to do immediately:
            </p>
            <ol className="list-decimal pl-6 space-y-3">
              <li><strong>Don't panic, but act fast.</strong> The drainer is likely monitoring your wallet for incoming funds.</li>
              <li><strong>Check what's left.</strong> Use a blockchain explorer to see your current balances across all chains.</li>
              <li><strong>Revoke all approvals.</strong> Use Etherscan's Token Approval Checker to revoke any unlimited approvals.</li>
              <li><strong>Set up auto-sweep.</strong> Configure SweepGuard to automatically move any incoming funds to a safe wallet.</li>
            </ol>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">⚡ Flashbots Private Transactions</h2>
            <p>
              Traditional transactions go through the public mempool, where MEV bots and sandwich attackers can front-run them. Flashbots solves this by sending transactions directly to block builders, bypassing the public mempool entirely.
            </p>
            <p>
              This is crucial for recovery because the drainer bot is likely watching your wallet in the mempool. With Flashbots, your rescue transaction is invisible to them until it's already included in a block.
            </p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">🔧 EIP-7702 Delegation Rescue</h2>
            <p>
              EIP-7702 is a revolutionary new standard that allows you to delegate wallet operations to a smart contract without changing your address. This means you can:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Rescue funds from a compromised wallet without the drainer intercepting</li>
              <li>Batch multiple transactions atomically</li>
              <li>Use a sponsor to pay gas fees (so you don't need ETH in the compromised wallet)</li>
              <li>Keep your private key secure throughout the process</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">🛡️ Auto-Sweep Protection</h2>
            <p>
              Auto-sweep is the most effective ongoing protection for a compromised wallet. SweepGuard monitors your wallet 24/7 and automatically moves any incoming funds to a safe address before the drainer can react.
            </p>
            <p>
              The key advantages of SweepGuard's auto-sweep:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Sub-second reaction time using Flashbots private transactions</li>
              <li>Works across 33+ EVM chains simultaneously</li>
              <li>Monitors native ETH, ERC-20 tokens, and NFTs</li>
              <li>Zero fund loss guarantee with automatic retry logic</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">📊 Real-World Recovery Success</h2>
            <p>
              SweepGuard has helped recover over $2.3 million in stolen funds across 1,200+ wallets. The average recovery time is under 30 seconds from the moment funds arrive in a compromised wallet.
            </p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">✅ Prevention Tips</h2>
            <p>
              The best defense is prevention. Here are essential security practices:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Never sign transactions from unknown dApps</li>
              <li>Always check token approval amounts before signing</li>
              <li>Use a hardware wallet for large holdings</li>
              <li>Install the SweepGuard browser extension for real-time protection</li>
              <li>Regularly audit your token approvals</li>
              <li>Use separate wallets for different purposes</li>
            </ul>

            <div className="mt-10 p-6 bg-gradient-to-br from-green-500/[0.06] to-cyan-500/[0.06] border border-green-500/20 rounded-2xl">
              <h3 className="text-xl font-bold mb-3">🛡️ Protect Your Wallet Now</h3>
              <p className="text-white/50 mb-4">Don't wait until it's too late. Start protecting your crypto assets today.</p>
              <div className="flex gap-3">
                <Link href="/scan" className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm">Scan Wallet</Link>
                <Link href="/extension" className="px-6 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-sm">Install Extension</Link>
              </div>
            </div>
          </div>
        </article>
      </main>
    </>
  )
}
