import { NextRequest, NextResponse } from 'next/server'
import { getHeatmapData, getDrainerClusters, getDrainerMapStats, getChainActivity, getRecentTransactions, searchDrainer, getStolenByChain } from '@/lib/drainerMap'
import { sanitizeErrorMessage } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const rl = rateLimit(ip, 30, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const action = request.nextUrl.searchParams.get('action') || 'stats'
  const query = request.nextUrl.searchParams.get('query')

  try {
    switch (action) {
      case 'heatmap':
        return NextResponse.json(getHeatmapData())
      case 'clusters':
        return NextResponse.json(getDrainerClusters())
      case 'chains':
        return NextResponse.json(getChainActivity())
      case 'transactions': {
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10)
        return NextResponse.json(getRecentTransactions(limit))
      }
      case 'stolen':
        return NextResponse.json(getStolenByChain())
      case 'search': {
        if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 })
        return NextResponse.json(searchDrainer(query))
      }
      default:
        return NextResponse.json(getDrainerMapStats())
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
