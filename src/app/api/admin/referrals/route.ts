import { NextRequest, NextResponse } from 'next/server'

const ADMIN_WALLET = '0x59825337487449844982374897324987'

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
    const wallet = request.headers.get('x-wallet-address')

    if (!wallet || wallet.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      referrals: referralsStore,
      total: referralsStore.length,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
