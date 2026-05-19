// Known Drainer Database
// Community-maintained list of known drainer contracts and addresses
// Sources: ScamSniffer, SlowMist, community reports

export interface DrainerInfo {
  address: string
  name: string
  type: 'eip7702' | 'approval' | 'permit' | 'seaport' | 'multicall' | 'other'
  chains: number[]
  firstSeen: string
  lastActive: string
  totalDrained?: string // USD value
  reportCount: number
  verified: boolean
  notes?: string
}

// Known drainer database
export const KNOWN_DRAINERS: DrainerInfo[] = [
  {
    address: '0xCce0A2eBE17c5E532802896Fc8AfCaaB8aBD8ba0',
    name: 'Inferno Drainer (EIP-7702)',
    type: 'eip7702',
    chains: [1, 8453, 56, 42161, 137, 10],
    firstSeen: '2025-01-01',
    lastActive: '2026-05-19',
    reportCount: 150,
    verified: true,
    notes: 'EIP-7702 delegation drainer. Automated bot drains funds within seconds.'
  },
  {
    address: '0x0000000000000000000000000000000000000000',
    name: 'Null Address',
    type: 'other',
    chains: [1],
    firstSeen: '2015-01-01',
    lastActive: '2026-01-01',
    reportCount: 0,
    verified: true,
    notes: 'Null address - funds sent here are burned.'
  },
  // Add more drainers as discovered
]

// Exchange deposit addresses (known hot wallets)
export const EXCHANGE_WALLETS: Record<string, { name: string; type: 'deposit' | 'hot' | 'cold' }> = {
  // Binance
  '0x28c6c06298d514db089934071355e5743bf21d60': { name: 'Binance', type: 'hot' },
  '0x21a31ee1afc51d94c2efccaa2092ad1028285549': { name: 'Binance', type: 'hot' },
  '0x56eddb7aa87536c09ccc2793473599fd21a8b17f': { name: 'Binance', type: 'deposit' },
  '0xdfd5293d8e347dfe59e90efd55b2956a1343963d': { name: 'Binance', type: 'hot' },
  '0xf977814e90da44bfa03b6295a0616a897441acec': { name: 'Binance', type: 'hot' },
  '0x8894e0a0c962cb723c1ef8a1b2c6d40afc0e9c47': { name: 'Binance', type: 'hot' },

  // Coinbase
  '0x974caa59e49682cda0ad2bbe82983419a2ecc400': { name: 'Coinbase', type: 'hot' },
  '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43': { name: 'Coinbase', type: 'hot' },
  '0x503828976d22510aad0201ac7ec88293211d23da': { name: 'Coinbase', type: 'deposit' },
  '0x71660c4005ba85c37ccec55d0c4493e66fe775d3': { name: 'Coinbase', type: 'hot' },
  '0x3cd751e6b0078be393132286c442345e68ff0aab': { name: 'Coinbase', type: 'hot' },

  // Bybit
  '0x1151314c646ce4e0efd76d1af4760ae66a9fe30f': { name: 'Bybit', type: 'hot' },
  '0xf89d7b9c864f589bbf53a82105107622b35eaa40': { name: 'Bybit', type: 'hot' },
  '0+lsi1b780064b87d524114adb444777662527783426': { name: 'Bybit', type: 'deposit' },

  // OKX
  '0x236f7c1e5c4c191b7b999ab42b7e7cd4f6e0c7b4': { name: 'OKX', type: 'hot' },
  '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b': { name: 'OKX', type: 'hot' },

  // Kraken
  '0x2910543af39aba0cd09dbb2d50200b3e800a63d2': { name: 'Kraken', type: 'hot' },
  '0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13': { name: 'Kraken', type: 'deposit' },

  // KuCoin
  '0xd6216fc19db775df9774a6e33526131da7d19a2c': { name: 'KuCoin', type: 'hot' },
  '0xf16e9b0d03470827a95cdfd0cb8a8a3b46969b91': { name: 'KuCoin', type: 'hot' },

  // Gate.io
  '0x0d0707963952f2fba59dd06f2b425ace40b492fe': { name: 'Gate.io', type: 'hot' },
  '0x1c4b70a3968436b9a0a9cf5205c787eb81bb558c': { name: 'Gate.io', type: 'hot' },
}

// Check if address is a known drainer
export function isKnownDrainer(address: string): DrainerInfo | null {
  const normalized = address.toLowerCase()
  return KNOWN_DRAINERS.find(d => d.address.toLowerCase() === normalized) || null
}

// Check if address is an exchange wallet
export function isExchangeWallet(address: string): { name: string; type: string } | null {
  const normalized = address.toLowerCase()
  return EXCHANGE_WALLETS[normalized] || null
}

// Get drainer by partial name match
export function searchDrainers(query: string): DrainerInfo[] {
  const lower = query.toLowerCase()
  return KNOWN_DRAINERS.filter(d =>
    d.name.toLowerCase().includes(lower) ||
    d.address.toLowerCase().includes(lower)
  )
}

// Get all drainers for a specific chain
export function getDrainersForChain(chainId: number): DrainerInfo[] {
  return KNOWN_DRAINERS.filter(d => d.chains.includes(chainId))
}
