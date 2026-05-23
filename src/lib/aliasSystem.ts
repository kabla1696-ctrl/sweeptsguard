// Address Alias System — human-readable names for wallet addresses
// ENS integration placeholders included for future resolution

import { ethers } from 'ethers'
import { resolveENS, isENSName } from './ens'

// ── Types ────────────────────────────────────────────────────────────────────

export interface Alias {
  alias: string            // e.g. "abir.sweeptsguard"
  address: string          // 0x… checksummed
  owner: string            // registrant address
  createdAt: number        // unix ms
  expiresAt: number        // unix ms
  verified: boolean        // DNS / ENS proof
  avatar?: string          // optional avatar URL
  ensName?: string         // linked ENS name (placeholder)
  tags: string[]           // e.g. ["vip", "early-adopter"]
}

export interface AliasRegistration {
  alias: string
  address: string
  ensName?: string
}

export interface AliasLookupResult {
  found: boolean
  alias?: Alias
  resolvedAddress?: string
  source: 'alias' | 'ens' | 'none'
  riskScore: number        // 0-100, lower = safer
}

export interface AliasMarketplaceEntry {
  alias: string
  price: string            // in ETH
  seller: string
  listedAt: number
}

// ── In-memory store (production would use a database / on-chain registry) ───

const aliasRegistry = new Map<string, Alias>()
const reverseRegistry = new Map<string, string>() // address → alias

// Seed some demo aliases
const DEMO_ALIASES: Alias[] = [
  { alias: 'abir.sweeptsguard', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', owner: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', createdAt: Date.now() - 86400000 * 30, expiresAt: Date.now() + 86400000 * 335, verified: true, tags: ['founder', 'vip'] },
  { alias: 'vitalik.sweeptsguard', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', owner: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', createdAt: Date.now() - 86400000 * 10, expiresAt: Date.now() + 86400000 * 355, verified: true, ensName: 'vitalik.eth', tags: ['verified'] },
  { alias: 'satoshi.sweeptsguard', address: '0x0000000000000000000000000000000000000001', owner: '0x0000000000000000000000000000000000000001', createdAt: Date.now() - 86400000 * 60, expiresAt: Date.now() + 86400000 * 305, verified: false, tags: ['reserved'] },
]
for (const a of DEMO_ALIASES) {
  aliasRegistry.set(a.alias.toLowerCase(), a)
  reverseRegistry.set(a.address.toLowerCase(), a.alias)
}

// ── Marketplace listings ─────────────────────────────────────────────────────

const marketplace = new Map<string, AliasMarketplaceEntry>()

const DEMO_LISTINGS: AliasMarketplaceEntry[] = [
  { alias: 'whale.sweeptsguard', price: '2.5', seller: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', listedAt: Date.now() - 86400000 * 5 },
  { alias: 'defi.sweeptsguard', price: '1.8', seller: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', listedAt: Date.now() - 86400000 * 3 },
  { alias: 'nft.sweeptsguard', price: '0.9', seller: '0x1234567890abcdef1234567890abcdef12345678', listedAt: Date.now() - 86400000 },
]
for (const l of DEMO_LISTINGS) marketplace.set(l.alias.toLowerCase(), l)

// ── Helpers ──────────────────────────────────────────────────────────────────

const ALIAS_REGEX = /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/
const ALIAS_SUFFIX = '.sweeptsguard'
const MIN_ALIAS_LEN = 3
const MAX_ALIAS_LEN = 32
const REGISTRATION_FEE_ETH = '0.01'
const REGISTRATION_DURATION_MS = 365 * 24 * 60 * 60 * 1000 // 1 year

export function isValidAliasFormat(alias: string): boolean {
  const name = alias.toLowerCase().replace(ALIAS_SUFFIX, '')
  return name.length >= MIN_ALIAS_LEN && name.length <= MAX_ALIAS_LEN && ALIAS_REGEX.test(name)
}

export function normalizeAlias(alias: string): string {
  const lower = alias.toLowerCase().trim()
  return lower.endsWith(ALIAS_SUFFIX) ? lower : lower + ALIAS_SUFFIX
}

export function isAliasAvailable(alias: string): boolean {
  return !aliasRegistry.has(normalizeAlias(alias))
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Register a new alias. Returns the registered Alias or throws.
 */
export function registerAlias(reg: AliasRegistration): Alias {
  const full = normalizeAlias(reg.alias)
  if (!isValidAliasFormat(reg.alias)) throw new Error('Invalid alias format')
  if (!ethers.isAddress(reg.address)) throw new Error('Invalid Ethereum address')
  if (aliasRegistry.has(full)) throw new Error('Alias already taken')

  const now = Date.now()
  const alias: Alias = {
    alias: full,
    address: ethers.getAddress(reg.address),
    owner: ethers.getAddress(reg.address),
    createdAt: now,
    expiresAt: now + REGISTRATION_DURATION_MS,
    verified: false,
    ensName: reg.ensName,
    tags: [],
  }
  aliasRegistry.set(full, alias)
  reverseRegistry.set(alias.address.toLowerCase(), full)
  return alias
}

/**
 * Look up an alias → Alias | null
 */
export function lookupAlias(alias: string): Alias | null {
  return aliasRegistry.get(normalizeAlias(alias)) ?? null
}

/**
 * Reverse-lookup: address → alias string | null
 */
export function reverseLookupAlias(address: string): string | null {
  if (!ethers.isAddress(address)) return null
  return reverseRegistry.get(address.toLowerCase()) ?? null
}

/**
 * Resolve an input to an address.
 * Tries: exact alias → alias with suffix → ENS → raw address.
 */
export async function resolveAliasOrAddress(input: string): Promise<AliasLookupResult> {
  const trimmed = input.trim()

  // 1. Try alias registry
  const alias = lookupAlias(trimmed)
  if (alias) {
    return { found: true, alias, resolvedAddress: alias.address, source: 'alias', riskScore: alias.verified ? 5 : 15 }
  }

  // 2. Try ENS
  if (isENSName(trimmed)) {
    const ensAddr = await resolveENS(trimmed, 1)
    if (ensAddr) {
      return { found: true, resolvedAddress: ensAddr, source: 'ens', riskScore: 10 }
    }
  }

  // 3. Raw address
  if (ethers.isAddress(trimmed)) {
    return { found: true, resolvedAddress: ethers.getAddress(trimmed), source: 'none', riskScore: 20 }
  }

  return { found: false, source: 'none', riskScore: 100 }
}

/**
 * Generate a QR-code-friendly string for an alias (EIP-681 pay URI)
 */
export function generateAliasQR(alias: string, chainId = 1): string {
  const a = lookupAlias(alias)
  if (!a) throw new Error('Alias not found')
  return `ethereum:${a.address}@${chainId}`
}

/**
 * List marketplace entries
 */
export function listMarketplace(): AliasMarketplaceEntry[] {
  return Array.from(marketplace.values()).sort((a, b) => b.listedAt - a.listedAt)
}

/**
 * Search aliases by prefix
 */
export function searchAliases(query: string, limit = 20): Alias[] {
  const q = query.toLowerCase().trim()
  const results: Alias[] = []
  for (const alias of aliasRegistry.values()) {
    if (alias.alias.includes(q)) {
      results.push(alias)
      if (results.length >= limit) break
    }
  }
  return results
}

/**
 * Get registration fee
 */
export function getRegistrationFee(): string {
  return REGISTRATION_FEE_ETH
}

/**
 * Get all registered alias count
 */
export function getAliasCount(): number {
  return aliasRegistry.size
}

/**
 * Check if an alias is expired
 */
export function isAliasExpired(alias: string): boolean {
  const a = lookupAlias(alias)
  if (!a) return true
  return Date.now() > a.expiresAt
}
