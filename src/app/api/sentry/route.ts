import { NextRequest, NextResponse } from 'next/server'
import { captureError, captureMessage, getRecentErrors, getErrorStats, type ErrorLevel } from '@/lib/sentry'

// POST: Receive error reports from client
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, level, stack, context } = body as {
      message?: string
      level?: ErrorLevel
      stack?: string
      context?: Record<string, unknown>
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const validLevels: ErrorLevel[] = ['info', 'warning', 'error', 'fatal']
    const errorLevel = validLevels.includes(level as ErrorLevel) ? (level as ErrorLevel) : 'error'

    // Add client metadata
    const enrichedContext = {
      ...context,
      userAgent: request.headers.get('user-agent') || 'unknown',
      clientIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
      url: context?.url || request.headers.get('referer') || 'unknown',
    }

    if (stack) {
      const error = new Error(message)
      error.stack = stack
      captureError(error, enrichedContext)
    } else {
      captureMessage(message, errorLevel, enrichedContext)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// GET: Retrieve recent errors (admin/debug)
export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get('limit')
  const limit = limitParam ? Math.min(parseInt(limitParam), 200) : 50

  const errors = getRecentErrors(limit)
  const stats = getErrorStats()

  return NextResponse.json({ errors, stats })
}
