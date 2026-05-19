import { NextRequest, NextResponse } from 'next/server'
import { gasTracker } from '@/lib/gasTracker'

export async function GET(request: NextRequest) {
  const chainIdParam = request.nextUrl.searchParams.get('chainId')

  try {
    if (chainIdParam) {
      const chainId = parseInt(chainIdParam, 10)
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
    const message = err instanceof Error ? err.message : 'Failed to fetch gas prices'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
