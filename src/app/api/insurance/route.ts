import { NextRequest, NextResponse } from 'next/server'
import {
  calculatePremium,
  createPolicy,
  claimInsurance,
  getPolicyStatus,
  getPoliciesByWallet,
  getPoolStats,
} from '@/lib/insurance'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'

// GET: Get policy status, pool stats, or policies for a wallet
export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action')
    const policyId = request.nextUrl.searchParams.get('policyId')
    const wallet = request.nextUrl.searchParams.get('wallet')

    // Pool stats
    if (action === 'pool' || action === 'stats') {
      return NextResponse.json(getPoolStats())
    }

    // Get specific policy
    if (policyId) {
      const policy = getPolicyStatus(policyId)
      if (!policy) {
        return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
      }
      return NextResponse.json(policy)
    }

    // Get policies by wallet
    if (wallet) {
      if (!isValidAddress(wallet)) {
        return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
      }
      return NextResponse.json({
        wallet: wallet.toLowerCase(),
        policies: getPoliciesByWallet(wallet),
      })
    }

    // Default: return pool stats
    return NextResponse.json(getPoolStats())
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(err) || 'Insurance query failed' },
      { status: 500 }
    )
  }
}

// POST: Create policy or claim insurance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      action?: string
      walletAddress?: string
      chainId?: number
      recoveryAmount?: string
      policyId?: string
      reason?: string
    }

    const { action } = body

    // Create a new policy
    if (action === 'create') {
      const { walletAddress, chainId, recoveryAmount } = body

      if (!walletAddress || !isValidAddress(walletAddress)) {
        return NextResponse.json({ error: 'Valid wallet address required' }, { status: 400 })
      }
      if (!chainId || typeof chainId !== 'number') {
        return NextResponse.json({ error: 'Valid chainId required' }, { status: 400 })
      }
      if (!recoveryAmount || parseFloat(recoveryAmount) <= 0) {
        return NextResponse.json({ error: 'Valid recovery amount required' }, { status: 400 })
      }

      const premium = calculatePremium(recoveryAmount)
      const policy = createPolicy(walletAddress, chainId, recoveryAmount)

      return NextResponse.json({
        success: true,
        policy,
        premium,
        message: `Insurance policy created. Premium: ${premium} (1% of recovery amount). Valid for 7 days.`,
      }, { status: 201 })
    }

    // Claim insurance
    if (action === 'claim') {
      const { policyId, reason } = body

      if (!policyId) {
        return NextResponse.json({ error: 'Policy ID required' }, { status: 400 })
      }
      if (!reason || reason.trim().length < 10) {
        return NextResponse.json({ error: 'Detailed reason required (min 10 characters)' }, { status: 400 })
      }

      const result = claimInsurance(policyId, reason)
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        refund: result.refund,
        message: `Insurance claim approved. Refund: ${result.refund}`,
      })
    }

    // Calculate premium (no policy creation)
    if (action === 'calculate') {
      const { recoveryAmount } = body
      if (!recoveryAmount || parseFloat(recoveryAmount) <= 0) {
        return NextResponse.json({ error: 'Valid recovery amount required' }, { status: 400 })
      }
      return NextResponse.json({
        recoveryAmount,
        premium: calculatePremium(recoveryAmount),
        refundOnClaim: (parseFloat(calculatePremium(recoveryAmount)) * 0.8).toFixed(6),
        rate: '1%',
        refundRate: '80%',
        duration: '7 days',
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: create, claim, or calculate' },
      { status: 400 }
    )
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(err) || 'Insurance operation failed' },
      { status: 500 }
    )
  }
}
