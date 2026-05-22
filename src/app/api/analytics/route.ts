import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { sanitizeErrorMessage } from '@/lib/validation'
import { captureError } from '@/lib/sentry'

// ── Types ───────────────────────────────────────────────────

interface ScanEvent {
  id: string
  timestamp: number
  chainId: number
  address: string
  result: 'clean' | 'compromised' | 'drainer_detected'
  recoveryAttempted: boolean
  recoverySuccess: boolean
  valueRecoveredUsd?: number
}

interface AnalyticsData {
  totalScans: number
  totalRecoveries: number
  successfulRecoveries: number
  failedRecoveries: number
  totalRecoveredUsd: number
  revenueUsd: number
  chainBreakdown: Record<number, number>
  recentActivity: ScanEvent[]
  successRate: number
}

// ── In-memory store (server-side aggregation) ───────────────

const serverEvents: ScanEvent[] = []
const MAX_SERVER_EVENTS = 5000

function generateId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function computeAnalytics(events: ScanEvent[]): AnalyticsData {
  const totalScans = events.length
  const recoveryEvents = events.filter(e => e.recoveryAttempted)
  const totalRecoveries = recoveryEvents.length
  const successfulRecoveries = recoveryEvents.filter(e => e.recoverySuccess).length
  const failedRecoveries = totalRecoveries - successfulRecoveries
  const totalRecoveredUsd = events.reduce((sum, e) => sum + (e.valueRecoveredUsd || 0), 0)
  const revenueUsd = totalRecoveredUsd * 0.2

  const chainBreakdown: Record<number, number> = {}
  for (const event of events) {
    chainBreakdown[event.chainId] = (chainBreakdown[event.chainId] || 0) + 1
  }

  const recentActivity = events.slice(-20).reverse()
  const successRate = totalRecoveries > 0
    ? Math.round((successfulRecoveries / totalRecoveries) * 100)
    : 0

  return {
    totalScans,
    totalRecoveries,
    successfulRecoveries,
    failedRecoveries,
    totalRecoveredUsd,
    revenueUsd,
    chainBreakdown,
    recentActivity,
    successRate,
  }
}

// ── Handlers ────────────────────────────────────────────────

/**
 * GET /api/analytics
 * Get aggregated analytics data
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const data = computeAnalytics(serverEvents)
    return NextResponse.json({ success: true, data })
  } catch (err: unknown) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: '/api/analytics GET' })
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}

/**
 * POST /api/analytics
 * Actions: track, batchTrack, clear
 * Body: { action: string, ... }
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip, 100, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { action } = body as { action: string }

    switch (action) {
      case 'track': {
        const { type, data } = body as {
          type: string
          data: {
            chainId?: number
            address?: string
            result?: ScanEvent['result']
            success?: boolean
            valueUsd?: number
          }
        }

        const event: ScanEvent = {
          id: generateId(),
          timestamp: Date.now(),
          chainId: data?.chainId || 1,
          address: data?.address || '',
          result: data?.result || 'clean',
          recoveryAttempted: type === 'recovery',
          recoverySuccess: data?.success || false,
          valueRecoveredUsd: data?.valueUsd,
        }

        serverEvents.push(event)
        if (serverEvents.length > MAX_SERVER_EVENTS) {
          serverEvents.splice(0, serverEvents.length - MAX_SERVER_EVENTS)
        }

        return NextResponse.json({ success: true, data: { eventId: event.id } })
      }

      case 'batchTrack': {
        const { events: batchEvents } = body as {
          events: {
            type: string
            data: {
              chainId?: number
              address?: string
              result?: ScanEvent['result']
              success?: boolean
              valueUsd?: number
            }
          }[]
        }

        if (!Array.isArray(batchEvents)) {
          return NextResponse.json({ error: 'events must be an array' }, { status: 400 })
        }

        const added: string[] = []
        for (const item of batchEvents.slice(0, 100)) {
          const event: ScanEvent = {
            id: generateId(),
            timestamp: Date.now(),
            chainId: item.data?.chainId || 1,
            address: item.data?.address || '',
            result: item.data?.result || 'clean',
            recoveryAttempted: item.type === 'recovery',
            recoverySuccess: item.data?.success || false,
            valueRecoveredUsd: item.data?.valueUsd,
          }
          serverEvents.push(event)
          added.push(event.id)
        }

        if (serverEvents.length > MAX_SERVER_EVENTS) {
          serverEvents.splice(0, serverEvents.length - MAX_SERVER_EVENTS)
        }

        return NextResponse.json({ success: true, data: { added: added.length, eventIds: added } })
      }

      case 'clear': {
        const cleared = serverEvents.length
        serverEvents.length = 0
        return NextResponse.json({ success: true, data: { cleared }, message: `Cleared ${cleared} events` })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: track, batchTrack, clear` },
          { status: 400 }
        )
    }
  } catch (err: unknown) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: '/api/analytics POST' })
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
