import { NextRequest, NextResponse } from 'next/server'
import { sanitizeErrorMessage } from '@/lib/validation'

type RiskLevel = 'low' | 'medium' | 'high'

interface Session {
  id: string
  device: string
  ip: string
  location: string
  lastActive: string
  current: boolean
  risk: RiskLevel
  createdAt: string
}

// In-memory store
const sessions = new Map<string, Session>()

// Seed data
const seedSessions: Session[] = [
  { id: '1', device: 'Chrome — MacOS', ip: '192.168.1.1', location: 'New York, US', lastActive: '2 min ago', current: true, risk: 'low', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '2', device: 'Firefox — Windows', ip: '10.0.0.45', location: 'London, UK', lastActive: '1 hour ago', current: false, risk: 'low', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: '3', device: 'Safari — iOS', ip: '172.16.0.8', location: 'Tokyo, JP', lastActive: '3 hours ago', current: false, risk: 'medium', createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: '4', device: 'Unknown — Linux', ip: '203.0.113.42', location: 'Unknown', lastActive: '1 day ago', current: false, risk: 'high', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: '5', device: 'Chrome — Android', ip: '198.51.100.7', location: 'Berlin, DE', lastActive: '2 days ago', current: false, risk: 'low', createdAt: new Date(Date.now() - 86400000 * 14).toISOString() },
]
seedSessions.forEach(s => sessions.set(s.id, s))

const MAX_SESSIONS = 100

/**
 * GET /api/sessions — list all sessions
 */
export async function GET() {
  try {
    return NextResponse.json({ sessions: Array.from(sessions.values()) })
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}

/**
 * POST /api/sessions — disconnect session(s)
 * Body: { action: 'disconnect' | 'disconnectAll', id?: string }
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, id } = body as { action?: string; id?: string }

  try {
    switch (action) {
      case 'disconnect': {
        if (!id) {
          return NextResponse.json({ error: 'Session id required' }, { status: 400 })
        }
        const session = sessions.get(id)
        if (!session) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }
        if (session.current) {
          return NextResponse.json({ error: 'Cannot disconnect current session' }, { status: 403 })
        }
        sessions.delete(id)
        return NextResponse.json({ success: true })
      }

      case 'disconnectAll': {
        let disconnected = 0
        for (const [sid, session] of sessions) {
          if (!session.current) {
            sessions.delete(sid)
            disconnected++
          }
        }
        return NextResponse.json({ success: true, disconnected })
      }

      default:
        return NextResponse.json({ error: 'Unknown action. Use: disconnect, disconnectAll' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
