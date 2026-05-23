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

// Paths to skip for analytics tracking
const SKIP_PREFIXES = ['/api/', '/_next/', '/favicon', '/__nextjs', '/.well-known']

function shouldTrack(pathname: string): boolean {
  // Skip API routes, Next.js internals, static files
  for (const prefix of SKIP_PREFIXES) {
    if (pathname.startsWith(prefix)) return false
  }
  // Skip file extensions (images, css, js, etc.)
  if (/\.\w+$/.test(pathname)) return false
  return true
}

function detectCountry(request: NextRequest): string {
  // Cloudflare
  const cfCountry = request.headers.get('cf-ipcountry')
  if (cfCountry && cfCountry !== 'XX') return cfCountry

  // Vercel
  const vercelCountry = request.headers.get('x-vercel-ip-country')
  if (vercelCountry) return vercelCountry

  return 'unknown'
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // ── Analytics tracking (lightweight, fire-and-forget) ──────────────────
  if (shouldTrack(pathname)) {
    const ip = getClientIp(request)
    const country = detectCountry(request)
    const userAgent = request.headers.get('user-agent') || ''

    // Pass tracking info via headers so API routes can access it
    // (Edge middleware can't call Node.js analytics lib directly in all runtimes)
    const response = NextResponse.next()
    response.headers.set('x-analytics-path', pathname)
    response.headers.set('x-analytics-ip', ip)
    response.headers.set('x-analytics-country', country)
    response.headers.set('x-analytics-ua', userAgent)

    // For non-API page requests, we also track via a lightweight mechanism:
    // The analytics lib will be called from the API routes that read these headers
    // We also track directly from middleware using a global store
    // Note: In edge runtime this uses a separate memory space from Node.js API routes,
    // so we write to a shared reference via globalThis
    const g = globalThis as unknown as {
      __sg_visits?: Array<{ path: string; ip: string; country: string; userAgent: string; timestamp: number }>
    }
    if (!g.__sg_visits) g.__sg_visits = []
    // Cap at 100k entries
    if (g.__sg_visits.length >= 100_000) {
      g.__sg_visits.splice(0, 10_000)
    }
    g.__sg_visits.push({
      path: pathname,
      ip,
      country,
      userAgent,
      timestamp: Date.now(),
    })

    // ── Rate limiting (API routes only) ────────────────────────────────────
    if (pathname.startsWith('/api/')) {
      const now = Date.now()
      cleanupExpired()

      const entry = requestCounts.get(ip)

      if (!entry || now > entry.resetTime) {
        requestCounts.set(ip, { count: 1, resetTime: now + WINDOW_MS })
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
      response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT))
      response.headers.set('X-RateLimit-Remaining', String(RATE_LIMIT - entry.count))
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(entry.resetTime / 1000)))
    }

    return response
  }

  // ── Rate limiting only (API routes that shouldn't be tracked) ──────────
  if (pathname.startsWith('/api/')) {
    const ip = getClientIp(request)
    const now = Date.now()

    cleanupExpired()

    const entry = requestCounts.get(ip)

    if (!entry || now > entry.resetTime) {
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

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
