import { NextRequest, NextResponse } from 'next/server'
import { getHistoricalGas, predictBestTime, calculateGasSavings, getAllPredictions, getGasAlerts, getAutoExecuteConfigs, getSupportedChains } from '@/lib/gasOptimizer'
import { sanitizeErrorMessage } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const rl = rateLimit(ip, 30, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const action = request.nextUrl.searchParams.get('action') || 'chains'
  const chainId = parseInt(request.nextUrl.searchParams.get('chainId') || '1', 10)
  const period = (request.nextUrl.searchParams.get('period') || '24h') as '24h' | '7d' | '30d'

  try {
    switch (action) {
      case 'chains':
        return NextResponse.json({ chains: getSupportedChains() })
      case 'historical':
        return NextResponse.json({ data: getHistoricalGas(chainId, period) })
      case 'predict':
        return NextResponse.json(predictBestTime(chainId))
      case 'predictions':
        return NextResponse.json({ predictions: getAllPredictions() })
      case 'alerts':
        return NextResponse.json({ alerts: getGasAlerts() })
      case 'auto_execute':
        return NextResponse.json({ configs: getAutoExecuteConfigs() })
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
