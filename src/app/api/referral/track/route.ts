import { NextRequest, NextResponse } from 'next/server'

const COMMISSION_RATE = 0.05
const PLATFORM_FEE_RATE = 0.20

interface ClaimBody {
  referralCode?: string
  claimAmount?: number
  claimerWallet?: string
  tokenType?: string
}

// In-memory store (resets on cold start — localStorage is primary on client)
const claimsStore: Array<{
  referralCode: string
  claimerWallet: string
  claimAmount: number
  platformFee: number
  referrerCommission: number
  timestamp: string
  status: string
  tokenType?: string
}> = []

/**
 * POST /api/referral/track
 * Record a claim with referral code
 */
export async function POST(request: NextRequest) {
  try {
    const body: ClaimBody = await request.json()
    const { referralCode, claimAmount, claimerWallet, tokenType } = body

    if (!referralCode || typeof referralCode !== 'string' || referralCode.length < 4) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 })
    }

    if (typeof claimAmount !== 'number' || claimAmount <= 0 || !Number.isFinite(claimAmount)) {
      return NextResponse.json({ error: 'Invalid claim amount' }, { status: 400 })
    }

    if (!claimerWallet || !/^0x[0-9a-fA-F]{40}$/.test(claimerWallet)) {
      return NextResponse.json({ error: 'Invalid claimer wallet address' }, { status: 400 })
    }

    const platformFee = claimAmount * PLATFORM_FEE_RATE
    const referrerCommission = platformFee * COMMISSION_RATE

    const record = {
      referralCode,
      claimerWallet: claimerWallet.toLowerCase(),
      claimAmount,
      platformFee,
      referrerCommission,
      timestamp: new Date().toISOString(),
      status: 'completed',
      tokenType,
    }

    claimsStore.push(record)

    return NextResponse.json({
      success: true,
      record: {
        ...record,
        breakdown: {
          claimAmount,
          platformFee,
          referrerCommission,
          netToClaimer: claimAmount - platformFee,
        },
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/referral/track?code=XXX or ?admin=true
 * Get claims for a referral code or all claims (admin view)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const isAdmin = searchParams.get('admin') === 'true'

    if (!isAdmin && (!code || typeof code !== 'string')) {
      return NextResponse.json({ error: 'Provide ?code=XXX or ?admin=true' }, { status: 400 })
    }

    if (isAdmin) {
      return NextResponse.json({
        claims: claimsStore,
        total: claimsStore.length,
      })
    }

    const filtered = claimsStore.filter(c => c.referralCode === code)
    return NextResponse.json({
      claims: filtered,
      total: filtered.length,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
