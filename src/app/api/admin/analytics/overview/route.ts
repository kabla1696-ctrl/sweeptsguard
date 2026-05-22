import { NextRequest, NextResponse } from 'next/server'
import { getOverview } from '@/lib/analytics'
import { syncMiddlewareVisits } from '@/lib/analyticsSync'

const ADMIN_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A'

export async function GET(request: NextRequest) {
  try {
    const wallet = request.headers.get('x-wallet-address')
    if (!wallet || wallet.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
      return NextResponse.json({ error: 'Access denied. Admin wallet required.' }, { status: 403 })
    }

    // Sync any visits tracked by middleware
    syncMiddlewareVisits()

    const overview = getOverview()
    return NextResponse.json(overview)
  } catch (err) {
    console.error('[Analytics Overview] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
