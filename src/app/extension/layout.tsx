import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Browser Extension — Crypto Wallet Protector',
  description: 'Download SweepGuard browser extension for Chrome, Brave, and Edge. Block drainers, protect against phishing, scan airdrops, manage token approvals. Free Manifest V3 extension.',
  keywords: ['crypto wallet extension', 'drainer blocker', 'phishing protection crypto', 'airdrop scanner extension', 'chrome crypto extension'],
  openGraph: {
    title: 'SweepGuard Browser Extension — Download Free',
    description: 'Block drainers, protect against phishing, scan airdrops. Free for Chrome, Brave, Edge.',
    url: 'https://sweeptsguard.vercel.app/extension',
  },
  alternates: { canonical: 'https://sweeptsguard.vercel.app/extension' },
}

export default function ExtensionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
