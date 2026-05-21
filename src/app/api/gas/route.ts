import { NextRequest, NextResponse } from 'next/server'
import { gasTracker } from '@/lib/gasTracker'
import { sanitizeErrorMessage } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const chainIdParam = request.nextUrl.searchParams.get('chainId')

  try {
    if (chainIdParam) {
      const chainId = parseInt(chainIdParam, 10)
      if (isNaN(chainId)) {
        return NextResponse.json({ error: 'chainId must be a valid number' }, { status: 400 })
      }
      const gasPrice = await gasTracker.getGasPrice(chainId)
      if (!gasPrice) {
        return NextResponse.json({ error: 'Chain not supported' }, { status: 400 })
      }
      
      // Return in extension format
      return NextResponse.json({
        chainId: gasPrice.chainId,
        chainName: gasPrice.chainName,
        gasPrices: {
          slow: parseFloat(gasPrice.low),
          medium: parseFloat(gasPrice.average),
          aggressive: parseFloat(gasPrice.high)
        },
        unit: gasPrice.unit,
        baseFee: gasPrice.baseFee,
        lastUpdated: gasPrice.lastUpdated
      })
    }

    const allPrices = await gasTracker.getAllGasPrices()
    return NextResponse.json({ chains: allPrices })
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) || 'Failed to fetch gas prices' }, { status: 500 })
  }
}
