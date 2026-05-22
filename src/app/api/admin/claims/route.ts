import { NextRequest, NextResponse } from 'next/server'

const ADMIN_WALLET = '0x59825337487449844982374897324987'

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
