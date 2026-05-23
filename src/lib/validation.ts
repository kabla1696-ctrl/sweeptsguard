// Address validation utilities
import { CHAINS } from './chains'

const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/

export function isValidAddress(address: string): boolean {
  return ADDRESS_REGEX.test(address.trim())
}

export function isValidTxHash(hash: string): boolean {
  return TX_HASH_REGEX.test(hash.trim())
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

/**
 * Get the base explorer URL for a chain. Uses CHAINS config as single source of truth.
 */
export function getExplorerBaseUrl(chainId: number): string {
  return CHAINS[chainId]?.explorer || 'https://etherscan.io'
}

/**
 * Build a full explorer link for an address or transaction.
 */
export function getExplorerUrl(chainId: number, addressOrHash: string, type: 'address' | 'tx' = 'address'): string {
  return `${getExplorerBaseUrl(chainId)}/${type}/${addressOrHash}`
}
