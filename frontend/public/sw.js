var CACHE_NAME = "nalagrow-v1"
var ASSETS_TO_CACHE = ["/", "/manifest.json"]

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS_TO_CACHE)
    })
  )
})

self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var fetchPromise = fetch(event.request).then(function (response) {
        if (response.ok && event.request.method === "GET") {
          var clone = response.clone()
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone)
          })
        }
        return response
      })
      return cached || fetchPromise
    })
  )
})

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names
          .filter(function (name) {
            return name !== CACHE_NAME
          })
          .map(function (name) {
            return caches.delete(name)
          })
      )
    })
  )
})
