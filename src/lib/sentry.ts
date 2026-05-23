// Sentry-style error tracking (client + server)
// Stores errors locally, forwards to webhook/Sentry DSN if configured

export type ErrorLevel = 'info' | 'warning' | 'error' | 'fatal'

export interface ErrorReport {
  id: string
  message: string
  level: ErrorLevel
  timestamp: number
  stack?: string
  context?: Record<string, unknown>
  url?: string
  userAgent?: string
}

// In-memory store for recent errors (server-side)
const recentErrors: ErrorReport[] = []
const MAX_ERRORS = 500

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function addError(report: ErrorReport): void {
  recentErrors.push(report)
  if (recentErrors.length > MAX_ERRORS) {
    recentErrors.splice(0, recentErrors.length - MAX_ERRORS)
  }
}

// Send to external error tracking service if configured
async function forwardError(report: ErrorReport): Promise<void> {
  const sentryDsn = process.env.SENTRY_DSN
  const webhookUrl = process.env.ERROR_WEBHOOK_URL

  // Forward to Sentry DSN (simplified — real SDK would be better)
  if (sentryDsn) {
    try {
      // Sentry ingest endpoint format: https://key@org.ingest.sentry.io/project
      // For now, log it — full SDK integration would use @sentry/nextjs
      console.error('[Sentry]', JSON.stringify({
        message: report.message,
        level: report.level,
        timestamp: report.timestamp,
        extra: report.context,
      }))
    } catch {
      // Don't let Sentry failures break the app
    }
  }

  // Forward to generic webhook (Discord, Slack, etc.)
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🚨 **${report.level.toUpperCase()}**: ${report.message}`,
          embeds: [{
            title: report.message,
            description: report.stack?.slice(0, 2000) || 'No stack trace',
            color: report.level === 'error' || report.level === 'fatal' ? 0xff0000 : report.level === 'warning' ? 0xffaa00 : 0x00aaff,
            fields: report.context ? Object.entries(report.context).slice(0, 10).map(([k, v]) => ({
              name: k,
              value: String(v).slice(0, 1024),
              inline: true,
            })) : [],
            timestamp: new Date(report.timestamp).toISOString(),
          }],
        }),
      })
    } catch {
      // Don't let webhook failures break the app
    }
  }
}

// Client-callable: capture an error
export function captureError(error: Error, context?: Record<string, unknown>): void {
  const report: ErrorReport = {
    id: generateId(),
    message: error.message,
    level: 'error',
    timestamp: Date.now(),
    stack: error.stack,
    context,
  }

  addError(report)
  forwardError(report).catch(() => {})
}

// Client-callable: capture a message
export function captureMessage(
  message: string,
  level: ErrorLevel = 'info',
  context?: Record<string, unknown>
): void {
  const report: ErrorReport = {
    id: generateId(),
    message,
    level,
    timestamp: Date.now(),
    context,
  }

  addError(report)
  forwardError(report).catch(() => {})
}

// Get recent errors (for admin/debug endpoints)
export function getRecentErrors(limit: number = 50): ErrorReport[] {
  return recentErrors.slice(-limit)
}

// Error count by level
export function getErrorStats(): { total: number; byLevel: Record<ErrorLevel, number> } {
  const byLevel: Record<ErrorLevel, number> = { info: 0, warning: 0, error: 0, fatal: 0 }
  for (const err of recentErrors) {
    byLevel[err.level]++
  }
  return { total: recentErrors.length, byLevel }
}
