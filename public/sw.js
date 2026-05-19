// SweepGuard Service Worker
const CACHE_NAME = 'sweeptsguard-v1'
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
  '/scam-check'
]

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
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// Fetch - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip API calls and non-GET requests
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone)
          })
        }
        return response
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request).then((cached) => {
          return cached || new Response('Offline', { status: 503 })
        })
      })
  )
})

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const options = {
    body: data.body || 'SweepGuard notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'SweepGuard', options)
  )
})

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.openWindow(event.notification.data.url)
  )
})
