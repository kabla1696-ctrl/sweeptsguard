/**
 * Bridge between middleware's globalThis store and the analytics lib.
 * Middleware writes visits to globalThis.__sg_visits (shared across edge/node runtimes).
 * This module drains those visits into the analytics lib's in-memory store.
 */

import { trackVisit } from './analytics'

interface MiddlewareVisit {
  path: string
  ip: string
  country: string
  userAgent: string
  timestamp: number
}

const g = globalThis as unknown as {
  __sg_visits?: MiddlewareVisit[]
  __sg_last_sync?: number
}

/**
 * Drain middleware-tracked visits into the analytics lib.
 * Idempotent — safe to call on every API request.
 */
export function syncMiddlewareVisits(): void {
  const pending = g.__sg_visits
  if (!pending || pending.length === 0) return

  // Drain all pending visits
  g.__sg_visits = []

  for (const visit of pending) {
    trackVisit(visit.path, visit.ip, visit.country, visit.userAgent)
  }

  g.__sg_last_sync = Date.now()
}
