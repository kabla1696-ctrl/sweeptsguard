import { NextRequest, NextResponse } from 'next/server'
import {
  followWhale,
  unfollowWhale,
  getFollowedWhales,
  scanWhaleTrades,
  getWhalePortfolio,
  getLeaderboard,
  getSignals,
  markSignalRead,
  markAllSignalsRead,
  getTrackerConfig,
  updateTrackerConfig,
  getTrackerStats,
  getRecentTrades,
  isFollowing,
} from '@/lib/whaleTracker'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetTime - Date.now()) / 1000)) } }
    )
  }

  const action = request.nextUrl.searchParams.get('action')

  try {
    switch (action) {
      case 'whales':
        return NextResponse.json({ whales: getFollowedWhales() })

      case 'trades': {
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10)
        return NextResponse.json({ trades: getRecentTrades(limit) })
      }

      case 'signals': {
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10)
        return NextResponse.json({ signals: getSignals(limit) })
      }

      case 'leaderboard':
        return NextResponse.json({ leaderboard: getLeaderboard() })

      case 'config':
        return NextResponse.json(getTrackerConfig())

      case 'stats':
        return NextResponse.json(getTrackerStats())

      case 'portfolio': {
        const address = request.nextUrl.searchParams.get('address')
        if (!address || !isValidAddress(address)) {
          return NextResponse.json({ error: 'Invalid EVM address' }, { status: 400 })
        }
        const portfolio = await getWhalePortfolio(address)
        if (!portfolio) {
          return NextResponse.json({ error: 'Whale not found. Follow the address first.' }, { status: 404 })
        }
        return NextResponse.json(portfolio)
      }

      case 'following': {
        const address = request.nextUrl.searchParams.get('address')
        if (!address || !isValidAddress(address)) {
          return NextResponse.json({ error: 'Invalid EVM address' }, { status: 400 })
        }
        return NextResponse.json({ following: isFollowing(address) })
      }

      default:
        return NextResponse.json({
          whales: getFollowedWhales(),
          stats: getTrackerStats(),
          recentTrades: getRecentTrades(10),
          signals: getSignals(5),
        })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetTime - Date.now()) / 1000)) } }
    )
  }

  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'follow': {
        const { address, label, category, netWorth } = body
        if (!address || !isValidAddress(address)) {
          return NextResponse.json({ error: 'Invalid EVM address' }, { status: 400 })
        }
        if (!label || typeof label !== 'string') {
          return NextResponse.json({ error: 'Missing label' }, { status: 400 })
        }
        const result = followWhale(address, label, category, netWorth)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json(result, { status: 201 })
      }

      case 'unfollow': {
        const { address } = body
        if (!address || !isValidAddress(address)) {
          return NextResponse.json({ error: 'Invalid EVM address' }, { status: 400 })
        }
        const result = unfollowWhale(address)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json(result)
      }

      case 'scan': {
        const { chainId } = body
        const newTrades = await scanWhaleTrades(chainId)
        return NextResponse.json({
          newTrades,
          count: newTrades.length,
          signals: getSignals(5),
        })
      }

      case 'readSignal': {
        const { signalId } = body
        if (!signalId) return NextResponse.json({ error: 'Missing signalId' }, { status: 400 })
        markSignalRead(signalId)
        return NextResponse.json({ success: true })
      }

      case 'readAllSignals': {
        markAllSignalsRead()
        return NextResponse.json({ success: true })
      }

      case 'updateConfig': {
        const { config } = body
        if (!config || typeof config !== 'object') {
          return NextResponse.json({ error: 'Missing config object' }, { status: 400 })
        }
        updateTrackerConfig(config)
        return NextResponse.json(getTrackerConfig())
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
