// Analytics tracking — localStorage-based for privacy
// No external services, no cookies, no user tracking

export interface ScanEvent {
  id: string
  timestamp: number
  chainId: number
  address: string
  result: 'clean' | 'compromised' | 'drainer_detected'
  recoveryAttempted: boolean
  recoverySuccess: boolean
  valueRecoveredUsd?: number
}

export interface AnalyticsData {
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

const STORAGE_KEY = 'sweeptsguard_analytics'
const MAX_EVENTS = 1000

function getEvents(): ScanEvent[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveEvents(events: ScanEvent[]): void {
  if (typeof window === 'undefined') return
  try {
    // Keep only the last MAX_EVENTS
    const trimmed = events.slice(-MAX_EVENTS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // localStorage full — clear old events
    try {
      const trimmed = events.slice(-100)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    } catch {
      // Give up
    }
  }
}

export function trackEvent(type: string, data: Record<string, unknown>): void {
  const events = getEvents()
  const event: ScanEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    chainId: (data.chainId as number) || 1,
    address: (data.address as string) || '',
    result: (data.result as ScanEvent['result']) || 'clean',
    recoveryAttempted: type === 'recovery',
    recoverySuccess: (data.success as boolean) || false,
    valueRecoveredUsd: data.valueUsd as number | undefined,
  }
  events.push(event)
  saveEvents(events)
}

export function getAnalytics(): AnalyticsData {
  const events = getEvents()

  const totalScans = events.length
  const recoveryEvents = events.filter(e => e.recoveryAttempted)
  const totalRecoveries = recoveryEvents.length
  const successfulRecoveries = recoveryEvents.filter(e => e.recoverySuccess).length
  const failedRecoveries = totalRecoveries - successfulRecoveries
  const totalRecoveredUsd = events.reduce((sum, e) => sum + (e.valueRecoveredUsd || 0), 0)

  // Platform revenue: 20% of recovered value
  const revenueUsd = totalRecoveredUsd * 0.2

  // Chain breakdown
  const chainBreakdown: Record<number, number> = {}
  for (const event of events) {
    chainBreakdown[event.chainId] = (chainBreakdown[event.chainId] || 0) + 1
  }

  // Recent activity (last 20)
  const recentActivity = events.slice(-20).reverse()

  // Success rate
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

export function clearAnalytics(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
