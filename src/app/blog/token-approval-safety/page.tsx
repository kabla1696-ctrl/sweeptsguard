import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Token Approval Safety: How to Revoke Dangerous Crypto Approvals',
  description: 'Understanding ERC-20 token approvals, the risks of unlimited approvals, and how to safely revoke dangerous token permissions. Protect your crypto from approval-based attacks.',
  keywords: ['token approval', 'revoke approval', 'erc20 approval', 'setapprovalforall', 'unlimited approval', 'token permission', 'crypto approval safety', 'etherscan approval checker'],
  openGraph: { title: 'Token Approval Safety Guide', description: 'How to revoke dangerous token approvals.', url: 'https://sweeptsguard.vercel.app/blog/token-approval-safety', siteName: 'SweepGuard', type: 'article' },
  twitter: { card: 'summary_large_image', title: 'Token Approval Safety', description: 'How to revoke dangerous token approvals.' },
  alternates: { canonical: 'https://sweeptsguard.vercel.app/blog/token-approval-safety' },
}

const jsonLd = { '@context': 'https://schema.org', '@type': 'Article', headline: 'Token Approval Safety', url: 'https://sweeptsguard.vercel.app/blog/token-approval-safety', datePublished: '2025-05-10', author: { '@type': 'Organization', name: 'SweepGuard' } }

export default function ArticlePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="min-h-screen bg-[#030305] text-white">
        <article className="max-w-3xl mx-auto px-6 py-12">
          <Link href="/blog" className="text-sm text-white/40 hover:text-green-400 mb-8 inline-block">← Back to Blog</Link>
          <header className="mb-10">
            <span className="text-xs text-yellow-400 font-medium px-3 py-1 bg-yellow-500/10 rounded-full">Tutorial</span>
            <h1 className="text-3xl md:text-4xl font-black mt-4 mb-4">Token Approval Safety: How to Revoke Dangerous Approvals</h1>
            <div className="flex items-center gap-3 text-sm text-white/40"><span>May 10, 2025</span><span>•</span><span>6 min read</span></div>
          </header>
          <div className="space-y-6 text-white/70 leading-relaxed">
            <p className="text-lg">Token approvals are one of the most common attack vectors in crypto. When you approve a token, you're giving a smart contract permission to spend your tokens. If that contract is malicious, it can drain your entire balance.</p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">How Token Approvals Work</h2>
            <p>ERC-20 tokens have two approval functions:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><code className="bg-white/10 px-1 rounded">approve(address spender, uint256 amount)</code> — Grants a specific amount to a spender</li>
              <li><code className="bg-white/10 px-1 rounded">increaseAllowance(address spender, uint256 addedValue)</code> — Increases existing allowance</li>
            </ul>
            <p>The dangerous pattern is approving <code className="bg-white/10 px-1 rounded">type(uint256).max</code> (unlimited approval). This gives the spender permission to transfer ALL your tokens at any time.</p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">Why Unlimited Approvals Are Dangerous</h2>
            <p>Many dApps request unlimited approvals for convenience. But this creates a permanent security risk:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>If the dApp contract is compromised, attackers can drain your tokens</li>
              <li>If you interact with a phishing site, the approval persists</li>
              <li>Approvals remain active even after you stop using a dApp</li>
              <li>No notification when approved tokens are spent</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">How to Check Your Approvals</h2>
            <p>Regular approval audits are essential:</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Use Etherscan's Token Approval Checker for each chain</li>
              <li>Use SweepGuard's approval scanner for multi-chain auditing</li>
              <li>Check both ERC-20 and ERC-721 (NFT) approvals</li>
              <li>Revoke any approvals you no longer need</li>
            </ol>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">Best Practices</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Only approve the exact amount you need</li>
              <li>Revoke approvals after using a dApp</li>
              <li>Never approve tokens on unfamiliar sites</li>
              <li>Use SweepGuard extension to get warnings before signing</li>
              <li>Audit approvals monthly across all chains</li>
            </ul>

            <div className="mt-10 p-6 bg-gradient-to-br from-yellow-500/[0.06] to-orange-500/[0.06] border border-yellow-500/20 rounded-2xl">
              <h3 className="text-xl font-bold mb-3">🔍 Check Your Approvals Now</h3>
              <p className="text-white/50 mb-4">Scan your wallet for dangerous token approvals.</p>
              <Link href="/approvals" className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl font-semibold text-sm">Scan Approvals →</Link>
            </div>
          </div>
        </article>
      </main>
    </>
  )
}
