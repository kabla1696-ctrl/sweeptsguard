// SweepGuard v5.0 — Constants
// Contract addresses, RPC URLs, ABIs

// SweepGuardRescuer contract (our EIP-7702 rescuer)
// Fee goes to OUR wallet (0x7A37...), not zun's
export const SWEEPGUARD_RESCUER = {
  8453: '0xDB671f97bfB72e324A758588456373EEC141400F', // Base ✅ deployed
  // More chains coming soon
}

export const PLATFORM_FEE_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A'
export const PLATFORM_FEE_PERCENT = 20

// RPC URLs for supported chains
export const RPC_URLS = {
  1: 'https://eth.llamarpc.com',
  8453: 'https://mainnet.base.org',
  42161: 'https://arb1.arbitrum.io/rpc',
  137: 'https://polygon-rpc.com',
  56: 'https://bsc-dataseed1.binance.org',
  10: 'https://mainnet.optimism.io',
  43114: 'https://api.avax.network/ext/bc/C/rpc',
  81457: 'https://rpc.blast.io',
  324: 'https://mainnet.era.zksync.io',
  59144: 'https://rpc.linea.build',
  5000: 'https://rpc.mantle.xyz',
  534352: 'https://rpc.scroll.io',
  80094: 'https://rpc.berachain.com',
  1329: 'https://evm-rpc.sei-apis.com',
  57073: 'https://rpc-gel.inkonchain.com',
  1868: 'https://rpc.soneium.org',
}

// Explorer URLs for TX links
export const EXPLORER_URLS = {
  1: 'https://etherscan.io',
  8453: 'https://basescan.org',
  42161: 'https://arbiscan.io',
  137: 'https://polygonscan.com',
  56: 'https://bscscan.com',
  10: 'https://optimistic.etherscan.io',
  43114: 'https://snowtrace.io',
  81457: 'https://blastscan.io',
  324: 'https://explorer.zksync.io',
  59144: 'https://lineascan.build',
  5000: 'https://mantlescan.xyz',
  534352: 'https://scrollscan.com',
  80094: 'https://berascan.com',
  1329: 'https://seitrace.com',
  57073: 'https://explorer.inkonchain.com',
  1868: 'https://soneium.blockscout.com',
}

// Chain names
export const CHAIN_NAMES = {
  1: 'Ethereum',
  8453: 'Base',
  42161: 'Arbitrum',
  137: 'Polygon',
  56: 'BSC',
  10: 'Optimism',
  43114: 'Avalanche',
  81457: 'Blast',
  324: 'zkSync',
  59144: 'Linea',
  5000: 'Mantle',
  534352: 'Scroll',
  80094: 'Berachain',
  1329: 'Sei',
  57073: 'Ink',
  1868: 'Soneium',
}

// Chains with private sequencers (drainer can't frontrun)
export const PRIVATE_SEQUENCER_CHAINS = new Set([
  8453, 42161, 10, 324, 59144, 534352, 5000, 81457,
  57073, 1868, 80094, 1329,
])

// ═══════════════════════════════════════════════════════
// SOLANA SUPPORT
// ═══════════════════════════════════════════════════════

export const SOLANA_CONFIG = {
  rpc: 'https://api.mainnet-beta.solana.com',
  explorer: 'https://solscan.io',
  nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
}

// Detect Phantom wallet
export function isPhantomAvailable() {
  return typeof window !== 'undefined' && window.solana && window.solana.isPhantom
}

// Solana key format helpers
export function isValidSolanaAddress(address) {
  // Base58, 32-44 chars
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
}

// SweepGuardRescuer ABI (key functions)
export const RESCUER_ABI = [
  'function executeRescue(address safeRecipient, address[] tokens, address claimTarget, bytes claimData, address fw) external payable',
  'function executeMoveERC20(address safeRecipient, address[] tokens, address fw) external',
  'function executeRescueNative(address payable safeRecipient, address payable fw) external',
  'function rescue(address safeRecipient, bytes32 domainHash, address claimTarget, bytes claimData, address fw, address[] tokens, uint256 nonce) external payable',
  'function accountNonces(address account, address sponsor) external view returns (uint256)',
  'function FEE_BPS() external view returns (uint256)',
  'function feeWallet() external view returns (address)',
  'function owner() external view returns (address)',
]

// Known claim function selectors
export const CLAIM_SELECTORS = [
  '0x4e71d92d', // claim()
  '0x27c8f835', // claim()
  '0x48c54b9d', // claim(address)
  '0xba087652', // claim(address,uint256,bytes32[])
  '0x379607f6', // claim(address,uint256,bytes32[],uint256)
  '0x6a06f395', // claimTo(address)
  '0x1249c58b', // mint()
  '0xa694fc3a', // mint(uint256)
]
