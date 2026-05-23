import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

// In-memory stores (client localStorage is primary, these are server-side fallbacks)
const referralsStore: Array<{
  referralCode: string
  walletAddress: string
  registeredAt: string
}> = []

const claimsStore: Array<{
  referralCode: string
  claimerWallet: string
  claimAmount: number
  platformFee: number
  referrerCommission: number
  timestamp: string
  status: string
}> = []

const payoutsStore: Array<{
  referralCode: string
  amount: number
  txHash: string
  paidAt: string
}> = []

/**
 * GET /api/admin
 * Admin overview — requires admin wallet in header
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

    const totalPlatformFees = claimsStore.reduce((sum, c) => sum + c.platformFee, 0)
    const totalReferrerCommissions = claimsStore.reduce((sum, c) => sum + c.referrerCommission, 0)
    const totalPaidOut = payoutsStore.reduce((sum, p) => sum + p.amount, 0)

    return NextResponse.json({
      stats: {
        totalClaims: claimsStore.length,
        totalPlatformFees,
        totalReferrerCommissions,
        netRevenue: totalPlatformFees - totalReferrerCommissions,
        totalReferrers: referralsStore.length,
        pendingPayouts: totalReferrerCommissions - totalPaidOut,
      },
      referrals: referralsStore,
      claims: claimsStore,
      payouts: payoutsStore,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
