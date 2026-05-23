import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { sanitizeErrorMessage } from '@/lib/validation'
import { captureError } from '@/lib/sentry'

// ── Types ───────────────────────────────────────────────────

interface PendingTransaction {
  id: string
  to: string
  value: string
  data: string
  chainId: number
  nonce: number | null
  gasLimit: string | null
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'
  createdAt: string
  submittedAt: string | null
  confirmedAt: string | null
  txHash: string | null
  error: string | null
  metadata: Record<string, unknown> | null
}

// ── In-memory store ─────────────────────────────────────────

const pendingQueue = new Map<string, PendingTransaction>()
let txCounter = 0

// ── Helpers ─────────────────────────────────────────────────

function generateId(): string {
  txCounter++
  return `off_${Date.now()}_${txCounter.toString(36)}`
}

// ── Handlers ────────────────────────────────────────────────

/**
 * GET /api/offline
 * Get all pending transactions in the offline queue
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const statusFilter = request.nextUrl.searchParams.get('status')
    let transactions = Array.from(pendingQueue.values())

    if (statusFilter && ['pending', 'submitted', 'confirmed', 'failed'].includes(statusFilter)) {
      transactions = transactions.filter(tx => tx.status === statusFilter)
    }

    // Sort by creation time, newest first
    transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const stats = {
      total: pendingQueue.size,
      pending: Array.from(pendingQueue.values()).filter(t => t.status === 'pending').length,
      submitted: Array.from(pendingQueue.values()).filter(t => t.status === 'submitted').length,
      confirmed: Array.from(pendingQueue.values()).filter(t => t.status === 'confirmed').length,
      failed: Array.from(pendingQueue.values()).filter(t => t.status === 'failed').length,
    }

    return NextResponse.json({ success: true, data: { transactions, stats } })
  } catch (err: unknown) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: '/api/offline GET' })
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}

/**
 * POST /api/offline
 * Actions: queue, submit, cancel, clear
 * Body: { action: string, ... }
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip, 30, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { action } = body as { action: string }

    switch (action) {
      case 'queue': {
        const { to, value, data, chainId, nonce, gasLimit, metadata } = body as {
          to: string
          value: string
          data?: string
          chainId: number
          nonce?: number
          gasLimit?: string
          metadata?: Record<string, unknown>
        }

        if (!to || !/^0x[0-9a-fA-F]{40}$/.test(to)) {
          return NextResponse.json({ error: 'Invalid "to" address' }, { status: 400 })
        }
        if (!value) {
          return NextResponse.json({ error: '"value" is required' }, { status: 400 })
        }
        if (!chainId || typeof chainId !== 'number') {
          return NextResponse.json({ error: 'Valid "chainId" is required' }, { status: 400 })
        }

        const id = generateId()
        const tx: PendingTransaction = {
          id,
          to: to.toLowerCase(),
          value,
          data: data || '0x',
          chainId,
          nonce: nonce ?? null,
          gasLimit: gasLimit ?? null,
          status: 'pending',
          createdAt: new Date().toISOString(),
          submittedAt: null,
          confirmedAt: null,
          txHash: null,
          error: null,
          metadata: metadata ?? null,
        }
        pendingQueue.set(id, tx)

        return NextResponse.json({
          success: true,
          data: tx,
          message: 'Transaction queued for offline processing',
        })
      }

      case 'submit': {
        const { transactionId } = body as { transactionId: string }
        if (!transactionId) {
          return NextResponse.json({ error: 'transactionId is required' }, { status: 400 })
        }
        const tx = pendingQueue.get(transactionId)
        if (!tx) {
          return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }
        if (tx.status !== 'pending') {
          return NextResponse.json({ error: `Transaction is already ${tx.status}` }, { status: 400 })
        }

        // Simulate submission
        tx.status = 'submitted'
        tx.submittedAt = new Date().toISOString()
        tx.txHash = '0x' + Array.from({ length: 64 }, (_, i) =>
          ((transactionId.charCodeAt(i % transactionId.length) * 31 + i * 17) & 0xf).toString(16)
        ).join('')
        pendingQueue.set(transactionId, tx)

        return NextResponse.json({
          success: true,
          data: tx,
          message: 'Transaction submitted to network',
        })
      }

      case 'cancel': {
        const { transactionId } = body as { transactionId: string }
        if (!transactionId) {
          return NextResponse.json({ error: 'transactionId is required' }, { status: 400 })
        }
        const tx = pendingQueue.get(transactionId)
        if (!tx) {
          return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }
        if (tx.status !== 'pending') {
          return NextResponse.json({ error: `Cannot cancel a ${tx.status} transaction` }, { status: 400 })
        }
        pendingQueue.delete(transactionId)
        return NextResponse.json({ success: true, message: 'Transaction cancelled' })
      }

      case 'submitAll': {
        const pendingTxs = Array.from(pendingQueue.values()).filter(t => t.status === 'pending')
        const submitted: PendingTransaction[] = []
        for (const tx of pendingTxs) {
          tx.status = 'submitted'
          tx.submittedAt = new Date().toISOString()
          tx.txHash = '0x' + Array.from({ length: 64 }, (_, i) =>
            ((tx.id.charCodeAt(i % tx.id.length) * 31 + i * 17) & 0xf).toString(16)
          ).join('')
          pendingQueue.set(tx.id, tx)
          submitted.push(tx)
        }
        return NextResponse.json({
          success: true,
          data: { submitted, count: submitted.length },
          message: `${submitted.length} transaction(s) submitted`,
        })
      }

      case 'clear': {
        const clearedCount = pendingQueue.size
        pendingQueue.clear()
        return NextResponse.json({
          success: true,
          data: { cleared: clearedCount },
          message: `Cleared ${clearedCount} transaction(s)`,
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: queue, submit, cancel, submitAll, clear` },
          { status: 400 }
        )
    }
  } catch (err: unknown) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: '/api/offline POST' })
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}

/**
 * DELETE /api/offline?id=xxx
 * Remove a specific transaction from the queue
 */
export async function DELETE(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
    }
    const deleted = pendingQueue.delete(id)
    if (!deleted) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, message: 'Transaction removed' })
  } catch (err: unknown) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
