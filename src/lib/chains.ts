// Supported chains configuration
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

// Non-EVM chain config (Solana)
export interface SolanaChainConfig {
  id: string
  name: string
  rpc: string
  explorer: string
  nativeCurrency: { name: string; symbol: string; decimals: number }
  isEVM: false
}

export const SOLANA_CHAIN: SolanaChainConfig = {
  id: 'solana',
  name: 'Solana',
  rpc: process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
  explorer: 'https://solscan.io',
  nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
  isEVM: false,
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
  },
  // === NEW CHAINS (from real drain txs) ===
  5000: {
    id: 5000,
    name: 'Mantle',
    shortName: 'MNT',
    rpc: 'https://rpc.mantle.xyz',
    explorer: 'https://mantlescan.xyz',
    explorerApi: 'https://api.mantlescan.xyz/api',
    nativeCurrency: 'MNT',
    icon: '🟤'
  },
  34443: {
    id: 34443,
    name: 'Mode',
    shortName: 'MODE',
    rpc: 'https://mainnet.mode.network',
    explorer: 'https://explorer.mode.network',
    explorerApi: 'https://explorer.mode.network/api',
    nativeCurrency: 'ETH',
    icon: '🟠'
  },
  534352: {
    id: 534352,
    name: 'Scroll',
    shortName: 'SCR',
    rpc: 'https://rpc.scroll.io',
    explorer: 'https://scrollscan.com',
    explorerApi: 'https://api.scrollscan.com/api',
    nativeCurrency: 'ETH',
    icon: '📜'
  },
  100: {
    id: 100,
    name: 'Gnosis',
    shortName: 'GNO',
    rpc: 'https://rpc.gnosischain.com',
    explorer: 'https://gnosisscan.io',
    explorerApi: 'https://api.gnosisscan.io/api',
    nativeCurrency: 'xDai',
    icon: '🦉'
  },
  7000: {
    id: 7000,
    name: 'ZetaChain',
    shortName: 'ZETA',
    rpc: 'https://zeta-chain.drpc.org',
    explorer: 'https://zetascan.com',
    explorerApi: 'https://zetascan.com/api',
    nativeCurrency: 'ZETA',
    icon: '⚡'
  },
  1625: {
    id: 1625,
    name: 'Gravity',
    shortName: 'G',
    rpc: 'https://rpc.gravity.xyz',
    explorer: 'https://explorer.gravity.xyz',
    explorerApi: 'https://explorer.gravity.xyz/api',
    nativeCurrency: 'G',
    icon: '🌌'
  },
  1116: {
    id: 1116,
    name: 'Core',
    shortName: 'CORE',
    rpc: 'https://rpc.coredao.org',
    explorer: 'https://scan.coredao.org',
    explorerApi: 'https://scan.coredao.org/api',
    nativeCurrency: 'CORE',
    icon: '🔶'
  },
  1329: {
    id: 1329,
    name: 'Sei',
    shortName: 'SEI',
    rpc: 'https://evm-rpc.sei-apis.com',
    explorer: 'https://seiscan.io',
    explorerApi: 'https://seiscan.io/api',
    nativeCurrency: 'SEI',
    icon: '🌊'
  },
  80094: {
    id: 80094,
    name: 'Berachain',
    shortName: 'BERA',
    rpc: 'https://rpc.berachain.com',
    explorer: 'https://berascan.com',
    explorerApi: 'https://api.berascan.com/api',
    nativeCurrency: 'BERA',
    icon: '🐻'
  },
  57073: {
    id: 57073,
    name: 'Ink',
    shortName: 'INK',
    rpc: 'https://rpc-gel.inkonchain.com',
    explorer: 'https://explorer.inkonchain.com',
    explorerApi: 'https://explorer.inkonchain.com/api',
    nativeCurrency: 'ETH',
    icon: '🖋️'
  },
  196: {
    id: 196,
    name: 'XLayer',
    shortName: 'XLY',
    rpc: 'https://rpc.xlayer.tech',
    explorer: 'https://www.oklink.com/xlayer',
    explorerApi: 'https://www.oklink.com/xlayer/api',
    nativeCurrency: 'OKB',
    icon: '✖'
  },
  43111: {
    id: 43111,
    name: 'Hemi',
    shortName: 'HEMI',
    rpc: 'https://rpc.hemi.network',
    explorer: 'https://explorer.hemi.xyz',
    explorerApi: 'https://explorer.hemi.xyz/api',
    nativeCurrency: 'ETH',
    icon: '🔴'
  },
  8217: {
    id: 8217,
    name: 'Kaia',
    shortName: 'KAIA',
    rpc: 'https://public-en.node.kaia.io',
    explorer: 'https://kaiascan.io',
    explorerApi: 'https://kaiascan.io/api',
    nativeCurrency: 'KAIA',
    icon: '💜'
  },
  1868: {
    id: 1868,
    name: 'Soneium',
    shortName: 'SON',
    rpc: 'https://rpc.soneium.org',
    explorer: 'https://soneium.blockscout.com',
    explorerApi: 'https://soneium.blockscout.com/api',
    nativeCurrency: 'ETH',
    icon: '🟢'
  },
  2818: {
    id: 2818,
    name: 'Morph',
    shortName: 'MORPH',
    rpc: 'https://rpc.morphl2.io',
    explorer: 'https://explorer.morphl2.io',
    explorerApi: 'https://explorer.morphl2.io/api',
    nativeCurrency: 'ETH',
    icon: '🔵'
  },
  1923: {
    id: 1923,
    name: 'Swellchain',
    shortName: 'SWELL',
    rpc: 'https://swell-mainnet.alt.technology',
    explorer: 'https://swellchainscan.io',
    explorerApi: 'https://swellchainscan.io/api',
    nativeCurrency: 'ETH',
    icon: '🟡'
  },
  10143: {
    id: 10143,
    name: 'Monad Testnet',
    shortName: 'MON',
    rpc: 'https://testnet-rpc.monad.xyz',
    explorer: 'https://testnet.monadexplorer.com',
    explorerApi: 'https://testnet.monadexplorer.com/api',
    nativeCurrency: 'MON',
    icon: '🟣'
  },
  16600: {
    id: 16600,
    name: '0G',
    shortName: '0G',
    rpc: 'https://evm.0g.ai',
    explorer: 'https://chainscan.0g.ai',
    explorerApi: 'https://chainscan.0g.ai/api',
    nativeCurrency: '0G',
    icon: '⚡'
  }
}

export const DEFAULT_CHAINS = [1, 8453, 56, 42161, 137, 10, 43114, 250, 25, 81457, 7777777, 1101, 169, 324, 59144, 5000, 34443, 534352, 100, 7000, 1625, 1116, 1329, 80094, 57073, 196, 43111, 8217, 1868, 2818, 1923, 10143, 16600]

export function getChain(id: number): ChainConfig | undefined {
  return CHAINS[id]
}

export function getAllChains(): ChainConfig[] {
  return Object.values(CHAINS)
}

// Solana helpers
export function getSolanaChain(): SolanaChainConfig {
  return SOLANA_CHAIN
}

export function isEVMChain(chainId: string | number): boolean {
  return typeof chainId === 'number' || !isNaN(Number(chainId))
}

export function isSolanaChain(chainId: string): boolean {
  return chainId === 'solana'
}
