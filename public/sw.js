/* Rowdy's Den — service worker (PWA install + sensible caching).
   Static app shell: cache-first. API/data calls: straight to network —
   billing data must never be served stale. */
const CACHE = 'rowdys-den-v2'
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url === target)
      return existing ? existing.focus() : self.clients.openWindow(target)
    }),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return // never cache live club data

  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request)
      if (cached) return cached
      try {
        const res = await fetch(event.request)
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, clone))
        }
        return res
      } catch (err) {
        const shell = await caches.match('/')
        return shell || Response.error()
      }
    })(),
  )
})
