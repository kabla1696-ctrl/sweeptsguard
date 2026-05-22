import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, addRateLimitHeaders } from '@/lib/apiAuth'
import { sanitizeErrorMessage } from '@/lib/validation'

// White-label API — allows other protocols to embed SweepGuard
// Requires API key (from apiAuth.ts)
// Customizable: fee percentage, platform wallet, branding

export interface WhiteLabelConfig {
  apiKey: string
  platformName: string
  platformWallet: string
  feePercent: number // 0-25%
  allowedChains: number[]
  webhookUrl?: string
  createdAt: string
  active: boolean
  plan: 'free' | 'pro' | 'enterprise'
  monthlyCalls: number
  maxMonthlyCalls: number
}

// In-memory store for white-label configs
const whiteLabelConfigs = new Map<string, WhiteLabelConfig>()

// Default chain set for white-label
const DEFAULT_ALLOWED_CHAINS = [1, 8453, 42161, 137, 10, 56, 43114]

// Plan limits
const PLAN_LIMITS = {
  free: { maxMonthlyCalls: 100, maxFeePercent: 5, maxChains: 3 },
  pro: { maxMonthlyCalls: 10000, maxFeePercent: 15, maxChains: 10 },
  enterprise: { maxMonthlyCalls: 100000, maxFeePercent: 25, maxChains: 999 },
}

/**
 * Register or update a white-label configuration
 */
function registerWhiteLabel(
  apiKey: string,
  config: Partial<WhiteLabelConfig>
): WhiteLabelConfig {
  const plan = config.plan || 'free'
  const limits = PLAN_LIMITS[plan]

  const wlConfig: WhiteLabelConfig = {
    apiKey,
    platformName: config.platformName || 'SweepGuard Partner',
    platformWallet: config.platformWallet || '',
    feePercent: Math.min(config.feePercent || 0, limits.maxFeePercent),
    allowedChains: (config.allowedChains || DEFAULT_ALLOWED_CHAINS).slice(0, limits.maxChains),
    webhookUrl: config.webhookUrl,
    createdAt: new Date().toISOString(),
    active: true,
    plan,
    monthlyCalls: 0,
    maxMonthlyCalls: limits.maxMonthlyCalls,
  }

  whiteLabelConfigs.set(apiKey, wlConfig)
  return wlConfig
}

/**
 * Get white-label config for an API key
 */
function getWhiteLabelConfig(apiKey: string): WhiteLabelConfig | null {
  return whiteLabelConfigs.get(apiKey) || null
}

// GET: Get white-label config or API documentation
export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action')

    // Public documentation endpoint
    if (action === 'docs' || action === 'pricing') {
      return NextResponse.json({
        name: 'SweepGuard White-Label API',
        version: '1.0.0',
        description: 'Embed SweepGuard recovery, scanning, and insurance features into your protocol.',
        pricing: {
          free: {
            price: '$0/month',
            apiCalls: '100/month',
            features: ['Basic recovery scan', 'Drainer detection', 'Up to 3 chains'],
          },
          pro: {
            price: '$99/month',
            apiCalls: '10,000/month',
            features: ['Full recovery engine', 'Insurance integration', 'Up to 10 chains', 'Webhooks', 'Custom branding'],
          },
          enterprise: {
            price: 'Custom',
            apiCalls: '100,000+/month',
            features: ['All Pro features', 'Unlimited chains', 'Priority support', 'Custom integrations', 'Dedicated infrastructure'],
          },
        },
        endpoints: {
          scan: 'POST /api/v1/white-label — action: scan',
          recover: 'POST /api/v1/white-label — action: recover',
          insurance: 'POST /api/v1/white-label — action: insurance',
        },
        authentication: 'Bearer <api_key> or X-API-Key header',
        documentation: 'https://docs.sweeptsguard.xyz/white-label',
      })
    }

    // Authenticated: get config
    const authResult = await authenticateRequest(request, { requireAuth: true })
    if (authResult instanceof Response) return authResult

    const apiKey = authResult.key
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 })
    }

    const config = getWhiteLabelConfig(apiKey)
    if (!config) {
      return NextResponse.json({
        error: 'No white-label configuration found',
        hint: 'POST with action: register to create one',
      }, { status: 404 })
    }

    const response = NextResponse.json({ config })
    return addRateLimitHeaders(response, authResult.rateLimit)
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(err) || 'White-label query failed' },
      { status: 500 }
    )
  }
}

// POST: Register/update config, or execute white-label operations
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, { requireAuth: true })
    if (authResult instanceof Response) return authResult

    const apiKey = authResult.key!
    const body = await request.json() as {
      action?: string
      platformName?: string
      platformWallet?: string
      feePercent?: number
      allowedChains?: number[]
      webhookUrl?: string
      plan?: 'free' | 'pro' | 'enterprise'
      // Scan/recover params
      walletAddress?: string
      chainId?: number
      recoveryAmount?: string
    }

    const { action } = body

    // Register white-label config
    if (action === 'register' || action === 'update') {
      if (!body.platformName) {
        return NextResponse.json({ error: 'platformName required' }, { status: 400 })
      }

      const config = registerWhiteLabel(apiKey, body)

      const response = NextResponse.json({
        success: true,
        config,
        message: `White-label ${action === 'register' ? 'registered' : 'updated'} for ${config.platformName}`,
      })

      return addRateLimitHeaders(response, authResult.rateLimit)
    }

    // White-label scan (delegated)
    if (action === 'scan') {
      const config = getWhiteLabelConfig(apiKey)
      if (!config || !config.active) {
        return NextResponse.json({ error: 'White-label not registered or inactive' }, { status: 403 })
      }

      if (!body.walletAddress) {
        return NextResponse.json({ error: 'walletAddress required' }, { status: 400 })
      }

      // Track usage
      config.monthlyCalls++

      // Return scan instruction (actual scan is done client-side or via main scan endpoint)
      const response = NextResponse.json({
        platform: config.platformName,
        walletAddress: body.walletAddress,
        allowedChains: config.allowedChains,
        feePercent: config.feePercent,
        scanUrl: `/api/v1/scan?address=${body.walletAddress}`,
        message: 'Redirect to scan endpoint with your API key for full results.',
      })

      return addRateLimitHeaders(response, authResult.rateLimit)
    }

    // White-label insurance quote
    if (action === 'insurance') {
      const config = getWhiteLabelConfig(apiKey)
      if (!config || !config.active) {
        return NextResponse.json({ error: 'White-label not registered or inactive' }, { status: 403 })
      }

      if (!body.recoveryAmount) {
        return NextResponse.json({ error: 'recoveryAmount required' }, { status: 400 })
      }

      const amount = parseFloat(body.recoveryAmount)
      const platformFee = amount * (config.feePercent / 100)
      const insurancePremium = amount * 0.01 // 1%

      const response = NextResponse.json({
        platform: config.platformName,
        recoveryAmount: body.recoveryAmount,
        platformFee: platformFee.toFixed(6),
        insurancePremium: insurancePremium.toFixed(6),
        total: (amount + platformFee + insurancePremium).toFixed(6),
        webhookUrl: config.webhookUrl,
      })

      return addRateLimitHeaders(response, authResult.rateLimit)
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: register, update, scan, or insurance' },
      { status: 400 }
    )
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(err) || 'White-label operation failed' },
      { status: 500 }
    )
  }
}
