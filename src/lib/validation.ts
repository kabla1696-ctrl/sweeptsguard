// Address validation utilities
const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/

export function isValidAddress(address: string): boolean {
  return ADDRESS_REGEX.test(address.trim())
}

export function normalizeAddress(address: string): string {
  return address.trim()
}

/**
 * Sanitize error messages before sending to clients.
 * Strips RPC URLs, file paths, and limits length to prevent info leakage.
 */
export function sanitizeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'Internal error'
  // Strip URLs to prevent leaking RPC endpoints or internal services
  let sanitized = raw.replace(/https?:\/\/[^\s"')\]]+/g, '[endpoint]')
  // Strip file system paths
  sanitized = sanitized.replace(/\/[\w/.-]+\.(ts|js|tsx|jsx)/g, '[file]')
  // Limit length
  if (sanitized.length > 200) {
    sanitized = sanitized.slice(0, 200) + '...'
  }
  return sanitized
}

export function getExplorerUrl(chainId: number, address: string, type: 'address' | 'tx' = 'address'): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    8453: 'https://basescan.org',
    56: 'https://bscscan.com',
    42161: 'https://arbiscan.io',
    137: 'https://polygonscan.com',
    10: 'https://optimistic.etherscan.io',
    43114: 'https://snowtrace.io',
    250: 'https://ftmscan.com',
    25: 'https://cronoscan.com',
    81457: 'https://blastscan.io',
    7777777: 'https://zorascan.xyz',
    1101: 'https://zkevm.polygonscan.com',
    169: 'https://pacific-explorer.manta.network',
    324: 'https://explorer.zksync.io',
    59144: 'https://lineascan.build',
    5000: 'https://mantlescan.xyz',
    34443: 'https://explorer.mode.network',
    534352: 'https://scrollscan.com',
    100: 'https://gnosisscan.io',
    7000: 'https://zetascan.com',
    1625: 'https://explorer.gravity.xyz',
    1116: 'https://scan.coredao.org',
    1329: 'https://seiscan.io',
    80094: 'https://berascan.com',
    57073: 'https://explorer.inkonchain.com',
    196: 'https://www.oklink.com/xlayer',
    43111: 'https://explorer.hemi.xyz',
    8217: 'https://kaiascan.io',
    1868: 'https://soneium.blockscout.com',
    2818: 'https://explorer.morphl2.io',
    1923: 'https://swellchainscan.io',
    10143: 'https://testnet.monadexplorer.com',
    0: 'https://chainscan.0g.ai',
  }
  const base = explorers[chainId] || `https://etherscan.io`
  return `${base}/${type}/${address}`
}
