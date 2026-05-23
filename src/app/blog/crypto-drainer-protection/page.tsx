import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Crypto Drainer Protection: How to Identify and Block Drainers',
  description: 'Complete guide to protecting your crypto wallet from drainer contracts. Learn how drainers work, how to identify them, and how to protect yourself with SweepGuard.',
  keywords: ['crypto drainer', 'drainer contract', 'wallet drainer', 'nft drainer', 'token drainer', 'anti-drainer', 'drainer protection', 'crypto phishing'],
  openGraph: { title: 'Crypto Drainer Protection Guide', description: 'How to identify and block crypto drainer contracts.', url: 'https://sweeptsguard.vercel.app/blog/crypto-drainer-protection', siteName: 'SweepGuard', type: 'article' },
  twitter: { card: 'summary_large_image', title: 'Crypto Drainer Protection Guide', description: 'How to identify and block crypto drainer contracts.' },
  alternates: { canonical: 'https://sweeptsguard.vercel.app/blog/crypto-drainer-protection' },
}

const jsonLd = { '@context': 'https://schema.org', '@type': 'Article', headline: 'Crypto Drainer Protection: How to Identify and Block Drainers', url: 'https://sweeptsguard.vercel.app/blog/crypto-drainer-protection', datePublished: '2025-05-15', author: { '@type': 'Organization', name: 'SweepGuard' } }

export default function ArticlePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="min-h-screen bg-[#030305] text-white">
        <article className="max-w-3xl mx-auto px-6 py-12">
          <Link href="/blog" className="text-sm text-white/40 hover:text-green-400 mb-8 inline-block">← Back to Blog</Link>
          <header className="mb-10">
            <span className="text-xs text-red-400 font-medium px-3 py-1 bg-red-500/10 rounded-full">Protection</span>
            <h1 className="text-3xl md:text-4xl font-black mt-4 mb-4">Crypto Drainer Protection: How to Identify and Block Drainers</h1>
            <div className="flex items-center gap-3 text-sm text-white/40"><span>May 15, 2025</span><span>•</span><span>7 min read</span></div>
          </header>
          <div className="space-y-6 text-white/70 leading-relaxed">
            <p className="text-lg">Crypto drainers are malicious smart contracts designed to steal your tokens and NFTs. They've become the #1 threat to crypto users, stealing over $500 million in 2024 alone. Here's everything you need to know to protect yourself.</p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">What is a Crypto Drainer?</h2>
            <p>A drainer is a smart contract that, once you sign a transaction, transfers all your valuable tokens, NFTs, and native currency to the attacker's wallet. They typically work through:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Phishing sites</strong> that mimic legitimate dApps</li>
              <li><strong>Fake airdrops</strong> that require wallet connection</li>
              <li><strong>Malicious token approvals</strong> hidden in seemingly innocent transactions</li>
              <li><strong>Social engineering</strong> through Discord, Twitter, and Telegram</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">How Drainers Work</h2>
            <p>The typical drainer flow is:</p>
            <ol className="list-decimal pl-6 space-y-3">
              <li>You visit a phishing site or connect to a malicious dApp</li>
              <li>The site asks you to sign a "harmless" transaction</li>
              <li>The transaction actually calls <code className="bg-white/10 px-1 rounded">setApprovalForAll</code> or <code className="bg-white/10 px-1 rounded">approve</code> with unlimited allowance</li>
              <li>The drainer contract immediately transfers all your tokens</li>
              <li>Funds are moved through mixers or bridges to avoid tracking</li>
            </ol>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">Red Flags to Watch For</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Sites asking for <code className="bg-white/10 px-1 rounded">setApprovalForAll</code> on NFTs</li>
              <li>Unlimited token approvals (max uint256)</li>
              <li>Transactions with encoded <code className="bg-white/10 px-1 rounded">transferFrom</code> calls</li>
              <li>Urgency tactics ("Limited time!", "Only 100 left!")</li>
              <li>Unfamiliar contract addresses</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">How SweepGuard Protects You</h2>
            <p>SweepGuard's browser extension provides real-time drainer protection:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Database of 10,000+ known drainer addresses</li>
              <li>Transaction simulation before signing</li>
              <li>Automatic blocking of dangerous approvals</li>
              <li>Phishing site detection and blocking</li>
              <li>Risk scoring for every transaction</li>
            </ul>

            <div className="mt-10 p-6 bg-gradient-to-br from-red-500/[0.06] to-orange-500/[0.06] border border-red-500/20 rounded-2xl">
              <h3 className="text-xl font-bold mb-3">🛡️ Protect Yourself from Drainers</h3>
              <p className="text-white/50 mb-4">Install SweepGuard Extension for real-time drainer protection.</p>
              <Link href="/extension" className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-semibold text-sm">Install Extension →</Link>
            </div>
          </div>
        </article>
      </main>
    </>
  )
}
