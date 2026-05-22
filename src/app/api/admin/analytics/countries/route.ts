import { NextRequest, NextResponse } from 'next/server'
import { getCountries } from '@/lib/analytics'
import { syncMiddlewareVisits } from '@/lib/analyticsSync'
import { requireAdmin } from '@/lib/adminAuth'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rl = rateLimit(ip, 30, 60_000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const auth = requireAdmin(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Access denied' }, { status: 403 })
    }

    syncMiddlewareVisits()

    const countries = getCountries()
    return NextResponse.json(countries)
  } catch (err) {
    console.error('[Analytics Countries] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
