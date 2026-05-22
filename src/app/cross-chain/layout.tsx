import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cross-Chain Scanner — Check Wallet Across All EVM Chains',
  description: 'Scan your wallet address across 33+ EVM chains simultaneously. Find balances, tokens, and activity on every chain.',
  keywords: ['cross-chain scanner', 'multi-chain wallet check', 'EVM chain scanner', 'wallet all chains'],
  alternates: { canonical: 'https://sweeptsguard.vercel.app/cross-chain' },
}

export default function CrossChainLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
