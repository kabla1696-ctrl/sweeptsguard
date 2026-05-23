import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard — Crypto Wallet Security Monitor',
  description: 'Monitor your crypto wallet security in real-time. Track balances, approvals, delegations, and suspicious activity across 33+ EVM chains.',
  keywords: ['crypto dashboard', 'wallet monitor', 'blockchain security dashboard', 'crypto portfolio tracker'],
  openGraph: {
    title: 'SweepGuard Dashboard — Real-Time Wallet Monitor',
    description: 'Monitor your crypto wallet security in real-time across 33+ chains.',
    url: 'https://sweeptsguard.vercel.app/dashboard',
  },
  alternates: { canonical: 'https://sweeptsguard.vercel.app/dashboard' },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
