import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gas Optimizer — Find Cheapest Gas Across 33+ Chains',
  description: 'Compare gas prices across Ethereum, Base, Arbitrum, Optimism, Polygon, and 30+ EVM chains. Find the cheapest chain for your transactions.',
  keywords: ['gas optimizer', 'cheapest gas crypto', 'gas tracker', 'EVM gas comparison', 'low gas fees'],
  alternates: { canonical: 'https://sweeptsguard.vercel.app/gas-optimizer' },
}

export default function GasOptimizerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
