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
    rpc: process.env.NEXT_PUBLIC_ETH_RPC || 'https://eth.drpc.org',
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
  },
  43114: {
    id: 43114,
    name: 'Avalanche',
    shortName: 'AVAX',
    rpc: process.env.NEXT_PUBLIC_AVAX_RPC || 'https://api.avax.network/ext/bc/C/rpc',
    explorer: 'https://snowtrace.io',
    explorerApi: 'https://api.snowtrace.io/api',
    nativeCurrency: 'AVAX',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    icon: '🔺'
  },
  250: {
    id: 250,
    name: 'Fantom',
    shortName: 'FTM',
    rpc: process.env.NEXT_PUBLIC_FTM_RPC || 'https://rpc.ftm.tools',
    explorer: 'https://ftmscan.com',
    explorerApi: 'https://api.ftmscan.com/api',
    nativeCurrency: 'FTM',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    icon: '👻'
  },
  25: {
    id: 25,
    name: 'Cronos',
    shortName: 'CRO',
    rpc: process.env.NEXT_PUBLIC_CRO_RPC || 'https://evm.cronos.org',
    explorer: 'https://cronoscan.com',
    explorerApi: 'https://api.cronoscan.com/api',
    nativeCurrency: 'CRO',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    icon: '🔷'
  },
  81457: {
    id: 81457,
    name: 'Blast',
    shortName: 'BLAST',
    rpc: process.env.NEXT_PUBLIC_BLAST_RPC || 'https://rpc.blast.io',
    explorer: 'https://blastscan.io',
    explorerApi: 'https://api.blastscan.io/api',
    nativeCurrency: 'ETH',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    icon: '💥'
  },
  7777777: {
    id: 7777777,
    name: 'Zora',
    shortName: 'ZORA',
    rpc: process.env.NEXT_PUBLIC_ZORA_RPC || 'https://rpc.zora.energy',
    explorer: 'https://zorascan.xyz',
    explorerApi: 'https://api.zorascan.xyz/api',
    nativeCurrency: 'ETH',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    icon: '🟣'
  },
  1101: {
    id: 1101,
    name: 'Polygon zkEVM',
    shortName: 'PZKEVM',
    rpc: process.env.NEXT_PUBLIC_PZKEVM_RPC || 'https://zkevm-rpc.com',
    explorer: 'https://zkevm.polygonscan.com',
    explorerApi: 'https://api-zkevm.polygonscan.com/api',
    nativeCurrency: 'ETH',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    icon: '🟣'
  },
  169: {
    id: 169,
    name: 'Manta Pacific',
    shortName: 'MANTA',
    rpc: process.env.NEXT_PUBLIC_MANTA_RPC || 'https://pacific-rpc.manta.network/http',
    explorer: 'https://pacific-explorer.manta.network',
    explorerApi: 'https://pacific-explorer.manta.network/api',
    nativeCurrency: 'ETH',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    icon: '🌊'
  },
  324: {
    id: 324,
    name: 'zkSync Era',
    shortName: 'ZKSYNC',
    rpc: process.env.NEXT_PUBLIC_ZKSYNC_RPC || 'https://mainnet.era.zksync.io',
    explorer: 'https://explorer.zksync.io',
    explorerApi: 'https://block-explorer-api.mainnet.zksync.io/api',
    nativeCurrency: 'ETH',
    multicallAddress: '0xF9cda624FBC7e059355ce98a31693d299FACd963',
    icon: '🔷'
  },
  59144: {
    id: 59144,
    name: 'Linea',
    shortName: 'LINEA',
    rpc: process.env.NEXT_PUBLIC_LINEA_RPC || 'https://rpc.linea.build',
    explorer: 'https://lineascan.build',
    explorerApi: 'https://api.lineascan.build/api',
    nativeCurrency: 'ETH',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    icon: '🟢'
  }
}

export const DEFAULT_CHAINS = [1, 8453, 56, 42161, 137, 10, 43114, 250, 25, 81457, 7777777, 1101, 169, 324, 59144]

export function getChain(id: number): ChainConfig | undefined {
  return CHAINS[id]
}

export function getAllChains(): ChainConfig[] {
  return Object.values(CHAINS)
}
