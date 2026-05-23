import { NextRequest, NextResponse } from 'next/server'
import { scanner } from '@/lib/scanner'
import { DEFAULT_CHAINS } from '@/lib/chains'
import { sanitizeErrorMessage, isValidAddress } from '@/lib/validation'
import { authenticateRequest, addRateLimitHeaders } from '@/lib/apiAuth'

/**
 * GET /api/v1/scan?address=0x...&chain=ethereum
 * Scan a wallet across all supported chains
 */
export async function GET(request: NextRequest) {
  // Authenticate and rate limit
  const authResult = await authenticateRequest(request)
  if (authResult instanceof Response) return authResult
  const { rateLimit } = authResult

  const address = request.nextUrl.searchParams.get('address')

  if (!address || !isValidAddress(address)) {
    return NextResponse.json(
      { error: 'Invalid EVM address', hint: 'Provide a valid 0x-prefixed 40 hex character address' },
      { status: 400 }
    )
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Scan timed out')), 50000)
    )

    const result = await Promise.race([
      scanner.scanWallet(address, DEFAULT_CHAINS),
      timeoutPromise
    ])

    const response = NextResponse.json({
      success: true,
      data: result,
      meta: {
        address,
        chainsScanned: DEFAULT_CHAINS.length,
        timestamp: new Date().toISOString()
      }
    })

    return addRateLimitHeaders(response, rateLimit)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(err) || 'Scan failed' },
      { status: 500 }
    )
  }
}
