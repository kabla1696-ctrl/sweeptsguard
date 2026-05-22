import { NextRequest, NextResponse } from 'next/server'

// In-memory rate limiter for middleware
// NOTE: On Vercel, each edge function instance has its own memory,
// so this is a best-effort rate limiter. For production, use Vercel KV or Redis.
const requestCounts = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMIT = 60 // requests per window
const WINDOW_MS = 60_000 // 1 minute

// Cleanup expired entries periodically
let lastCleanup = Date.now()

function cleanupExpired(): void {
  const now = Date.now()
  if (now - lastCleanup < 30_000) return
  lastCleanup = now
  for (const [key, entry] of requestCounts) {
    if (now > entry.resetTime) {
      requestCounts.delete(key)
    }
  }
}

export function middleware(request: NextRequest) {
  // Only rate-limit API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  const now = Date.now()

  cleanupExpired()

  const entry = requestCounts.get(ip)

  if (!entry || now > entry.resetTime) {
    // New window
    requestCounts.set(ip, { count: 1, resetTime: now + WINDOW_MS })
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT))
    response.headers.set('X-RateLimit-Remaining', String(RATE_LIMIT - 1))
    response.headers.set('X-RateLimit-Reset', String(Math.ceil((now + WINDOW_MS) / 1000)))
    return response
  }

  if (entry.count >= RATE_LIMIT) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(RATE_LIMIT),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetTime / 1000)),
        },
      }
    )
  }

  entry.count++
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT))
  response.headers.set('X-RateLimit-Remaining', String(RATE_LIMIT - entry.count))
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(entry.resetTime / 1000)))
  return response
}

export const config = {
  matcher: '/api/:path*',
}
