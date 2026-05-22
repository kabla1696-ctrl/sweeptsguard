import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Whale Tracker — Monitor Large Crypto Transactions',
  description: 'Track whale movements and large crypto transactions in real-time. Monitor ETH, USDC, USDT transfers across Ethereum, Base, Arbitrum, and more.',
  keywords: ['whale tracker', 'large crypto transactions', 'whale alert', 'crypto whale monitor'],
  alternates: { canonical: 'https://sweeptsguard.vercel.app/whale-tracker' },
}

export default function WhaleTrackerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
