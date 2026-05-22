import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { sanitizeErrorMessage } from '@/lib/validation'
import { captureError } from '@/lib/sentry'

// ── Types ───────────────────────────────────────────────────

interface WhiteLabelConfig {
  id: string
  email: string
  platformName: string
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  customDomain: string | null
  webhookUrl: string | null
  features: {
    walletScanning: boolean
    recoveryEngine: boolean
    insurance: boolean
    customBranding: boolean
    webhooks: boolean
    multiChain: boolean
  }
  tier: 'free' | 'pro' | 'enterprise'
  apiCallsUsed: number
  apiCallsLimit: number
  createdAt: string
  updatedAt: string
}

interface UsageRecord {
  date: string
  calls: number
  action: string
}

// ── In-memory store ─────────────────────────────────────────

const configs = new Map<string, WhiteLabelConfig>()
const usageLog: UsageRecord[] = []

// Seed with a demo config
configs.set('demo-config', {
  id: 'demo-config',
  email: 'demo@sweeptsguard.xyz',
  platformName: 'SweepGuard Demo',
  logoUrl: '',
  primaryColor: '#10b981',
  secondaryColor: '#6366f1',
  customDomain: null,
  webhookUrl: null,
  features: {
    walletScanning: true,
    recoveryEngine: true,
    insurance: false,
    customBranding: true,
    webhooks: false,
    multiChain: true,
  },
  tier: 'pro',
  apiCallsUsed: 42,
  apiCallsLimit: 10000,
  createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  updatedAt: new Date().toISOString(),
})

// ── Helpers ─────────────────────────────────────────────────

function generateId(): string {
  return `wl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function getTierLimits(tier: string): { calls: number; features: WhiteLabelConfig['features'] } {
  switch (tier) {
    case 'free':
      return {
        calls: 100,
        features: {
          walletScanning: true,
          recoveryEngine: false,
          insurance: false,
          customBranding: false,
          webhooks: false,
          multiChain: false,
        },
      }
    case 'pro':
      return {
        calls: 10000,
        features: {
          walletScanning: true,
          recoveryEngine: true,
          insurance: true,
          customBranding: true,
          webhooks: true,
          multiChain: true,
        },
      }
    case 'enterprise':
      return {
        calls: 100000,
        features: {
          walletScanning: true,
          recoveryEngine: true,
          insurance: true,
          customBranding: true,
          webhooks: true,
          multiChain: true,
        },
      }
    default:
      return getTierLimits('free')
  }
}

// ── Handlers ────────────────────────────────────────────────

/**
 * GET /api/white-label
 * List all configurations or get a specific one
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const configId = request.nextUrl.searchParams.get('id')
    const email = request.nextUrl.searchParams.get('email')

    if (configId) {
      const config = configs.get(configId)
      if (!config) {
        return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true, data: config })
    }

    if (email) {
      const userConfigs = Array.from(configs.values()).filter(c => c.email === email)
      return NextResponse.json({ success: true, data: userConfigs })
    }

    // Return all configs (admin-like)
    const allConfigs = Array.from(configs.values())
    const totalUsage = usageLog.reduce((sum, r) => sum + r.calls, 0)
    return NextResponse.json({
      success: true,
      data: {
        configs: allConfigs,
        stats: {
          totalConfigs: allConfigs.length,
          totalApiCalls: totalUsage,
          tierBreakdown: {
            free: allConfigs.filter(c => c.tier === 'free').length,
            pro: allConfigs.filter(c => c.tier === 'pro').length,
            enterprise: allConfigs.filter(c => c.tier === 'enterprise').length,
          },
        },
        recentUsage: usageLog.slice(-20),
      },
    })
  } catch (err: unknown) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: '/api/white-label GET' })
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}

/**
 * POST /api/white-label
 * Actions: register, update, trackUsage
 * Body: { action: string, ... }
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip, 20, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { action } = body as { action: string }

    switch (action) {
      case 'register': {
        const { email, platformName, tier = 'free' } = body as {
          email: string
          platformName: string
          tier?: string
        }

        if (!email || !email.includes('@')) {
          return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
        }
        if (!platformName || platformName.trim().length < 2) {
          return NextResponse.json({ error: 'Platform name must be at least 2 characters' }, { status: 400 })
        }

        const validTiers = ['free', 'pro', 'enterprise']
        const selectedTier = validTiers.includes(tier) ? tier : 'free'
        const tierLimits = getTierLimits(selectedTier)

        const id = generateId()
        const config: WhiteLabelConfig = {
          id,
          email: email.trim().toLowerCase(),
          platformName: platformName.trim(),
          logoUrl: '',
          primaryColor: '#10b981',
          secondaryColor: '#6366f1',
          customDomain: null,
          webhookUrl: null,
          features: tierLimits.features,
          tier: selectedTier as WhiteLabelConfig['tier'],
          apiCallsUsed: 0,
          apiCallsLimit: tierLimits.calls,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        configs.set(id, config)
        return NextResponse.json({ success: true, data: config, message: 'White-label configuration created' })
      }

      case 'update': {
        const { configId, ...updates } = body as {
          configId: string
          platformName?: string
          logoUrl?: string
          primaryColor?: string
          secondaryColor?: string
          customDomain?: string | null
          webhookUrl?: string | null
        }

        if (!configId) {
          return NextResponse.json({ error: 'configId is required' }, { status: 400 })
        }

        const config = configs.get(configId)
        if (!config) {
          return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
        }

        // Apply safe updates
        if (updates.platformName !== undefined) config.platformName = updates.platformName
        if (updates.logoUrl !== undefined) config.logoUrl = updates.logoUrl
        if (updates.primaryColor !== undefined) config.primaryColor = updates.primaryColor
        if (updates.secondaryColor !== undefined) config.secondaryColor = updates.secondaryColor
        if (updates.customDomain !== undefined) config.customDomain = updates.customDomain
        if (updates.webhookUrl !== undefined) config.webhookUrl = updates.webhookUrl
        config.updatedAt = new Date().toISOString()

        configs.set(configId, config)
        return NextResponse.json({ success: true, data: config, message: 'Configuration updated' })
      }

      case 'trackUsage': {
        const { configId, action: usageAction } = body as {
          configId: string
          action: string
        }

        if (!configId) {
          return NextResponse.json({ error: 'configId is required' }, { status: 400 })
        }

        const config = configs.get(configId)
        if (!config) {
          return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
        }

        if (config.apiCallsUsed >= config.apiCallsLimit) {
          return NextResponse.json({ error: 'API call limit exceeded for this tier' }, { status: 429 })
        }

        config.apiCallsUsed++
        config.updatedAt = new Date().toISOString()
        configs.set(configId, config)

        usageLog.push({
          date: new Date().toISOString(),
          calls: 1,
          action: usageAction || 'unknown',
        })
        if (usageLog.length > 1000) usageLog.splice(0, usageLog.length - 1000)

        return NextResponse.json({
          success: true,
          data: { remaining: config.apiCallsLimit - config.apiCallsUsed },
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: register, update, trackUsage` },
          { status: 400 }
        )
    }
  } catch (err: unknown) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: '/api/white-label POST' })
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}

/**
 * DELETE /api/white-label?id=xxx
 * Remove a white-label configuration
 */
export async function DELETE(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
    }
    const deleted = configs.delete(id)
    if (!deleted) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, message: 'Configuration removed' })
  } catch (err: unknown) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
