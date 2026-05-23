// SweepGuard Service Worker v2
const CACHE_NAME = 'sweeptsguard-v2'
const STATIC_ASSETS = [
  '/',
  '/scan',
  '/dashboard',
  '/history',
  '/wallets',
  '/freeze',
  '/gas',
  '/bridge',
  '/portfolio',
  '/defi',
  '/audit',
  '/reputation',
  '/scam-check',
  '/recover',
  '/offline',
  '/icon-192.png',
  '/icon-512.png'
]

const API_CACHE_NAME = 'sweeptsguard-api-v1'
const API_CACHE_MAX_AGE = 5 * 60 * 1000 // 5 minutes

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== API_CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// Fetch handler
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  // Skip chrome-extension and other non-http schemes
  if (!url.protocol.startsWith('http')) return

  // API requests: stale-while-revalidate
  if (url.pathname.startsWith('/api/v1/')) {
    event.respondWith(staleWhileRevalidate(event.request, API_CACHE_NAME))
    return
  }

  // Legacy API: network-only (no caching)
  if (url.pathname.startsWith('/api/')) return

  // Static assets: cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Return cached, fetch in background to update
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone)
            })
          }
          return response
        }).catch(() => cached)
        return cached
      }

      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone)
          })
        }
        return response
      }).catch(() => {
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/offline')
        }
        return new Response('Offline', { status: 503 })
      })
    })
  )
})

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      // Add timestamp header for TTL checking
      const headers = new Headers(response.headers)
      headers.set('sw-fetched-at', Date.now().toString())
      const cloned = response.clone()
      const timedResponse = new Response(cloned.body, {
        status: cloned.status,
        statusText: cloned.statusText,
        headers
      })
      cache.put(request, timedResponse)
    }
    return response
  }).catch(() => cached)

  // Return cached if it exists and is fresh
  if (cached) {
    const fetchedAt = parseInt(cached.headers.get('sw-fetched-at') || '0', 10)
    if (Date.now() - fetchedAt < API_CACHE_MAX_AGE) {
      return cached
    }
  }

  return fetchPromise
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const options = {
    body: data.body || 'SweepGuard notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    tag: data.tag || 'sweeptsguard-notification',
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    data: { url: data.url || '/dashboard', ...data.data },
    actions: [
      { action: 'open', title: 'Open Dashboard' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'SweepGuard', options)
  )
})

// Notification click — focus existing tab or open new one
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return
  const url = event.notification.data.url || '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})

// Background sync for pending operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'pending-operations') {
    event.waitUntil(syncPendingOperations())
  }
})

async function syncPendingOperations() {
  try {
    const cache = await caches.open('sweeptsguard-pending')
    const requests = await cache.keys()
    for (const request of requests) {
      try {
        await fetch(request)
        await cache.delete(request)
      } catch (e) {
        // Will retry on next sync
      }
    }
  } catch (e) {
    // Cache not available
  }
}
