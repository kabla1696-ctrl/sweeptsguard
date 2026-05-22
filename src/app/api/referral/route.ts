import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Lazy Supabase client — only initialized if env vars exist
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

const COMMISSION_RATE = 0.05

interface ReferralBody {
  referralCode?: string
  walletAddress?: string
}

/**
 * POST /api/referral
 * Register a referral (ref code + wallet address)
 * Body: { referralCode: string, walletAddress: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body: ReferralBody = await request.json()
    const { referralCode, walletAddress } = body

    if (!referralCode || typeof referralCode !== 'string' || referralCode.length < 4) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 })
    }

    if (!walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    const supabase = getSupabase()

    if (supabase) {
      // Store in Supabase
      const { error } = await supabase
        .from('referrals')
        .upsert(
          {
            referral_code: referralCode,
            wallet_address: walletAddress.toLowerCase(),
            registered_at: new Date().toISOString(),
          },
          { onConflict: 'referral_code,wallet_address' }
        )

      if (error) {
        console.error('[Referral] Supabase error:', error.message)
        // Fall through to return success anyway — localStorage is the primary store
      }
    }

    return NextResponse.json({
      success: true,
      referralCode,
      walletAddress: walletAddress.toLowerCase(),
      commissionRate: COMMISSION_RATE,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/referral?wallet=0x...
 * Get referral stats for a wallet address
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')

    if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    const supabase = getSupabase()

    if (supabase) {
      // Fetch referrals where this wallet is the referrer
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_wallet', wallet.toLowerCase())
        .order('registered_at', { ascending: false })

      if (error) {
        console.error('[Referral] Supabase query error:', error.message)
      }

      // Fetch commission history
      const { data: commissions, error: commError } = await supabase
        .from('referral_commissions')
        .select('*')
        .eq('referrer_wallet', wallet.toLowerCase())
        .order('created_at', { ascending: false })

      if (commError) {
        console.error('[Referral] Commission query error:', commError.message)
      }

      const totalEarned = (commissions || []).reduce(
        (sum: number, c: { amount?: number }) => sum + (c.amount || 0),
        0
      )

      return NextResponse.json({
        wallet: wallet.toLowerCase(),
        totalReferrals: referrals?.length || 0,
        totalEarned,
        referrals: (referrals || []).map((r: { referral_code?: string; wallet_address?: string; registered_at?: string }) => ({
          code: r.referral_code,
          walletAddress: r.wallet_address,
          referredAt: r.registered_at,
        })),
        commissions: (commissions || []).map((c: { referred_wallet?: string; platform_fee?: number; amount?: number; created_at?: string }) => ({
          referredWallet: c.referred_wallet,
          platformFee: c.platform_fee,
          commission: c.amount,
          date: c.created_at,
        })),
      })
    }

    // No Supabase — return empty stats (client uses localStorage)
    return NextResponse.json({
      wallet: wallet.toLowerCase(),
      totalReferrals: 0,
      totalEarned: 0,
      referrals: [],
      commissions: [],
      source: 'localStorage',
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
