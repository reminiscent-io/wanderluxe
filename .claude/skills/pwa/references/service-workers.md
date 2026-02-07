# Service Workers & Offline Patterns: Deep Reference

This file explains WHY service workers matter and HOW to use them effectively. Read this when you need to understand offline behavior, caching strategies, or update mechanisms in production PWAs.

## 1. Service Worker Lifecycle

A service worker has three phases: **install**, **waiting**, and **activate**. Understanding this prevents data corruption and broken states.

### The Three Phases

**Install**: Fires when the browser downloads a new or updated service worker script. This is your chance to precache assets.

```javascript
// service-worker.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1-assets').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/styles.css',
        '/app.js'
      ]);
    })
  );
});
```

**Waiting**: The new service worker waits in the background while the old one controls any open pages. This is deliberate—it prevents one page from being served by two different service workers simultaneously, which would break consistency.

**Activate**: Fires when no controlled pages exist (typically on the next page visit). Now you can safely clean up old caches.

```javascript
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== 'v1-assets') {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

### Why the Waiting Phase Matters

Without waiting, updating a service worker would immediately replace the old one. Imagine:
- User is typing a form on page A
- Service worker updates silently
- Page A reloads with new code; form data vanishes

The waiting phase prevents this. The new SW sits dormant until all controlled pages close or explicitly activate it.

## 2. Registration Patterns

### When to Register

Register your service worker once, early, but not on every page load.

```javascript
// main.js
if ('serviceWorker' in navigator) {
  // Register once (browser caches the registration)
  navigator.serviceWorker.register('/sw.js', {
    scope: '/'
  }).then((reg) => {
    console.log('SW registered:', reg);
    // Check for updates periodically
    setInterval(() => reg.update(), 60000); // Every 60s
  }).catch((err) => {
    console.error('SW registration failed:', err);
  });
}
```

### Scope Considerations

The `scope` parameter controls which pages the service worker controls.

```javascript
// /sw.js at root controls everything
navigator.serviceWorker.register('/sw.js', { scope: '/' });

// /app/sw.js only controls /app/* pages
navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' });

// Scope must be under the SW's directory!
// This fails: register('/sw.js', { scope: '/app/' })
```

### Update Triggers

Updates happen when:
1. The SW file changes (byte-for-byte comparison)
2. You call `reg.update()`
3. Browser periodic checks (typically 24 hours)

Always trigger updates on app launch and periodically:

```javascript
async function checkForUpdates() {
  const reg = await navigator.serviceWorker.ready;
  reg.update();
}
```

## 3. Workbox Setup

Workbox abstracts away most service worker boilerplate. Use it unless you have specific reasons not to.

### Installation

```bash
npm install workbox-window workbox-core workbox-precaching workbox-routing workbox-strategies
# For vite-plugin-pwa:
npm install -D vite-plugin-pwa
```

### Vite Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // or 'prompt'
      strategies: 'injectManifest', // or 'generateSW'
      filename: 'sw.js',
      scope: '/',
      manifest: {
        name: 'My App',
        short_name: 'App',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ],
        theme_color: '#ffffff',
        display: 'standalone'
      },
      injectManifest: {
        swSrc: 'src/sw.js', // Your custom SW source
        swDest: 'dist/sw.js'
      }
    })
  ]
});
```

## 4. Caching Strategies Deep Dive

### Precaching (Workbox Precaching)

Precaching embeds a manifest into your service worker at build time. The SW downloads and caches these assets during install.

```javascript
// src/sw.js
import { precacheAndRoute } from 'workbox-precaching';

// This array is injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);
```

Why revision hashing? Workbox names cache entries with content hashes. When your code changes, the hash changes, the old cached version is deleted, and the new one is downloaded.

```
Built assets:
app-a1b2c3d4.js → cached as app-a1b2c3d4.js
app-x9y8z7w6.js → replaces app-a1b2c3d4.js on update
```

### Cache First

Return cached assets immediately. Check the network in the background (useful for static assets that rarely change).

```javascript
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

registerRoute(
  ({ url }) => url.pathname.startsWith('/images/'),
  new CacheFirst({
    cacheName: 'images-v1',
    plugins: [
      {
        handlerDidError: async () => {
          return caches.match('/fallback-image.png');
        }
      }
    ]
  })
);
```

**When to use**: Static assets (images, fonts, old blog posts). Not user-specific data.

**Limits**: Set `maxAgeSeconds` and `maxEntries` to prevent unbounded growth:

```javascript
new CacheFirst({
  cacheName: 'images-v1',
  plugins: [
    new ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
    })
  ]
})
```

### Network First

Fetch from network first. Fall back to cache if offline or timeout.

```javascript
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-v1',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60 // 5 minutes
      })
    ]
  })
);
```

**When to use**: API endpoints, user data, anything that needs fresh data but should work offline.

**Why networkTimeoutSeconds?** Without it, a slow network hangs the user. 3 seconds is a good default—after that, serve from cache.

### Stale-While-Revalidate

Serve cached response immediately, fetch fresh data in the background, update cache.

```javascript
import { StaleWhileRevalidate } from 'workbox-strategies';

registerRoute(
  ({ url }) => url.hostname === 'api.example.com',
  new StaleWhileRevalidate({
    cacheName: 'api-stale-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50
      })
    ]
  })
);
```

**Why it's great**: Users see content instantly (from cache). New content arrives in the background. No timeouts. No blank screens.

### Network Only

Never cache. Useful for login, payments, sensitive transactions.

```javascript
registerRoute(
  ({ url }) => url.pathname === '/login' || url.pathname === '/checkout',
  new NetworkOnly({
    networkTimeoutSeconds: 5
  })
);
```

### Cache Only

Useful for precached assets only. This is typically automated by precaching.

```javascript
new CacheOnly({
  cacheName: 'precached-v1'
})
```

## 5. Routing (workbox-routing)

Routes match incoming requests to strategies.

```javascript
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';

// Route by regex
registerRoute(
  /\.(?:png|jpg|jpeg|svg)$/,
  new CacheFirst({ cacheName: 'images-v1' })
);

// Route by callback
registerRoute(
  ({ request, url }) => {
    return url.pathname.startsWith('/api/') && request.method === 'GET';
  },
  new NetworkFirst({ cacheName: 'api-v1' })
);

// Route all navigation requests (HTML)
registerRoute(
  new NavigationRoute(new NetworkFirst({ cacheName: 'html-v1' }), {
    allowlist: [/^(?!.*\.js$|.*\.css$|.*\.woff2?$)/] // Everything except assets
  })
);
```

## 6. The Offline Fallback

When the network is down and nothing is cached, show a meaningful offline page.

```javascript
// src/sw.js
import { registerRoute, NavigationRoute, setCatchHandler } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { precacheAndRoute, matchPrecache } from 'workbox-precaching';

// Precache the offline page so it's always available
precacheAndRoute(self.__WB_MANIFEST);

// Handle navigation requests with NetworkFirst
const navigationStrategy = new NetworkFirst({
  cacheName: 'html-v1',
  networkTimeoutSeconds: 3
});

registerRoute(new NavigationRoute(navigationStrategy));

// Global catch handler — fires when ANY strategy fails
setCatchHandler(async ({ event }) => {
  if (event.request.destination === 'document') {
    return matchPrecache('/offline.html');
  }
  return Response.error();
});
```

Create `/public/offline.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Offline</title>
  <style>
    body {
      font-family: sans-serif;
      text-align: center;
      padding: 2em;
    }
    h1 { color: #333; }
    p { color: #666; }
  </style>
</head>
<body>
  <h1>You're offline</h1>
  <p>Check your internet connection and refresh the page.</p>
</body>
</html>
```

### Preloading Offline Fallback

Ensure offline.html is cached before users ever go offline:

```javascript
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { warmStrategyCache } from 'workbox-recipes';
import { CacheFirst } from 'workbox-strategies';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Warm the cache with offline fallback
warmStrategyCache({
  urls: ['/offline.html'],
  strategy: new CacheFirst({ cacheName: 'offlinePages' })
});
```

## 7. App Shell Architecture

The **app shell** is the minimal HTML + CSS + JS needed to render your app. Precache it. Lazy-load page content.

```javascript
// src/sw.js
precacheAndRoute([
  // App shell
  { url: '/index.html', revision: null },
  { url: '/styles.css', revision: null },
  { url: '/app.js', revision: null },
  // Not precached: user-generated content, API responses
]);
```

In your app, load pages dynamically:

```javascript
// pages/dashboard.js (lazy-loaded)
export async function loadDashboard() {
  const response = await fetch('/api/dashboard');
  return response.json();
}
```

This architecture means:
- App shell loads instantly (from cache)
- Page content loads fresh (from API)
- Offline, the shell renders but content is missing (graceful degradation)

## 8. Background Sync API

Replay failed requests when the connection returns. Use Workbox's `Queue`:

```javascript
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/save'),
  new NetworkFirst({
    cacheName: 'api-v1',
    plugins: [
      new BackgroundSyncPlugin('api-queue', {
        maxRetentionTime: 24 * 60 // 24 hours
      })
    ]
  })
);
```

When a request fails:
1. SW stores it in IndexedDB
2. User goes offline, clicks "Save"
3. Request queued
4. When connection returns, queue replays all requests
5. Success notifications show which items synced

## 9. Periodic Background Sync

Sync data periodically, even when the app isn't open. Requires user engagement first.

```javascript
// In your app
async function registerPeriodicSync() {
  if ('serviceWorker' in navigator && 'PeriodicSyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    try {
      await reg.periodicSync.register('update-notifications', {
        minInterval: 24 * 60 * 60 * 1000 // Daily
      });
    } catch (err) {
      console.log('Periodic sync registration failed:', err);
    }
  }
}

registerPeriodicSync();
```

In the service worker:

```javascript
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-notifications') {
    event.waitUntil(
      fetch('/api/notifications')
        .then((res) => res.json())
        .then((data) => {
          // Update cache, show badge, etc.
          self.registration.showNotification('New messages', {
            badge: '/badge-icon.png'
          });
        })
    );
  }
});
```

## 10. Navigation Preload

Reduce time-to-interactive by preloading the navigation request while the service worker starts up.

```javascript
// src/sw.js
const ENABLE_PRELOAD = true;

self.addEventListener('activate', (event) => {
  if (ENABLE_PRELOAD) {
    event.waitUntil(self.registration.navigationPreload.enable());
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      event.preloadResponse
        .then((response) => response || fetch(event.request))
        .catch(() => caches.match('/offline.html'))
    );
  }
});
```

Navigation preload shaves 100-300ms off first paint on some networks by parallelizing service worker startup with the HTML request.

## 11. Service Worker Update Strategies

### The Safe Default

Let Workbox handle it. Set `registerType: 'autoUpdate'` in vite-plugin-pwa. The new SW waits; updates happen on next visit.

```javascript
// vite.config.js
VitePWA({
  registerType: 'autoUpdate'
})
```

Users always get the latest code within one page visit. Zero breaking changes.

### Immediate Activation (skipWaiting + clientsClaim)

Activate the new SW immediately. Use this only when you're confident the update is safe.

```javascript
// src/sw.js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
```

**When it's safe**: Bug fixes, feature additions that don't touch data formats.

**When it breaks things**: Cache schema changes, API response structure changes. A user with the old code might make a request; the new SW returns incompatible data.

### User-Prompted Updates

Show a "new version available" notification. Users decide when to reload.

```javascript
// main.js
let refreshing = false;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  navigator.serviceWorker.register('/sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New SW is waiting; show UI
          showUpdatePrompt(() => {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          });
        }
      });
    });
  });
}

// src/sw.js
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

## 12. Cache Management

Name caches with versions. Clean up old ones.

```javascript
const CACHE_NAMES = {
  assets: 'assets-v2',
  api: 'api-v1',
  pages: 'pages-v1'
};

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!Object.values(CACHE_NAMES).includes(name)) {
            return caches.delete(name);
          }
        })
      );
    })
  );
});
```

Monitor storage quota:

```javascript
if ('storage' in navigator && 'estimate' in navigator.storage) {
  navigator.storage.estimate().then(({ usage, quota }) => {
    const percent = (usage / quota) * 100;
    console.log(`Cache usage: ${percent.toFixed(1)}% of ${Math.round(quota / 1024 / 1024)}MB`);
  });
}
```

## 13. Debugging

### Chrome DevTools

Open DevTools → Application tab:
- **Service Workers**: See registration status, lifecycle, active/waiting workers
- **Cache Storage**: Inspect cached responses, delete caches
- **Clear Site Data**: Reset everything for a clean test

Simulate offline: DevTools → Network → Offline checkbox. Your app should still work.

### Workbox Debug Logging

```javascript
// Enable before importing Workbox
import * as Sentry from '@sentry/browser'; // Or your logger
import { setDefaultHandler } from 'workbox-core';

setDefaultHandler(new NetworkFirst());

if (process.env.NODE_ENV === 'development') {
  // Workbox logs with prefix "Workbox"
  console.log('Workbox mode: development');
}
```

Workbox prefixes logs with `[Workbox]`. Search DevTools console for them.

### Common Gotchas

1. **SW won't activate**: Old SW still controlling pages. Close all tabs, reload.
2. **Stale content forever**: Set `maxAgeSeconds` on all strategies.
3. **Offline.html not cached**: Use `warmStrategyCache()` or include it in `precacheAndRoute()`.
4. **Updates not appearing**: Browser caches the SW file headers. Hard-refresh (Cmd/Ctrl+Shift+R).
5. **Scope too narrow**: Remember, scope must be under the SW file's directory.

---

End of reference. Use this file when you need to explain caching behavior, lifecycle timing, or update strategies to users or when building offline capabilities.
