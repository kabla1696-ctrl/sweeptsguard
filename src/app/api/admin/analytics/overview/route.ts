import { NextRequest, NextResponse } from 'next/server'
import { getOverview } from '@/lib/analytics'
import { syncMiddlewareVisits } from '@/lib/analyticsSync'
import { requireAdmin } from '@/lib/adminAuth'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const ip = getClientIp(request)
    const rl = rateLimit(ip, 30, 60_000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const auth = requireAdmin(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Access denied' }, { status: 403 })
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
