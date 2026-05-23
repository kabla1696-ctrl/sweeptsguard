import { NextRequest, NextResponse } from 'next/server'
import { whaleAlerts } from '@/lib/whaleAlert'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const rl = rateLimit(ip, 30, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const action = request.nextUrl.searchParams.get('action') || 'alerts'
  const address = request.nextUrl.searchParams.get('address')
  const limitParam = request.nextUrl.searchParams.get('limit')

  try {
    switch (action) {
      case 'check': {
        if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })
        if (!isValidAddress(address)) return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
        const whale = whaleAlerts.isWhale(address)
        return NextResponse.json({ address, isWhale: !!whale, whale })
      }
      case 'config': {
        return NextResponse.json(whaleAlerts.getConfig())
      }
      case 'stats': {
        const stats = whaleAlerts.getStats()
        return NextResponse.json(stats)
      }
      case 'transactions': {
        const limit = limitParam ? parseInt(limitParam, 10) : 100
        const transactions = whaleAlerts.getRecentTransactions(limit)
        return NextResponse.json({ transactions, total: transactions.length })
      }
      default: {
        const limit = limitParam ? parseInt(limitParam, 10) : 20
        const alerts = whaleAlerts.getAlerts(limit)
        return NextResponse.json({ alerts, total: alerts.length })
      }
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const rl = rateLimit(ip, 10, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { action, address, label, chainId, alertId } = body

    switch (action) {
      case 'add_watchlist': {
        if (!address || !isValidAddress(address)) return NextResponse.json({ error: 'Valid address required' }, { status: 400 })
        whaleAlerts.addWatchlistWallet({ address, label: label || 'Whale', estimatedValue: 0, chains: [chainId || 1], lastActivity: new Date().toISOString(), category: 'unknown' })
        return NextResponse.json({ success: true, watchlist: whaleAlerts.getWatchlist() })
      }
      case 'remove_watchlist': {
        if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })
        whaleAlerts.removeWatchlistWallet(address)
        return NextResponse.json({ success: true, watchlist: whaleAlerts.getWatchlist() })
      }
      case 'mark_read': {
        if (!alertId) return NextResponse.json({ error: 'Alert ID required' }, { status: 400 })
        whaleAlerts.markAlertRead(alertId)
        return NextResponse.json({ success: true })
      }
      case 'mark_all_read': {
        whaleAlerts.markAllRead()
        return NextResponse.json({ success: true })
      }
      case 'scan': {
        const transactions = await whaleAlerts.scanAllChains()
        return NextResponse.json({ transactions, total: transactions.length })
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
