// __APP_SHA__ is replaced at build time by the versionStampPlugin in
// vite.config.ts so each deploy gets a unique cache name. In dev (unstamped)
// it stays as the literal placeholder string, which is fine because the SW
// is not registered in dev.
const CACHE_NAME = 'wanderluxe-__APP_SHA__';
const OFFLINE_URL = '/index.html';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icon-192x192.png',
  '/icon-384x384.png',
  '/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE).catch(() => {
        console.log('Cache addAll failed, continuing anyway');
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests — let the browser handle them directly
  // This avoids CSP connect-src violations for external resources (fonts, images, analytics)
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Never cache version.json — it's the source of truth for update detection
  // and must always return the freshest copy from the network.
  if (url.pathname === '/version.json') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match(OFFLINE_URL);
        });
      })
  );
});
