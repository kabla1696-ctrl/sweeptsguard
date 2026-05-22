import { NextRequest, NextResponse } from 'next/server'
import { getDeFiPositions, getLiquidationAlerts, getYieldSuggestions, getAutoRepayConfigs } from '@/lib/defiProtector'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const rl = rateLimit(ip, 20, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const action = request.nextUrl.searchParams.get('action') || 'positions'
  const address = request.nextUrl.searchParams.get('address')

  try {
    switch (action) {
      case 'positions': {
        if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })
        if (!isValidAddress(address)) return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
        const positions = await getDeFiPositions(address)
        const yieldSuggestions = getYieldSuggestions(positions)
        return NextResponse.json({ positions, yieldSuggestions })
      }
      case 'alerts':
        return NextResponse.json({ alerts: getLiquidationAlerts() })
      case 'auto_repay':
        return NextResponse.json({ configs: getAutoRepayConfigs() })
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
