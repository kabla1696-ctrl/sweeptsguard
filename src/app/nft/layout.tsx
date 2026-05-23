import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NFT Scanner — Check Your NFTs for Security Risks',
  description: 'Scan your NFT collection for security risks, suspicious approvals, and potential scams. Free NFT security checker for Ethereum, Base, Polygon, and more.',
  keywords: ['NFT scanner', 'NFT security check', 'NFT scam detector', 'check NFT approvals'],
  alternates: { canonical: 'https://sweeptsguard.vercel.app/nft' },
}

export default function NFTLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
