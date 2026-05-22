/**
 * Browser notification system for SweepGuard
 * Handles permission requests, sending notifications, and polling for events
 */

export type NotificationType =
  | 'new_funds'
  | 'drainer_activity'
  | 'recovery_complete'
  | 'nft_received'
  | 'sweep_success'
  | 'sweep_failed'
  | 'delegation_revoked'

export interface NotificationPayload {
  type: NotificationType
  title: string
  body: string
  icon?: string
  url?: string
  data?: Record<string, unknown>
}

export interface NotificationPreferences {
  drainerAlerts: boolean
  fundAlerts: boolean
  recoveryAlerts: boolean
  sweepAlerts: boolean
  nftAlerts: boolean
  sound: boolean
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  drainerAlerts: true,
  fundAlerts: true,
  recoveryAlerts: true,
  sweepAlerts: true,
  nftAlerts: true,
  sound: true,
}

const PREFS_KEY = 'sweeptsguard_notification_prefs'
const LAST_CHECK_KEY = 'sweeptsguard_last_check'

/**
 * Check if browser notifications are supported
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

/**
 * Request browser notification permission
 * Returns the resulting permission state
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported'

  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'

  const result = await Notification.requestPermission()
  return result
}

/**
 * Send a browser notification
 * Uses service worker if available (works when tab is closed), falls back to new Notification()
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  if (!isNotificationSupported()) return
  if (Notification.permission !== 'granted') return

  const prefs = getPreferences()
  if (!shouldNotify(payload.type, prefs)) return

  const icon = payload.icon || '/icon-192.png'
  const badge = '/icon-192.png'
  const url = payload.url || '/dashboard'

  try {
    // Try service worker first (works when tab is closed)
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(payload.title, {
      body: payload.body,
      icon,
      badge,
      vibrate: [100, 50, 100],
      tag: `sweeptsguard-${payload.type}`,
      data: { url, ...payload.data },
      actions: [
        { action: 'open', title: 'Open Dashboard' },
      ],
    })
  } catch {
    // Fallback to basic Notification API (tab must be open)
    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon,
        tag: `sweeptsguard-${payload.type}`,
        data: { url, ...payload.data },
      })
      notification.onclick = () => {
        window.focus()
        window.location.href = url
      }
    } catch {
      // Silently fail — notification not critical
    }
  }
}

/**
 * Get notification preferences from localStorage
 */
export function getPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES
  try {
    const stored = localStorage.getItem(PREFS_KEY)
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_PREFERENCES
}

/**
 * Save notification preferences to localStorage
 */
export function savePreferences(prefs: NotificationPreferences): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if a notification type should fire based on preferences
 */
function shouldNotify(type: NotificationType, prefs: NotificationPreferences): boolean {
  switch (type) {
    case 'new_funds':
    case 'nft_received':
      return prefs.fundAlerts
    case 'drainer_activity':
      return prefs.drainerAlerts
    case 'recovery_complete':
      return prefs.recoveryAlerts
    case 'sweep_success':
    case 'sweep_failed':
      return prefs.sweepAlerts
    case 'delegation_revoked':
      return prefs.recoveryAlerts
    default:
      return true
  }
}

/**
 * Pre-defined notification templates
 */
export const NotificationTemplates = {
  newFunds: (chainName: string, amount: string, asset: string): NotificationPayload => ({
    type: 'new_funds',
    title: '💰 New Funds Detected!',
    body: `${amount} ${asset} arrived on ${chainName}. Auto-sweeping to safe wallet...`,
    url: '/dashboard',
  }),

  drainerActivity: (drainerName: string, chainName: string): NotificationPayload => ({
    type: 'drainer_activity',
    title: '🚨 Drainer Activity Detected!',
    body: `Known drainer "${drainerName}" detected on ${chainName}. Funds at risk!`,
    url: '/dashboard',
  }),

  recoveryComplete: (amount: string, asset: string): NotificationPayload => ({
    type: 'recovery_complete',
    title: '✅ Recovery Complete!',
    body: `${amount} ${asset} successfully recovered to safe wallet.`,
    url: '/recover',
  }),

  nftReceived: (chainName: string, contractAddress: string): NotificationPayload => ({
    type: 'nft_received',
    title: '🖼️ NFT Received!',
    body: `NFT from ${contractAddress.slice(0, 10)}... received on ${chainName}`,
    url: '/dashboard',
  }),

  sweepSuccess: (chainName: string, amount: string, asset: string): NotificationPayload => ({
    type: 'sweep_success',
    title: '⚡ Sweep Successful!',
    body: `${amount} ${asset} swept from ${chainName} to safe wallet.`,
    url: '/dashboard',
  }),

  sweepFailed: (chainName: string, reason: string): NotificationPayload => ({
    type: 'sweep_failed',
    title: '❌ Sweep Failed',
    body: `Failed to sweep on ${chainName}: ${reason}`,
    url: '/dashboard',
  }),

  delegationRevoked: (chainName: string): NotificationPayload => ({
    type: 'delegation_revoked',
    title: '🚫 Delegation Revoked',
    body: `Delegation on ${chainName} has been revoked. Wallet is cleaner now.`,
    url: '/recover',
  }),
}

/**
 * Start polling for new events and send notifications
 * This runs client-side, checking the monitor API for changes
 */
export function startNotificationPolling(
  address: string,
  _safeAddress: string,
  intervalMs: number = 15000
): () => void {
  if (!isNotificationSupported()) return () => {}
  if (Notification.permission !== 'granted') return () => {}

  let lastCheck = parseInt(localStorage.getItem(LAST_CHECK_KEY) || '0', 10)
  let running = true

  const poll = async () => {
    if (!running) return

    try {
      const res = await fetch(`/api/monitor?address=${address}`)
      if (!res.ok) return

      const data = await res.json()
      if (!data.running) return

      // Check for new alerts since last check
      const newAlerts = (data.alerts || []).filter(
        (a: { timestamp: number }) => a.timestamp > lastCheck
      )

      for (const alert of newAlerts) {
        switch (alert.type) {
          case 'balance_change':
          case 'incoming_transfer':
            await sendNotification(
              NotificationTemplates.newFunds(alert.chainName, alert.amount || '?', alert.asset || 'ETH')
            )
            break
          case 'drainer_detected':
            await sendNotification(
              NotificationTemplates.drainerActivity(alert.message, alert.chainName)
            )
            break
          case 'sweep_success':
            await sendNotification(
              NotificationTemplates.sweepSuccess(alert.chainName, alert.amount || '?', alert.asset || 'ETH')
            )
            break
          case 'sweep_failed':
            await sendNotification(
              NotificationTemplates.sweepFailed(alert.chainName, alert.message)
            )
            break
        }
      }

      // Check for new sweeps
      const newSweeps = (data.sweeps || []).filter(
        (s: { timestamp?: number }) => (s.timestamp || 0) > lastCheck
      )

      for (const sweep of newSweeps) {
        if (sweep.success) {
          await sendNotification(
            NotificationTemplates.sweepSuccess(sweep.chainName, sweep.amount, sweep.asset)
          )
        } else {
          await sendNotification(
            NotificationTemplates.sweepFailed(sweep.chainName, sweep.error || 'Unknown error')
          )
        }
      }

      lastCheck = Date.now()
      localStorage.setItem(LAST_CHECK_KEY, String(lastCheck))
    } catch {
      // Silently fail — will retry on next interval
    }
  }

  // Initial poll
  poll()

  // Set up interval
  const intervalId = setInterval(poll, intervalMs)

  // Return cleanup function
  return () => {
    running = false
    clearInterval(intervalId)
  }
}
