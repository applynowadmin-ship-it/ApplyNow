const CACHE = "applynow-v15";
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(["./", "./index.html", "./admin.html", "./manifest.json", "./icon.png", "./icon-192.png"]))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).then(response => {
      if (!response.ok || new URL(event.request.url).origin !== self.location.origin) return response;
      return caches.open(CACHE).then(cache => cache.put(event.request, response.clone()).then(() => response));
    }).catch(() => caches.match(event.request).then(response =>
      response || (event.request.mode === "navigate" ? caches.match("./index.html") : Response.error())
    ))
  );
});