import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Portfolio — Multi-Chain Crypto Portfolio Tracker',
  description: 'Track your crypto portfolio across 33+ EVM chains. View balances, tokens, NFTs, and DeFi positions in one dashboard.',
  keywords: ['crypto portfolio tracker', 'multi-chain portfolio', 'DeFi portfolio', 'EVM portfolio'],
  alternates: { canonical: 'https://sweeptsguard.vercel.app/portfolio' },
}

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
