import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Recover Hacked Crypto Wallet — Fund Rescue Tool',
  description: 'Rescue funds from compromised crypto wallets. Use Flashbots private transactions and EIP-7702 delegation to safely recover your assets. 80% funds rescued, zero key exposure.',
  keywords: ['recover hacked wallet', 'crypto fund recovery', 'wallet rescue', 'flashbots recovery', 'save compromised wallet'],
  openGraph: {
    title: 'Recover Hacked Crypto Wallet — SweepGuard',
    description: 'Rescue funds from compromised wallets using Flashbots private transactions.',
    url: 'https://sweeptsguard.vercel.app/recover',
  },
  alternates: { canonical: 'https://sweeptsguard.vercel.app/recover' },
}

export default function RecoverLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
