import { NextRequest, NextResponse } from 'next/server'

const ADMIN_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A'

const payoutsStore: Array<{
  referralCode: string
  amount: number
  txHash: string
  paidAt: string
}> = []

/**
 * POST /api/admin/payout
 * Mark a referrer as paid
 * Body: { referralCode, amount, txHash }
 */
export async function POST(request: NextRequest) {
  try {
    const wallet = request.headers.get('x-wallet-address')

    if (!wallet || wallet.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { referralCode, amount, txHash } = body

    if (!referralCode || typeof referralCode !== 'string') {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 })
    }

    if (typeof amount !== 'number' || amount <= 0 || !Number.isFinite(amount)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    if (!txHash || typeof txHash !== 'string' || !txHash.startsWith('0x')) {
      return NextResponse.json({ error: 'Invalid transaction hash' }, { status: 400 })
    }

    const payout = {
      referralCode,
      amount,
      txHash,
      paidAt: new Date().toISOString(),
    }

    payoutsStore.push(payout)

    return NextResponse.json({
      success: true,
      payout,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/admin/payout
 * Get all payouts
 */
export async function GET(request: NextRequest) {
  try {
    const wallet = request.headers.get('x-wallet-address')

    if (!wallet || wallet.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      payouts: payoutsStore,
      total: payoutsStore.length,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
