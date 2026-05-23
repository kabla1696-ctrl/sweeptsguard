// Error monitoring — captures, stores, and optionally reports errors
// Stores last 100 errors in localStorage for debugging

export interface ErrorEntry {
  id: string
  timestamp: number
  message: string
  stack?: string
  component?: string
  url?: string
  userAgent?: string
  severity: 'error' | 'warning' | 'critical'
  context?: Record<string, unknown>
}

const STORAGE_KEY = 'sweeptsguard_errors'
const MAX_ERRORS = 100
const WEBHOOK_KEY = 'sweeptsguard_error_webhook'

function getStoredErrors(): ErrorEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveErrors(errors: ErrorEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    const trimmed = errors.slice(-MAX_ERRORS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // localStorage full
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(errors.slice(-20)))
    } catch {
      // Give up
    }
  }
}

async function sendToWebhook(entry: ErrorEntry): Promise<void> {
  if (typeof window === 'undefined') return
  const webhookUrl = localStorage.getItem(WEBHOOK_KEY)
  if (!webhookUrl) return

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      keepalive: true,
    })
  } catch {
    // Don't let webhook failures cause more errors
  }
}

export function captureError(
  error: Error | string,
  context?: {
    component?: string
    severity?: ErrorEntry['severity']
    extra?: Record<string, unknown>
  }
): string {
  const entry: ErrorEntry = {
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'string' ? undefined : error.stack,
    component: context?.component,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    severity: context?.severity || 'error',
    context: context?.extra,
  }

  // Store locally
  const errors = getStoredErrors()
  errors.push(entry)
  saveErrors(errors)

  // Console log in development
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    console.error(`[SweepGuard Error] ${entry.message}`, entry)
  }

  // Send to webhook if configured
  sendToWebhook(entry)

  return entry.id
}

export function getRecentErrors(limit = 20): ErrorEntry[] {
  const errors = getStoredErrors()
  return errors.slice(-limit).reverse()
}

export function getErrorCount(): number {
  return getStoredErrors().length
}

export function clearErrors(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export function setErrorWebhook(url: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(WEBHOOK_KEY, url)
}

export function getErrorWebhook(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(WEBHOOK_KEY)
}

// Global error handler — call this once on app init
export function initErrorMonitoring(): void {
  if (typeof window === 'undefined') return

  // Catch unhandled errors
  window.addEventListener('error', (event) => {
    captureError(event.error || event.message, {
      severity: 'critical',
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    })
  })

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    captureError(
      reason instanceof Error ? reason : String(reason),
      { severity: 'critical' }
    )
  })
}
