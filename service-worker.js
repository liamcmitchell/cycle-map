const cacheName = "1"

self.addEventListener("install", (event) => {
  self.skipWaiting()

  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) =>
        cache.addAll(["/", "script.js", "manifest.json", "style.css"]),
      ),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Delete any non-current cache
      caches.keys().then((keys) => {
        Promise.all(
          keys
            .filter((key) => key !== cacheName)
            .map((key) => caches.delete(key)),
        )
      }),
      // Take over existing pages.
      clients.claim(),
    ]),
  )
})

self.addEventListener("fetch", (event) => {
  event.respondWith(
    new Promise((resolve, reject) => {
      caches
        .open(cacheName)
        .then((cache) => {
          cache.match(event.request).then((cacheResponse) => {
            if (cacheResponse) {
              resolve(cacheResponse)
            }
          })
          return fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone())
            resolve(networkResponse)
          })
        })
        .catch(reject)
    }),
  )
})
