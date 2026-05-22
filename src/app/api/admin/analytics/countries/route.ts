import { NextRequest, NextResponse } from 'next/server'
import { getCountries } from '@/lib/analytics'
import { syncMiddlewareVisits } from '@/lib/analyticsSync'

const ADMIN_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A'

export async function GET(request: NextRequest) {
  try {
    const wallet = request.headers.get('x-wallet-address')
    if (!wallet || wallet.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
      return NextResponse.json({ error: 'Access denied. Admin wallet required.' }, { status: 403 })
    }

    syncMiddlewareVisits()

    const countries = getCountries()
    return NextResponse.json(countries)
  } catch (err) {
    console.error('[Analytics Countries] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
