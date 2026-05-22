import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

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
    // Rate limit
    const ip = getClientIp(request)
    const rl = rateLimit(ip, 20, 60_000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const auth = requireAdmin(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Access denied' }, { status: 403 })
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
      payouts: payoutsStore,
      total: payoutsStore.length,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
