// Supported EVM chains configuration
export interface ChainConfig {
  id: number
  name: string
  shortName: string
  rpc: string
  wsRpc?: string
  explorer: string
  explorerApi: string
  nativeCurrency: string
  multicallAddress?: string
  icon: string
}

export const CHAINS: Record<number, ChainConfig> = {
  1: {
    id: 1,
    name: 'Ethereum',
    shortName: 'ETH',
    rpc: process.env.NEXT_PUBLIC_ETH_RPC || 'https://eth.llamarpc.com',
    wsRpc: process.env.NEXT_PUBLIC_ETH_WS_RPC,
    explorer: 'https://etherscan.io',
    explorerApi: 'https://api.etherscan.io/v2/api',
    nativeCurrency: 'ETH',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    icon: '⟠'
  },
  8453: {
    id: 8453,
    name: 'Base',
    shortName: 'BASE',
    rpc: process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
    explorerApi: 'https://api.basescan.org/v2/api',
    nativeCurrency: 'ETH',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    icon: '🔵'
  },
  56: {
    id: 56,
    name: 'BNB Chain',
    shortName: 'BSC',
    rpc: process.env.NEXT_PUBLIC_BSC_RPC || 'https://bsc-dataseed.binance.org',
    explorer: 'https://bscscan.com',
    explorerApi: 'https://api.bscscan.com/v2/api',
    nativeCurrency: 'BNB',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    icon: '🟡'
  },
  42161: {
    id: 42161,
    name: 'Arbitrum',
    shortName: 'ARB',
    rpc: process.env.NEXT_PUBLIC_ARB_RPC || 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    explorerApi: 'https://api.arbiscan.io/v2/api',
    nativeCurrency: 'ETH',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    icon: '🔷'
  },
  137: {
    id: 137,
    name: 'Polygon',
    shortName: 'MATIC',
    rpc: process.env.NEXT_PUBLIC_POLYGON_RPC || 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    explorerApi: 'https://api.polygonscan.com/v2/api',
    nativeCurrency: 'MATIC',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    icon: '🟣'
  },
  10: {
    id: 10,
    name: 'Optimism',
    shortName: 'OP',
    rpc: process.env.NEXT_PUBLIC_OP_RPC || 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    explorerApi: 'https://api-optimistic.etherscan.io/v2/api',
    nativeCurrency: 'ETH',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    icon: '🔴'
  }
}

export const DEFAULT_CHAINS = [1, 8453, 56, 42161, 137, 10]

export function getChain(id: number): ChainConfig | undefined {
  return CHAINS[id]
}

export function getAllChains(): ChainConfig[] {
  return Object.values(CHAINS)
}
