// Faucet Aggregator - Get testnet/native tokens for gas
// Supports multiple chains and faucet sources

export interface FaucetInfo {
  chainId: number
  chainName: string
  token: string
  sources: FaucetSource[]
  amount: string
  cooldown: string // e.g. "24h", "12h"
}

export interface FaucetSource {
  name: string
  url: string
  type: 'api' | 'manual' | 'drip'
  available: boolean
  notes?: string
}

// Mainnet faucet alternatives (for gas on L2s)
export const MAINNET_FAUCETS: FaucetInfo[] = [
  {
    chainId: 8453,
    chainName: 'Base',
    token: 'ETH',
    sources: [
      { name: 'Base Bridge', url: 'https://bridge.base.org', type: 'manual', available: true, notes: 'Bridge ETH from Ethereum mainnet' },
      { name: 'Superbridge', url: 'https://superbridge.app', type: 'manual', available: true, notes: 'Bridge from any L2' },
    ],
    amount: 'Variable',
    cooldown: 'No limit'
  },
  {
    chainId: 42161,
    chainName: 'Arbitrum',
    token: 'ETH',
    sources: [
      { name: 'Arbitrum Bridge', url: 'https://bridge.arbitrum.io', type: 'manual', available: true, notes: 'Bridge ETH from Ethereum' },
      { name: 'Stargate', url: 'https://stargate.finance', type: 'manual', available: true, notes: 'Cross-chain bridge' },
    ],
    amount: 'Variable',
    cooldown: 'No limit'
  },
  {
    chainId: 137,
    chainName: 'Polygon',
    token: 'POL',
    sources: [
      { name: 'Polygon Bridge', url: 'https://portal.polygon.technology', type: 'manual', available: true, notes: 'Bridge MATIC/POL from Ethereum' },
      { name: 'Stargate', url: 'https://stargate.finance', type: 'manual', available: true },
    ],
    amount: 'Variable',
    cooldown: 'No limit'
  },
  {
    chainId: 10,
    chainName: 'Optimism',
    token: 'ETH',
    sources: [
      { name: 'OP Bridge', url: 'https://app.optimism.io/bridge', type: 'manual', available: true },
    ],
    amount: 'Variable',
    cooldown: 'No limit'
  },
  {
    chainId: 56,
    chainName: 'BNB Chain',
    token: 'BNB',
    sources: [
      { name: 'BNB Chain Bridge', url: 'https://www.bnbchain.org/en/bridge', type: 'manual', available: true },
    ],
    amount: 'Variable',
    cooldown: 'No limit'
  },
]

// Testnet faucets (for testing)
export const TESTNET_FAUCETS: FaucetInfo[] = [
  {
    chainId: 11155111,
    chainName: 'Sepolia',
    token: 'ETH',
    sources: [
      { name: 'Alchemy Faucet', url: 'https://sepoliafaucet.com', type: 'api', available: true },
      { name: 'Infura Faucet', url: 'https://www.infura.io/faucet/sepolia', type: 'manual', available: true },
      { name: 'QuickNode Faucet', url: 'https://faucet.quicknode.com/ethereum/sepolia', type: 'drip', available: true },
      { name: 'Google Cloud Faucet', url: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia', type: 'drip', available: true },
    ],
    amount: '0.5 ETH',
    cooldown: '24h'
  },
  {
    chainId: 84532,
    chainName: 'Base Sepolia',
    token: 'ETH',
    sources: [
      { name: 'Alchemy Faucet', url: 'https://www.alchemy.com/faucets/base-sepolia', type: 'api', available: true },
      { name: 'QuickNode Faucet', url: 'https://faucet.quicknode.com/base/sepolia', type: 'drip', available: true },
    ],
    amount: '0.5 ETH',
    cooldown: '24h'
  },
  {
    chainId: 421614,
    chainName: 'Arbitrum Sepolia',
    token: 'ETH',
    sources: [
      { name: 'Alchemy Faucet', url: 'https://www.alchemy.com/faucets/arbitrum-sepolia', type: 'api', available: true },
    ],
    amount: '0.5 ETH',
    cooldown: '24h'
  },
  {
    chainId: 80002,
    chainName: 'Polygon Amoy',
    token: 'POL',
    sources: [
      { name: 'Alchemy Faucet', url: 'https://www.alchemy.com/faucets/polygon-amoy', type: 'api', available: true },
      { name: 'Polygon Faucet', url: 'https://faucet.polygon.technology', type: 'manual', available: true },
    ],
    amount: '1 POL',
    cooldown: '24h'
  },
]

// Get faucet info for a chain
export function getFaucetsForChain(chainId: number, isTestnet: boolean = false): FaucetInfo | null {
  const faucets = isTestnet ? TESTNET_FAUCETS : MAINNET_FAUCETS
  return faucets.find(f => f.chainId === chainId) || null
}

// Get all available faucets
export function getAllFaucets(isTestnet: boolean = false): FaucetInfo[] {
  return isTestnet ? TESTNET_FAUCETS : MAINNET_FAUCETS
}

// Check if chain needs bridge (L2s)
export function needsBridge(chainId: number): boolean {
  return [8453, 42161, 137, 10].includes(chainId)
}

// Get bridge recommendation
export function getBridgeRecommendation(chainId: number): { from: string; to: string; bridge: string } | null {
  const bridges: Record<number, { from: string; to: string; bridge: string }> = {
    8453: { from: 'Ethereum', to: 'Base', bridge: 'https://bridge.base.org' },
    42161: { from: 'Ethereum', to: 'Arbitrum', bridge: 'https://bridge.arbitrum.io' },
    137: { from: 'Ethereum', to: 'Polygon', bridge: 'https://portal.polygon.technology' },
    10: { from: 'Ethereum', to: 'Optimism', bridge: 'https://app.optimism.io/bridge' },
  }
  return bridges[chainId] || null
}
