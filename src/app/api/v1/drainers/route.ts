import { NextRequest, NextResponse } from 'next/server'
import { isKnownDrainer, KNOWN_DRAINERS, KNOWN_DRAINER_DESTINATIONS } from '@/lib/draindb'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'
import { authenticateRequest, addRateLimitHeaders } from '@/lib/apiAuth'

/**
 * GET /api/v1/drainers?address=0x...
 * Check if an address is a known drainer
 */
export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request)
  if (authResult instanceof Response) return authResult
  const { rateLimit } = authResult

  const address = request.nextUrl.searchParams.get('address')

  if (!address || !isValidAddress(address)) {
    return NextResponse.json(
      { error: 'Invalid EVM address' },
      { status: 400 }
    )
  }

  try {
    const drainer = isKnownDrainer(address)

    const response = NextResponse.json({
      success: true,
      data: {
        address,
        isDrainer: !!drainer,
        details: drainer || null
      }
    })

    return addRateLimitHeaders(response, rateLimit)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(err) || 'Check failed' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/drainers
 * Report a new drainer address
 * Body: { address: string, evidence: string, type?: string }
 */
export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request, { requireAuth: true })
  if (authResult instanceof Response) return authResult
  const { rateLimit } = authResult

  try {
    const body = await request.json()
    const { address, evidence, type } = body

    if (!address || !isValidAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid EVM address' },
        { status: 400 }
      )
    }

    if (!evidence || typeof evidence !== 'string' || evidence.length < 10) {
      return NextResponse.json(
        { error: 'Evidence is required (min 10 characters)' },
        { status: 400 }
      )
    }

    // In production, this would save to Supabase
    // For now, return success with the report details
    const report = {
      id: `report_${Date.now()}`,
      address: address.toLowerCase(),
      evidence,
      type: type || 'other',
      status: 'pending_review',
      reportedAt: new Date().toISOString()
    }

    const response = NextResponse.json({
      success: true,
      data: report,
      message: 'Drainer report submitted. It will be reviewed and added to the database if verified.'
    })

    return addRateLimitHeaders(response, rateLimit)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(err) || 'Report failed' },
      { status: 500 }
    )
  }
}
