# Platform-Specific PWA Quirks & Workarounds

This is a deep reference for platform-specific behavior. Use this when debugging installation, capabilities, or user experience issues across iOS, Android, desktop, and Firefox.

---

## 1. Cross-Platform Feature Support Matrix

| Feature | Chrome Android | Chrome Desktop | Safari iOS | Safari macOS | Edge | Firefox |
|---------|---|---|---|---|---|---|
| Manifest (basic) | ✅ | ✅ | ⚠️ (minimal) | ⚠️ (minimal) | ✅ | ✅ |
| Manifest (theme_color) | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Manifest (categories) | ✅ | ✅ | ❌ | ❌ | ✅ | ⚠️ |
| Service Workers | ✅ | ✅ | ✅ (iOS 11.3+) | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ✅ | ⚠️ (iOS 16.4+, installed only) | ✅ (macOS 13+) | ✅ | ✅ |
| Background Sync | ✅ | ✅ | ❌ | ❌ | ✅ | ⚠️ |
| File Handling | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Protocol Handlers | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Web Badging API | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Share Target | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Window Controls Overlay | ⚠️ | ✅ | ❌ | ❌ | ✅ | ❌ |

**Key Insight**: iOS/Safari is the IE6 of PWAs. Build for Chrome first, then strip down gracefully for Safari. Don't gate core functionality on these advanced features.

---

## 2. iOS/Safari Deep Dive

### Why This Matters
iOS users make up ~25-30% of web traffic. Safari's implementation is *not* a full PWA platform—it's a web app container. Installation doesn't use Web App Manifest; it uses meta tags. Expect limitations.

### Required Meta Tags

```html
<!-- iOS web app mode - REQUIRED for standalone experience -->
<meta name="apple-mobile-web-app-capable" content="yes">

<!-- Status bar color and style -->
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

<!-- App name (shown on home screen) - truncated at ~20 chars -->
<meta name="apple-mobile-web-app-title" content="MyApp">

<!-- Home screen icon - 180x180 PNG, precomposed (no shine) -->
<link rel="apple-touch-icon" href="/icon-180.png">

<!-- Startup splash screen (see below) -->
<link rel="apple-touch-startup-image" href="/splash-1125x2436.png">
```

**Why precomposed?** Without it, iOS adds a glossy overlay. Set `precomposed` in older syntax or just use standard `apple-touch-icon`.

### Status Bar Styles (What Actually Happens)

- `default`: Light background, dark text. On notched devices, text sits *behind* notch.
- `black`: Dark background, light text. Safe but looks dated.
- `black-translucent`: Transparent, blurs your content behind status bar. Fullscreen feel but content overlap risk.

**Practical**: Use `black-translucent` for immersive experiences (games, maps). Use `default` for content apps. Test on actual devices—simulator doesn't show notch behavior accurately.

### Splash Screens

iOS 15+ ignores the deprecated `apple-touch-startup-image` meta tag. Instead:

```html
<!-- Pre-iOS 15: Still works, but awkward to maintain multiple resolutions -->
<link rel="apple-touch-startup-image"
      media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)"
      href="/splash-1284x2778.png">

<!-- iOS 15+: Uses PWA splash screen approach -->
<!-- Manifest display: "standalone" triggers native splash via icon + background-color -->
```

**Real Solution**: Use `pwa-asset-generator` (npm) to auto-generate all sizes. It creates:
- 9+ splash screen images for different devices
- Touch icons
- Manifest entries

Command: `pwa-asset-generator icon.svg ./assets --splash-only --quality 100`

Alternatively, let the system generate splash from your icon + background color. It's less pretty but **requires no meta tag maintenance**.

### Storage Eviction on iOS

Safari has aggressive quota limits:

- **Storage**: ~50 MB per domain in default mode
- **In full-screen mode**: Slightly higher, ~1 GB reported but inconsistent
- **Eviction**: LRU (least recently used) across *all* origins if quota exceeded

```javascript
// Check persistent storage eligibility
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then(persistent => {
    if (persistent) {
      console.log('Storage is persistent, won\'t be evicted');
    } else {
      console.log('Storage is temporary, may be evicted');
    }
  });
}
```

**Problem**: Even after `persist()`, Safari still evicts if device runs low on disk. Plan for re-download.

**Practical limit**: Cache ~20-30 MB of critical assets. Lazy-load everything else. IndexedDB and Cache API count toward the same quota.

### Service Worker Limitations on iOS

iOS service workers can be **terminated at any time**:
- User closes Safari tab = SW might terminate
- Low memory = SW terminates
- App backgrounded for >10 minutes = SW may not wake
- No way to detect this programmatically

**Re-registration pattern** (safer):

```javascript
// Register on every load, not just once
navigator.serviceWorker.register('/sw.js', {
  scope: '/'
}).then(reg => {
  if (reg.installing) {
    // New SW found, let it install
    console.log('SW installing');
  }
});
```

**Why?** If the SW died, re-registering brings it back. Doesn't hurt if it's already running.

**Don't rely on**:
- Background fetch (doesn't exist)
- Scheduled background sync (doesn't exist)
- `skipWaiting` + `clients.claim()` for immediate updates (can cause issues)

### Push Notifications on iOS (16.4+)

Web Push works on iOS 16.4+ and macOS 13+, but with important constraints:

- **Must be installed**: Push only works for home screen web apps, not Safari browser tabs
- **Manual install required**: No `beforeinstallprompt` on iOS — users must manually "Add to Home Screen"
- **User gesture required**: Permission request must be triggered by a user tap/click
- **Delivery can be inconsistent**: Some developers report occasional missed notifications — implement monitoring
- Uses standard Push API and VAPID keys (same code as Chrome)

```javascript
// Request permission after user tap on iOS
button.addEventListener('click', async () => {
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey
    });
    // Send subscription to server
  }
});
```

**Key limitation**: Users who don't install the PWA can never receive push notifications on iOS. Design your install flow with this in mind — push is a strong incentive for installation.

### Navigation Quirks

**No back gesture in standalone mode**. The Safari gesture ui is hidden in full-screen PWA mode.

```javascript
// On iOS standalone, listen for back behavior
window.addEventListener('popstate', (e) => {
  // User pressed hardware back (Android) or accessed history
  console.log('Navigation back detected');
});

// Manually handle back by updating history
history.pushState({ page: 1 }, "title", "/page1");
history.back(); // User can't swipe to go back in standalone
```

**Better approach**: Add your own back button in the UI. Users on iOS don't have the swipe gesture available.

---

## 3. Android-Specific

### Trusted Web Activity (TWA)

Wraps your PWA in native Android app shell for Play Store distribution.

**Why use it?**
- Play Store presence
- App icon on home screen
- Billing integration (Google Play Billing)
- Native app distribution benefits

**What happens**: `androidx.browser.customtabs.CustomTabsClient` opens your PWA in a Chromium-based wrapper. Transparent to the user.

**Setup**: Use `bubblewrap` (npm) to scaffold:
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest /path/to/manifest.json
bubblewrap build
```

### Adaptive Icons & Maskable Safe Zone

Android 8+ uses "adaptive icons"—your icon is masked to a circle/rounded shape that adapts.

```json
{
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-192-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

**Maskable safe zone**: The safe area is the inner ~80% of the icon (a centered circle with radius 40% of the icon width). Content outside this zone can be clipped by adaptive icon masks. Keep logos and text inside the safe zone.

**Visual**: The outer ~20% per side is sacrificial. Use a solid background color or gradient there — never critical branding.

### WebAPK

When you "Install" a PWA on Chrome Android, Chrome creates a WebAPK—a .apk that wraps your PWA.

- Signed by Google
- Installed like a native app
- Updates via Play API
- Users see it in app drawer

**Automatic**: Happens when manifest is valid and user installs.

**Requirements for WebAPK**:
- Valid manifest.json with icons, display: "standalone"
- 192x192 icon minimum
- Start URL must match scope
- HTTPS only
- Service worker with fetch handler

### Ambient Badging & Mini-infobar

Chrome shows a mini-infobar when PWA criteria met: "This site has an app. Install?"

- Non-intrusive
- Dismissible
- Builds over time (multiple visits = more prominent)

**Disable with**:
```json
{
  "display": "minimal-ui"
}
```

But this reduces the experience. Better to just accept it or design for it.

---

## 4. Desktop-Specific (Chrome/Edge)

### Window Controls Overlay

Allows your app to draw into the title bar area on desktop.

```json
{
  "display": "window-controls-overlay",
  "display_override": ["window-controls-overlay", "standalone"]
}
```

In CSS, use `env()` variables to avoid drawing under controls:

```css
body {
  padding-top: env(titlebar-area-height, 40px);
  margin-left: env(titlebar-area-x, 0);
  margin-top: env(titlebar-area-y, 0);
}
```

**When to use**: Desktop productivity apps. Gives extra screen real estate.

### Run on Login & App Shortcuts

```json
{
  "shortcuts": [
    {
      "name": "New Document",
      "short_name": "New Doc",
      "description": "Create a new document",
      "url": "/new-document?source=shortcut",
      "icons": [{ "src": "/icon-192.png", "sizes": "192x192" }]
    }
  ]
}
```

Shortcuts appear in OS context menus and Start menu (Windows).

**Run on login**: Not directly specifiable in manifest. Users can set it in OS settings once installed.

### Tabbed Application Mode (Experimental)

Chrome/Edge have experimented with tabbed display modes for PWAs. This is still evolving and requires `display_override`:

```json
{
  "display_override": ["tabbed", "standalone"]
}
```

Opens multiple instances in tabs within a single window, similar to VS Code. This is an experimental feature — check current browser support before relying on it.

### File Handling

Register to open file types:

```json
{
  "file_handlers": [
    {
      "action": "/open-file",
      "accept": {
        "text/plain": [".txt"],
        "application/json": [".json"]
      },
      "icons": [{ "src": "/txt-icon.png", "sizes": "256x256" }]
    }
  ]
}
```

When user opens `.txt` file, your app launches with `?url=[blob-url]`. Retrieve with:

```javascript
window.launchQueue.setConsumer((launchParams) => {
  launchParams.files.forEach(fileHandle => {
    fileHandle.getFile().then(file => {
      // Handle file
    });
  });
});
```

**Limitation**: Only works on Chrome/Edge desktop. Not on Android, macOS, or iOS.

---

## 5. Firefox

### Current Status

**Desktop**: Service workers work. Manifest support partial. No file handling, no badging, no protocol handlers.

**Mobile (Android)**: Service workers work. Manifest partial. Push notifications work but limited testing across devices.

**macOS**: No PWA install option in address bar. Service workers work but hidden.

### What Works

- Service Worker registration and caching
- Offline functionality (Cache API)
- Push notifications (Android only)
- Basic manifest reading for home screen shortcut

### What Doesn't

- Display modes (minimal-ui, window-controls-overlay)
- File handling
- Protocol handlers
- App shortcuts
- Badge API
- Most manifest fields beyond basics

**Practical**: Treat Firefox like a fallback. Core functionality works (offline, basic caching). Advanced features degrade gracefully.

---

## 6. Performance Considerations by Platform

### Core Web Vitals Impact

Service workers **can hurt CLS and LCP** if:
- SW loads large assets in `activate` event
- Caching strategy is too aggressive (stale content)
- `skipWaiting` + `clients.claim()` causes layout shifts

**Best practice**:
- Stagger cache updates
- Use `claim()` carefully; test layout impact
- Measure INP before claiming responsibility for all client navigations

### CSP for PWAs

Recommended headers:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:
```

**Why `unsafe-inline` for styles?** Inline styles in the DOM (from frameworks like Vue) are necessary. Use nonces or hashes if you need stricter CSP.

**Service-Worker-Allowed header** (IMPORTANT):

```
Service-Worker-Allowed: /
```

Allows the SW to claim full origin scope. Without it, SW scope is limited to its own directory.

### Permissions Policy

Control which APIs are allowed:

```
Permissions-Policy:
  accelerometer=(),
  camera=(),
  microphone=(self),
  geolocation=(self "https://trusted-partner.com")
```

**For PWAs**: Usually allow most on self. Restrict cross-origin access.

### HTTPS + HSTS

- **HTTPS**: Required for Service Workers. No exceptions.
- **HSTS**: Highly recommended. Prevents downgrade attacks.

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

Enables HSTS preload list inclusion (browsers enforce HTTPS by default).

---

## 7. Common Cross-Platform Pitfalls

### Scope Misconfiguration

**Problem**: Service worker scope doesn't match your actual app paths.

```javascript
// WRONG: SW is at /sw.js with scope: '/app/'
// SW won't cache /index.html at root

navigator.serviceWorker.register('/sw.js', {
  scope: '/' // Must match where your app lives
});
```

**Fix**: Service worker location should be at root or use `Service-Worker-Allowed` header.

### Missing Offline Fallback

Users expect PWAs to work offline. Blank pages destroy trust.

```javascript
// In SW fetch event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).catch(() => {
      return caches.match('/offline.html'); // Fallback
    })
  );
});
```

### Ignoring Storage Quotas

iOS: ~50 MB
Android: Varies, often 50 MB - 1 GB
Desktop: Varies, often 10 GB+

Cache responsibly. Check quota:

```javascript
navigator.storage.estimate().then(({ usage, quota }) => {
  console.log(`Using ${usage} of ${quota} bytes`);
});
```

### Not Testing on Actual Devices

DevTools simulation ≠ reality. Test on:
- Real iPhone (notch behavior, storage limits, SW behavior)
- Real Android (WebAPK generation, adaptive icons)
- Actual poor network (throttle in DevTools)

### Assuming Chrome Behavior is Universal

Chrome supports 90% of PWA features. **Don't assume others do.**

Build feature detection:

```javascript
if ('serviceWorker' in navigator) { /* Use SW */ }
if ('PushManager' in window) { /* Enable push */ }
if ('launchQueue' in window) { /* File handling */ }
```

### Over-Caching Without Invalidation

`cache.addAll()` on every visit = bloated cache.

```javascript
// WRONG: Adds to cache every visit
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.open('v1').then(cache => {
      cache.addAll(['/index.html', '/app.js']); // Every activation!
    })
  );
});

// RIGHT: Only add during install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('v1').then(cache => {
      cache.addAll(['/index.html', '/app.js']);
    })
  );
});
```

### Lazy-Load + skipWaiting Conflicts

If you lazy-load routes and a new SW activates mid-session, old chunks aren't cached.

```javascript
// Risky: User loads route A, then new SW activates, then they navigate to route B
// Route B chunk may not exist in new cache version

// Better: Use versioned cache names or avoid skipWaiting if lazy-loading
```

**Solution**: Update cache version, or don't use `skipWaiting` with lazy routes.

---

## Decision Tree for Platform Support

1. **Does it work on iOS/Safari?** → No? Feature-detect and provide fallback.
2. **Does it work on Android Chrome?** → No? Still useful (covers 50%+ of PWA traffic).
3. **Does it work on desktop?** → No? Desktop users likely use native apps anyway.
4. **Test on 2 devices minimum**: One iOS, one Android.

---

**Last Updated**: Feb 2026. Recheck iOS/Safari docs annually—Apple adds features grudgingly but consistently.
