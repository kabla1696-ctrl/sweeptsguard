import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

// Shared in-memory stores (same as parent admin route)
const claimsStore: Array<{
  platformFee: number
  referrerCommission: number
}> = []

const referralsStore: Array<{
  referralCode: string
}> = []

const payoutsStore: Array<{
  amount: number
}> = []

/**
 * GET /api/admin/stats
 * Get overall admin statistics
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
    const isAdmin = auth.authorized

    const totalPlatformFees = claimsStore.reduce((sum, c) => sum + c.platformFee, 0)
    const totalReferrerCommissions = claimsStore.reduce((sum, c) => sum + c.referrerCommission, 0)
    const totalPaidOut = payoutsStore.reduce((sum, p) => sum + p.amount, 0)

    return NextResponse.json({
      totalClaims: claimsStore.length,
      totalPlatformFees,
      totalReferrerCommissions,
      netRevenue: totalPlatformFees - totalReferrerCommissions,
      totalReferrers: referralsStore.length,
      pendingPayouts: totalReferrerCommissions - totalPaidOut,
      isAdmin,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
