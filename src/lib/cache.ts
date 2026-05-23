// In-memory cache with TTL support
// Safe for serverless: entries expire naturally, periodic cleanup prevents leaks

interface CacheEntry {
  data: unknown
  expiry: number
}

const cache = new Map<string, CacheEntry>()

// Cleanup expired entries periodically
let lastCleanup = Date.now()
const CLEANUP_INTERVAL_MS = 60_000

function cleanup(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now

  for (const [key, entry] of cache) {
    if (now > entry.expiry) {
      cache.delete(key)
    }
  }
}

export function getCached<T>(key: string): T | null {
  cleanup()

  const entry = cache.get(key)
  if (!entry) return null

  if (Date.now() > entry.expiry) {
    cache.delete(key)
    return null
  }

  return entry.data as T
}

export function setCache(key: string, data: unknown, ttlMs: number = 300_000): void {
  cleanup()

  cache.set(key, {
    data,
    expiry: Date.now() + ttlMs,
  })
}

export function clearCache(pattern?: string): void {
  if (!pattern) {
    cache.clear()
    return
  }

  const regex = new RegExp(pattern)
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key)
    }
  }
}

// Cache key helpers for common data patterns
export const CacheKeys = {
  gasPrice: (chainId: number) => `chain:${chainId}:gas`,
  walletBalance: (address: string) => `wallet:${address.toLowerCase()}:balance`,
  drainerLookup: (address: string) => `drainer:${address.toLowerCase()}`,
  chainTokens: (chainId: number) => `chain:${chainId}:tokens`,
  chainConfig: (chainId: number) => `chain:${chainId}:config`,
  scanResult: (address: string) => `scan:${address.toLowerCase()}`,
} as const

// Default TTL values (in milliseconds)
export const CacheTTL = {
  gasPrice: 30_000,        // 30 seconds
  walletBalance: 60_000,   // 1 minute
  drainerLookup: 3_600_000, // 1 hour
  chainTokens: 3_600_000,  // 1 hour
  chainConfig: 3_600_000,  // 1 hour
  scanResult: 120_000,     // 2 minutes
} as const
