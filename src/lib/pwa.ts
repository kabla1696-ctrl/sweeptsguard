// PWA Utility Library
// Handles service worker registration, install prompts, and push notifications

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })

    // Check for updates periodically
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            // Optionally notify user of update
            console.log('[PWA] Service worker updated')
          }
        })
      }
    })

    return registration
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error)
    return null
  }
}

/**
 * Listen for the beforeinstallprompt event
 */
export function listenForInstallPrompt(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
  })
}

/**
 * Check if the app can be installed
 */
export function canInstall(): boolean {
  return deferredPrompt !== null
}

/**
 * Show the install prompt
 * Returns true if user accepted, false if dismissed
 */
export async function requestInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    return false
  }

  try {
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    return outcome === 'accepted'
  } catch (error) {
    console.error('[PWA] Install prompt failed:', error)
    return false
  }
}

/**
 * Detect if running as a PWA (installed)
 */
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false

  // Check display-mode media query
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches

  // Check iOS Safari standalone mode
  const isIOSStandalone = (window.navigator as unknown as Record<string, unknown>).standalone === true

  // Check if launched from home screen on Android
  const referrer = document.referrer
  const isAndroidPWA = referrer === '' && window.history.length <= 2

  return isStandalone || isIOSStandalone || isAndroidPWA
}

/**
 * Setup push notifications
 * Returns the push subscription or null
 */
export async function setupPushNotifications(): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription()
    if (existingSubscription) {
      return existingSubscription
    }

    // Request permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('[PWA] Push notification permission denied')
      return null
    }

    // Subscribe with a placeholder VAPID key (replace with real one in production)
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
    if (!vapidPublicKey) {
      console.log('[PWA] No VAPID key configured, skipping push subscription')
      return null
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource
    })

    // Send subscription to server
    await fetch('/api/v1/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    })

    return subscription
  } catch (error) {
    console.error('[PWA] Push notification setup failed:', error)
    return null
  }
}

/**
 * Request background sync for pending operations
 */
export async function requestBackgroundSync(tag: string = 'pending-operations'): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.ready
    if ('sync' in registration) {
      await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(tag)
    }
  } catch (error) {
    console.error('[PWA] Background sync registration failed:', error)
  }
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
