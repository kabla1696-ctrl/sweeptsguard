import { NextRequest, NextResponse } from 'next/server'
import { gasTracker } from '@/lib/gasTracker'
import { sanitizeErrorMessage } from '@/lib/validation'
import { authenticateRequest, addRateLimitHeaders } from '@/lib/apiAuth'

/**
 * GET /api/v1/gas?chain=ethereum&chainId=1
 * Get current gas prices for one or all chains
 */
export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request)
  if (authResult instanceof Response) return authResult
  const { rateLimit } = authResult

  const chainParam = request.nextUrl.searchParams.get('chain')
  const chainIdParam = request.nextUrl.searchParams.get('chainId')

  try {
    // Single chain
    if (chainIdParam || chainParam) {
      const chainId = chainIdParam ? parseInt(chainIdParam, 10) : undefined

      if (chainIdParam && isNaN(chainId!)) {
        return NextResponse.json(
          { error: 'chainId must be a valid number' },
          { status: 400 }
        )
      }

      const gasPrice = await gasTracker.getGasPrice(chainId || 1)
      if (!gasPrice) {
        return NextResponse.json(
          { error: 'Chain not supported' },
          { status: 400 }
        )
      }

      const response = NextResponse.json({
        success: true,
        data: {
          chainId: gasPrice.chainId,
          chainName: gasPrice.chainName,
          gasPrices: {
            slow: parseFloat(gasPrice.low),
            standard: parseFloat(gasPrice.average),
            fast: parseFloat(gasPrice.high)
          },
          unit: gasPrice.unit,
          baseFee: gasPrice.baseFee,
          lastUpdated: gasPrice.lastUpdated
        }
      })

      return addRateLimitHeaders(response, rateLimit)
    }

    // All chains
    const allPrices = await gasTracker.getAllGasPrices()

    const response = NextResponse.json({
      success: true,
      data: {
        chains: allPrices.map(p => ({
          chainId: p.chainId,
          chainName: p.chainName,
          gasPrices: {
            slow: parseFloat(p.low),
            standard: parseFloat(p.average),
            fast: parseFloat(p.high)
          },
          unit: p.unit,
          baseFee: p.baseFee,
          lastUpdated: p.lastUpdated
        })),
        count: allPrices.length
      }
    })

    return addRateLimitHeaders(response, rateLimit)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(err) || 'Failed to fetch gas prices' },
      { status: 500 }
    )
  }
}
