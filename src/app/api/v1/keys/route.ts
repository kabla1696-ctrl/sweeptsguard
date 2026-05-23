import { NextRequest, NextResponse } from 'next/server'
import { generateApiKey, getApiKeyInfo, getKeysByEmail } from '@/lib/apiAuth'

/**
 * POST /api/v1/keys
 * Generate a new API key
 * Body: { email: string, tier?: 'free' | 'pro' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, tier } = body

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      )
    }

    const validTiers = ['free', 'pro']
    const selectedTier = validTiers.includes(tier) ? tier : 'free'

    // Check if email already has keys
    const existingKeys = getKeysByEmail(email)
    if (existingKeys.length >= 3) {
      return NextResponse.json(
        { error: 'Maximum 3 API keys per email address' },
        { status: 429 }
      )
    }

    const keyInfo = generateApiKey(email, selectedTier as 'free' | 'pro')

    return NextResponse.json({
      success: true,
      data: {
        key: keyInfo.key,
        email: keyInfo.email,
        tier: keyInfo.tier,
        limits: {
          requestsPerDay: keyInfo.requestsPerDay,
          requestsPerMonth: keyInfo.requestsPerMonth
        },
        createdAt: keyInfo.createdAt
      },
      warning: 'Store this key securely. It will not be shown again.'
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: 'Failed to generate API key' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/keys?key=xxx
 * Check API key status
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')

  if (!key) {
    return NextResponse.json(
      { error: 'API key is required' },
      { status: 400 }
    )
  }

  const info = getApiKeyInfo(key)

  if (!info) {
    return NextResponse.json(
      { error: 'API key not found' },
      { status: 404 }
    )
  }

  // Don't expose the full key in response
  return NextResponse.json({
    success: true,
    data: {
      keyPrefix: info.key.slice(0, 12) + '...',
      email: info.email,
      tier: info.tier,
      limits: {
        requestsPerDay: info.requestsPerDay,
        requestsPerMonth: info.requestsPerMonth
      },
      usage: {
        totalRequests: info.totalRequests,
        lastUsed: info.lastUsed
      },
      active: info.active,
      createdAt: info.createdAt
    }
  })
}
