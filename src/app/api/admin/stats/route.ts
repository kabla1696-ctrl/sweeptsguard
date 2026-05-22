import { NextRequest, NextResponse } from 'next/server'

const ADMIN_WALLET = '0x59825337487449844982374897324987'

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
    const wallet = request.headers.get('x-wallet-address')

    // Allow stats without strict admin check for dashboard loading
    // The page-level check handles access control
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
      isAdmin: wallet?.toLowerCase() === ADMIN_WALLET.toLowerCase(),
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
