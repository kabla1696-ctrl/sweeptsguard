import { NextRequest, NextResponse } from 'next/server'
import { reputationChecker } from '@/lib/reputation'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'
import { authenticateRequest, addRateLimitHeaders } from '@/lib/apiAuth'

/**
 * GET /api/v1/reputation?address=0x...&chainId=1
 * Get address reputation score
 */
export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request)
  if (authResult instanceof Response) return authResult
  const { rateLimit } = authResult

  const address = request.nextUrl.searchParams.get('address')
  const chainIdParam = request.nextUrl.searchParams.get('chainId')
  const chainId = chainIdParam ? parseInt(chainIdParam, 10) : 1

  if (!address || !isValidAddress(address)) {
    return NextResponse.json(
      { error: 'Invalid EVM address' },
      { status: 400 }
    )
  }

  try {
    const result = await reputationChecker.check(address, chainId)

    const response = NextResponse.json({
      success: true,
      data: result,
      meta: { chainId, timestamp: new Date().toISOString() }
    })

    return addRateLimitHeaders(response, rateLimit)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(err) || 'Reputation check failed' },
      { status: 500 }
    )
  }
}
