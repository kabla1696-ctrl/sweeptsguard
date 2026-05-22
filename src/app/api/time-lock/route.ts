import { NextRequest, NextResponse } from 'next/server'
import { sanitizeErrorMessage } from '@/lib/validation'

type LockStatus = 'locked' | 'unlocked' | 'cancelled'

interface TimeLock {
  id: string
  asset: string
  amount: string
  unlockDate: string
  status: LockStatus
  progress: number
  createdAt: string
  durationHours: number
}

// In-memory store
const locks = new Map<string, TimeLock>()

// Seed data
const seedLocks: TimeLock[] = [
  { id: '1', asset: 'ETH', amount: '5.0', unlockDate: '2026-06-15', status: 'locked', progress: 65, createdAt: new Date(Date.now() - 86400000 * 20).toISOString(), durationHours: 720 },
  { id: '2', asset: 'USDC', amount: '10,000', unlockDate: '2026-07-01', status: 'locked', progress: 40, createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), durationHours: 2160 },
  { id: '3', asset: 'WBTC', amount: '0.5', unlockDate: '2026-05-25', status: 'locked', progress: 92, createdAt: new Date(Date.now() - 86400000 * 25).toISOString(), durationHours: 720 },
  { id: '4', asset: 'ETH', amount: '2.0', unlockDate: '2026-05-10', status: 'unlocked', progress: 100, createdAt: new Date(Date.now() - 86400000 * 40).toISOString(), durationHours: 168 },
]
seedLocks.forEach(l => locks.set(l.id, l))

const VALID_ASSETS = ['ETH', 'USDC', 'WBTC', 'DAI', 'USDT', 'LINK', 'UNI']
const MAX_LOCKS = 50

function computeProgress(createdAt: string, unlockDate: string): number {
  const created = new Date(createdAt).getTime()
  const unlock = new Date(unlockDate).getTime()
  const now = Date.now()
  if (now >= unlock) return 100
  if (now <= created) return 0
  return Math.round(((now - created) / (unlock - created)) * 100)
}

/**
 * GET /api/time-lock — list all locks
 */
export async function GET() {
  try {
    // Auto-update status for unlocked locks
    for (const [id, lock] of locks) {
      if (lock.status === 'locked' && new Date(lock.unlockDate) <= new Date()) {
        lock.status = 'unlocked'
        lock.progress = 100
        locks.set(id, lock)
      }
    }
    return NextResponse.json({ locks: Array.from(locks.values()) })
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}

/**
 * POST /api/time-lock — create or cancel a lock
 * Body: { action: 'create' | 'cancel', ... }
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action } = body as { action?: string }

  try {
    switch (action) {
      case 'create': {
        const { asset, amount, durationHours } = body as {
          asset?: string; amount?: string; durationHours?: number
        }

        if (!asset || !VALID_ASSETS.includes(asset)) {
          return NextResponse.json({ error: `Asset must be one of: ${VALID_ASSETS.join(', ')}` }, { status: 400 })
        }
        if (!amount || typeof amount !== 'string' || amount.trim().length === 0) {
          return NextResponse.json({ error: 'Amount is required' }, { status: 400 })
        }
        // Validate amount is a positive number
        const parsedAmount = parseFloat(amount.replace(/,/g, ''))
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
        }
        if (typeof durationHours !== 'number' || !Number.isFinite(durationHours) || durationHours < 1) {
          return NextResponse.json({ error: 'Duration must be at least 1 hour' }, { status: 400 })
        }
        if (durationHours > 8760) {
          return NextResponse.json({ error: 'Duration cannot exceed 8760 hours (1 year)' }, { status: 400 })
        }
        if (locks.size >= MAX_LOCKS) {
          return NextResponse.json({ error: `Maximum ${MAX_LOCKS} locks allowed` }, { status: 429 })
        }

        const now = new Date()
        const unlockDate = new Date(now.getTime() + durationHours * 3600000)

        const lock: TimeLock = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          asset,
          amount: amount.trim(),
          unlockDate: unlockDate.toISOString().split('T')[0],
          status: 'locked',
          progress: 0,
          createdAt: now.toISOString(),
          durationHours,
        }
        locks.set(lock.id, lock)
        return NextResponse.json({ lock }, { status: 201 })
      }

      case 'cancel': {
        const { id } = body as { id?: string }
        if (!id) {
          return NextResponse.json({ error: 'Lock id required' }, { status: 400 })
        }
        const lock = locks.get(id)
        if (!lock) {
          return NextResponse.json({ error: 'Lock not found' }, { status: 404 })
        }
        if (lock.status !== 'locked') {
          return NextResponse.json({ error: `Cannot cancel a lock with status: ${lock.status}` }, { status: 400 })
        }
        lock.status = 'cancelled'
        locks.set(id, lock)
        return NextResponse.json({ lock })
      }

      default:
        return NextResponse.json({ error: 'Unknown action. Use: create, cancel' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
