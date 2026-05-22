import { NextRequest, NextResponse } from 'next/server'
import {
  initializeUser,
  getCurrentUser,
  getUserQuests,
  getUserBadges,
  completeQuest,
  getLeaderboard,
  getNextLevel,
  QUESTS,
  BADGES,
  LEVEL_THRESHOLDS,
} from '@/lib/gamification'
import { sanitizeErrorMessage } from '@/lib/validation'
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
      case 'quests':
        return NextResponse.json({ quests: QUESTS })

      case 'badges':
        return NextResponse.json({ badges: BADGES })

      case 'levels':
        return NextResponse.json({ levels: LEVEL_THRESHOLDS })

      case 'leaderboard':
        return NextResponse.json({ leaderboard: getLeaderboard() })

      default: {
        // Return current user state (initialize if needed)
        const address = request.nextUrl.searchParams.get('address')
        if (address) {
          initializeUser(address)
        }
        const user = getCurrentUser()
        if (!user) {
          return NextResponse.json({
            message: 'Security Quests API',
            endpoints: {
              'GET ?address=0x...': 'Initialize/get user state',
              'GET ?action=quests': 'List all quests',
              'GET ?action=badges': 'List all badges',
              'GET ?action=levels': 'List level thresholds',
              'GET ?action=leaderboard': 'Get leaderboard',
              'POST { action: "complete", questId: "..." }': 'Complete a quest',
            },
          })
        }

        return NextResponse.json({
          user,
          quests: getUserQuests(),
          badges: getUserBadges(),
          nextLevel: getNextLevel(),
          leaderboard: getLeaderboard(),
        })
      }
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
      case 'init': {
        const { address } = body
        if (!address || typeof address !== 'string') {
          return NextResponse.json({ error: 'Missing address' }, { status: 400 })
        }
        const user = initializeUser(address)
        return NextResponse.json({
          user,
          quests: getUserQuests(),
          badges: getUserBadges(),
          nextLevel: getNextLevel(),
        })
      }

      case 'complete': {
        const { questId } = body
        if (!questId || typeof questId !== 'string') {
          return NextResponse.json({ error: 'Missing questId' }, { status: 400 })
        }

        const user = getCurrentUser()
        if (!user) {
          return NextResponse.json({ error: 'No user session. Initialize first with { action: "init", address: "0x..." }' }, { status: 400 })
        }

        const result = completeQuest(questId)
        if (!result.success) {
          return NextResponse.json({ error: result.message }, { status: 400 })
        }

        return NextResponse.json({
          ...result,
          user: getCurrentUser(),
          quests: getUserQuests(),
          badges: getUserBadges(),
          nextLevel: getNextLevel(),
          leaderboard: getLeaderboard(),
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action. Use: init, complete' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
