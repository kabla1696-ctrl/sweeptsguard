import { NextRequest, NextResponse } from 'next/server'
import { getThreatFeed, submitAlert, checkAddress, getNetworkStats, getTopReporters, getAlert } from '@/lib/decentralizedAlerts'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const rl = rateLimit(ip, 30, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const action = request.nextUrl.searchParams.get('action') || 'feed'
  const address = request.nextUrl.searchParams.get('address')
  const alertId = request.nextUrl.searchParams.get('id')

  try {
    switch (action) {
      case 'feed': {
        const category = (request.nextUrl.searchParams.get('category') || undefined) as 'drainer' | 'scam_token' | 'phishing' | 'rug_pull' | 'honeypot' | 'fake_airdrop' | 'address_poisoning' | 'other' | undefined
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10)
        const feed = getThreatFeed({ category, limit })
        return NextResponse.json({ alerts: feed })
      }
      case 'check': {
        if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })
        if (!isValidAddress(address)) return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
        const threats = checkAddress(address)
        return NextResponse.json({ address, threats })
      }
      case 'alert': {
        if (!alertId) return NextResponse.json({ error: 'Alert ID required' }, { status: 400 })
        const alert = getAlert(alertId)
        if (!alert) return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
        return NextResponse.json(alert)
      }
      case 'stats':
        return NextResponse.json(getNetworkStats())
      case 'reporters':
        return NextResponse.json({ reporters: getTopReporters() })
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const rl = rateLimit(ip, 5, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await request.json()
    if (!body.address || !isValidAddress(body.address)) {
      return NextResponse.json({ error: 'Valid address required' }, { status: 400 })
    }
    const alert = submitAlert(body)
    return NextResponse.json(alert, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
