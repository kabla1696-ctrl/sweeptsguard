// API Authentication & Rate Limiting
// Supports API key management with free and pro tiers

import { NextRequest } from 'next/server'

export interface ApiKeyInfo {
  key: string
  email: string
  tier: 'free' | 'pro'
  requestsPerDay: number
  requestsPerMonth: number
  createdAt: string
  lastUsed: string | null
  totalRequests: number
  active: boolean
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: string
  tier: 'free' | 'pro'
}

// In-memory store (replace with Supabase in production)
const apiKeys = new Map<string, ApiKeyInfo>()
const requestLog = new Map<string, { count: number; resetAt: number }>()
const dailyRequestLog = new Map<string, { count: number; resetAt: number }>()

// Tier limits
const TIER_LIMITS = {
  free: {
    requestsPerDay: 100,
    requestsPerMonth: 3000
  },
  pro: {
    requestsPerDay: 500,
    requestsPerMonth: 10000
  }
}

/**
 * Generate a new API key
 */
export function generateApiKey(email: string, tier: 'free' | 'pro' = 'free'): ApiKeyInfo {
  const key = `sg_${tier}_${generateRandomString(32)}`

  const info: ApiKeyInfo = {
    key,
    email,
    tier,
    requestsPerDay: TIER_LIMITS[tier].requestsPerDay,
    requestsPerMonth: TIER_LIMITS[tier].requestsPerMonth,
    createdAt: new Date().toISOString(),
    lastUsed: null,
    totalRequests: 0,
    active: true
  }

  apiKeys.set(key, info)
  return info
}

/**
 * Look up an API key
 */
export function getApiKeyInfo(key: string): ApiKeyInfo | null {
  return apiKeys.get(key) || null
}

/**
 * Validate API key from request
 */
export function extractApiKey(request: NextRequest): string | null {
  // Check Authorization header: Bearer <key>
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7).trim()
  }

  // Check X-API-Key header
  const apiKeyHeader = request.headers.get('x-api-key')
  if (apiKeyHeader) {
    return apiKeyHeader.trim()
  }

  // Check query parameter
  const apiKeyParam = request.nextUrl.searchParams.get('api_key')
  if (apiKeyParam) {
    return apiKeyParam.trim()
  }

  return null
}

/**
 * Check rate limit for an API key
 */
export function checkRateLimit(key: string): RateLimitResult {
  const info = apiKeys.get(key)

  // If no key info, allow with default free limits (for unauthenticated requests)
  const tier = info?.tier || 'free'
  const dailyLimit = TIER_LIMITS[tier].requestsPerDay

  // Check daily limit
  const now = Date.now()
  const dailyKey = `daily:${key}`
  let daily = dailyRequestLog.get(dailyKey)

  if (!daily || now > daily.resetAt) {
    daily = { count: 0, resetAt: now + 24 * 60 * 60 * 1000 }
    dailyRequestLog.set(dailyKey, daily)
  }

  if (daily.count >= dailyLimit) {
    return {
      allowed: false,
      remaining: 0,
      limit: dailyLimit,
      resetAt: new Date(daily.resetAt).toISOString(),
      tier
    }
  }

  // Increment counter
  daily.count++
  if (info) {
    info.lastUsed = new Date().toISOString()
    info.totalRequests++
  }

  return {
    allowed: true,
    remaining: dailyLimit - daily.count,
    limit: dailyLimit,
    resetAt: new Date(daily.resetAt).toISOString(),
    tier
  }
}

/**
 * Middleware-style auth check for API routes
 * Returns null if allowed, or a Response if rejected
 */
export async function authenticateRequest(
  request: NextRequest,
  options: { requireAuth?: boolean } = {}
): Promise<{ key: string | null; rateLimit: RateLimitResult } | Response> {
  const key = extractApiKey(request)
  const rateLimit = checkRateLimit(key || 'anonymous')

  if (options.requireAuth && !key) {
    return Response.json(
      {
        error: 'API key required',
        hint: 'Pass your key via Authorization: Bearer <key>, X-API-Key header, or api_key query param',
        docs: '/api-docs'
      },
      { status: 401 }
    )
  }

  if (key) {
    const info = apiKeys.get(key)
    if (info && !info.active) {
      return Response.json(
        { error: 'API key has been deactivated' },
        { status: 403 }
      )
    }
  }

  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: 'Rate limit exceeded',
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
        tier: rateLimit.tier,
        upgrade: rateLimit.tier === 'free' ? 'Upgrade to Pro for higher limits' : undefined
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt,
          'Retry-After': Math.ceil((new Date(rateLimit.resetAt).getTime() - Date.now()) / 1000).toString()
        }
      }
    )
  }

  return { key, rateLimit }
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: Response,
  rateLimit: RateLimitResult
): Response {
  const headers = new Headers(response.headers)
  headers.set('X-RateLimit-Limit', rateLimit.limit.toString())
  headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
  headers.set('X-RateLimit-Reset', rateLimit.resetAt)
  headers.set('X-RateLimit-Tier', rateLimit.tier)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Get all API keys for a given email (for key management)
 */
export function getKeysByEmail(email: string): ApiKeyInfo[] {
  const results: ApiKeyInfo[] = []
  apiKeys.forEach((info) => {
    if (info.email === email) results.push(info)
  })
  return results
}
