import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Crypto Wallet Scanner — Free Security Check for 33+ EVM Chains',
  description: 'Scan your crypto wallet for drainers, EIP-7702 delegations, suspicious token approvals, and security vulnerabilities. Free instant scan for Ethereum, Base, Arbitrum, and 30+ chains.',
  keywords: [
    'crypto wallet scanner',
    'check if wallet is hacked',
    'drainer detection',
    'wallet security check',
    'EIP-7702 delegation check',
    'token approval scanner',
    'crypto wallet audit',
    'blockchain security scanner',
    'free wallet scan',
    'EVM wallet check',
  ],
  openGraph: {
    title: 'Crypto Wallet Scanner — Free Security Check',
    description: 'Scan your crypto wallet for drainers, delegations, and suspicious approvals across 33+ EVM chains.',
    url: 'https://sweeptsguard.vercel.app/scan',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Crypto Wallet Scanner — Check 33+ Chains',
    description: 'Detect drainers, EIP-7702 delegations, and suspicious approvals. Instant results.',
  },
  alternates: {
    canonical: 'https://sweeptsguard.vercel.app/scan',
  },
}

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
