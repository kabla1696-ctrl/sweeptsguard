import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Airdrop Claim Tool — Claim Airdrops from Hacked Wallets',
  description: 'Claim airdrop tokens from compromised wallets safely. Sponsor pays gas, 80% to your safe wallet. Supports EigenLayer, zkSync, LayerZero, Starknet, and more.',
  keywords: ['airdrop claim tool', 'hacked wallet airdrop', 'claim airdrop safely', 'airdrop recovery', 'sponsored airdrop claim'],
  openGraph: {
    title: 'Airdrop Claim Tool — SweepGuard',
    description: 'Claim airdrop tokens from compromised wallets safely.',
    url: 'https://sweeptsguard.vercel.app/airdrop',
  },
  alternates: { canonical: 'https://sweeptsguard.vercel.app/airdrop' },
}

export default function AirdropLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
