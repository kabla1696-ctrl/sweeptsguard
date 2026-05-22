import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

const referralsStore: Array<{
  referralCode: string
  walletAddress: string
  registeredAt: string
}> = []

/**
 * GET /api/admin/referrals
 * Get all registered referrers
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const ip = getClientIp(request)
    const rl = rateLimit(ip, 30, 60_000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const auth = requireAdmin(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      referrals: referralsStore,
      total: referralsStore.length,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
