import { NextRequest, NextResponse } from 'next/server'

// Admin wallet address — hardcoded for security
const ADMIN_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A'

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
    const wallet = request.headers.get('x-wallet-address')

    if (!wallet || wallet.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
      return NextResponse.json({ error: 'Access denied. Admin wallet required.' }, { status: 403 })
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
