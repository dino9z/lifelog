const CACHE = 'lifelog-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html').then((r) => r || caches.match(req))),
    )
    return
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req)
      const fetched = fetch(req)
        .then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone())
          return res
        })
        .catch(() => cached)
      return cached || fetched
    }),
  )
})
