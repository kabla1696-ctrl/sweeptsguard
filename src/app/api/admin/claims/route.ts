import { NextRequest, NextResponse } from 'next/server'

const ADMIN_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A'

const claimsStore: Array<{
  referralCode: string
  claimerWallet: string
  claimAmount: number
  platformFee: number
  referrerCommission: number
  timestamp: string
  status: string
}> = []

/**
 * GET /api/admin/claims
 * Get all claim records
 */
export async function GET(request: NextRequest) {
  try {
    const wallet = request.headers.get('x-wallet-address')

    if (!wallet || wallet.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      claims: claimsStore,
      total: claimsStore.length,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
