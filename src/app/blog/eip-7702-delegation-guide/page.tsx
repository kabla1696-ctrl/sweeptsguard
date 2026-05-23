import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'EIP-7702 Delegation Guide: Rescue Funds from Compromised Wallets',
  description: 'Complete guide to EIP-7702 wallet delegation. Rescue trapped funds from compromised crypto wallets without exposing private keys. Revolutionary Ethereum standard for wallet recovery.',
  keywords: ['eip-7702', 'wallet delegation', 'ethereum delegation', 'rescue compromised wallet', 'wallet recovery', 'eip 7702 guide', 'ethereum improvement proposal'],
  openGraph: { title: 'EIP-7702 Delegation Guide', description: 'Rescue funds from compromised wallets using EIP-7702 delegation.', url: 'https://sweeptsguard.vercel.app/blog/eip-7702-delegation-guide', siteName: 'SweepGuard', type: 'article' },
  twitter: { card: 'summary_large_image', title: 'EIP-7702 Delegation Guide', description: 'Rescue funds from compromised wallets using EIP-7702.' },
  alternates: { canonical: 'https://sweeptsguard.vercel.app/blog/eip-7702-delegation-guide' },
}

const jsonLd = { '@context': 'https://schema.org', '@type': 'Article', headline: 'EIP-7702 Delegation Guide', url: 'https://sweeptsguard.vercel.app/blog/eip-7702-delegation-guide', datePublished: '2025-05-18', author: { '@type': 'Organization', name: 'SweepGuard' } }

export default function ArticlePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="min-h-screen bg-[#030305] text-white">
        <article className="max-w-3xl mx-auto px-6 py-12">
          <Link href="/blog" className="text-sm text-white/40 hover:text-green-400 mb-8 inline-block">← Back to Blog</Link>
          <header className="mb-10">
            <span className="text-xs text-purple-400 font-medium px-3 py-1 bg-purple-500/10 rounded-full">Technology</span>
            <h1 className="text-3xl md:text-4xl font-black mt-4 mb-4">EIP-7702 Delegation: Rescue Funds from Compromised Wallets</h1>
            <div className="flex items-center gap-3 text-sm text-white/40"><span>May 18, 2025</span><span>•</span><span>12 min read</span></div>
          </header>
          <div className="space-y-6 text-white/70 leading-relaxed">
            <p className="text-lg">EIP-7702 is a groundbreaking Ethereum improvement proposal that introduces a new way to rescue funds from compromised wallets. Unlike traditional recovery methods, EIP-7702 allows wallet delegation without changing your address or exposing your private key.</p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">What is EIP-7702?</h2>
            <p>EIP-7702 introduces a new transaction type that allows an Externally Owned Account (EOA) to temporarily delegate its execution to a smart contract. This means your wallet can act like a smart contract wallet for specific operations, without permanently changing your account type.</p>
            <p>Key benefits include:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Atomic batch transactions:</strong> Execute multiple operations in a single transaction</li>
              <li><strong>Sponsored gas:</strong> Someone else can pay the gas fees for your transactions</li>
              <li><strong>Temporary delegation:</strong> No permanent changes to your wallet</li>
              <li><strong>Key security:</strong> Your private key never leaves your device</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">How EIP-7702 Rescue Works</h2>
            <p>When your wallet is compromised, the drainer is watching for any transaction from your address. Traditional rescue methods fail because:</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>You need ETH for gas in the compromised wallet (drainer steals it)</li>
              <li>Your transactions are visible in the mempool (drainer front-runs you)</li>
              <li>You can't batch operations (drainer reacts between transactions)</li>
            </ol>
            <p>EIP-7702 solves all three problems by allowing a sponsor to pay gas, using Flashbots for privacy, and batching all rescue operations atomically.</p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">SweepGuard's EIP-7702 Implementation</h2>
            <p>SweepGuard has built a complete EIP-7702 rescue system:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>One-click rescue:</strong> Connect your compromised wallet and SweepGuard handles everything</li>
              <li><strong>Gas sponsorship:</strong> SweepGuard pays the gas fees for rescue transactions</li>
              <li><strong>Atomic execution:</strong> All rescue operations happen in a single transaction</li>
              <li><strong>Flashbots integration:</strong> Rescue transactions are sent privately</li>
              <li><strong>Multi-chain support:</strong> Works on all 33+ supported EVM chains</li>
            </ul>

            <div className="mt-10 p-6 bg-gradient-to-br from-purple-500/[0.06] to-pink-500/[0.06] border border-purple-500/20 rounded-2xl">
              <h3 className="text-xl font-bold mb-3">🔧 Try EIP-7702 Rescue</h3>
              <p className="text-white/50 mb-4">Rescue your compromised wallet with EIP-7702 delegation.</p>
              <Link href="/recover" className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold text-sm">Start Recovery →</Link>
            </div>
          </div>
        </article>
      </main>
    </>
  )
}
