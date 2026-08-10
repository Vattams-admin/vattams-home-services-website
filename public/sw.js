const CACHE_NAME = 'vattams-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  /*
   * IMPORTANT:
   * Never cache HTML pages.
   * Always get the latest VATTAMS application from Cloudflare.
   */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );

    return;
  }

  /*
   * Static assets can use normal browser/network caching.
   * Do not force old application JS into the cache.
   */
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});