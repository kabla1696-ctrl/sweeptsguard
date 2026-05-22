// In-memory rate limiter (no Redis needed for Vercel)
// Uses sliding window with automatic cleanup of expired entries

interface RateLimitEntry {
  count: number
  resetTime: number
}

const requestCounts = new Map<string, RateLimitEntry>()

// Cleanup expired entries periodically to prevent memory leaks
let lastCleanup = Date.now()
const CLEANUP_INTERVAL_MS = 60_000 // Clean up every minute

function cleanup(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now

  for (const [key, entry] of requestCounts) {
    if (now > entry.resetTime) {
      requestCounts.delete(key)
    }
  }
}

export function rateLimit(
  ip: string,
  limit: number = 60,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = ip

  // Run cleanup periodically
  cleanup()

  const entry = requestCounts.get(key)

  // New entry or expired window
  if (!entry || now > entry.resetTime) {
    const resetTime = now + windowMs
    requestCounts.set(key, { count: 1, resetTime })
    return { allowed: true, remaining: limit - 1, resetTime }
  }

  // Within current window
  if (entry.count < limit) {
    entry.count++
    return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime }
  }

  // Rate limit exceeded
  return { allowed: false, remaining: 0, resetTime: entry.resetTime }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  )
}
