# PWA Manifest and Advanced APIs Reference

This is a deep reference for developers implementing production PWA features. Each section explains the "why" behind manifest choices and provides practical implementation patterns.

## 1. Complete Manifest Field Reference

Your `manifest.json` is the PWA's contract with the OS. Every field affects how browsers and systems treat your app.

### Core Identity Fields

**`name` & `short_name`** (required)
- `name`: Full app name (max ~30 chars for display, use for app stores)
- `short_name`: Max ~12 chars, used on home screen when space is tight
- Why: Users see these labels first; clarity matters for discoverability
- **When to use different names**: Use `short_name` for abbreviated versions only if your full name is 15+ chars

```json
{
  "name": "TaskFlow - Collaborative Project Management",
  "short_name": "TaskFlow"
}
```

**`description`**
- Shown in app stores and install prompts. Max ~150 chars.
- Should explain the value proposition, not just describe functionality

```json
{
  "description": "Plan, track, and collaborate on projects in real-time with your team"
}
```

**`id`** (Recommended)
- A stable identity string for your app, taking the form of a URL that resolves against your `start_url` origin
- If omitted, browsers derive one from `start_url`, which can break if you reorganize URLs
- Why: Explicitly set `id` so browser installations persist correctly even if you change `start_url` or move the manifest
- Can be a simple path like `"/"` or a more specific identifier like `"/app"`

```json
{
  "id": "/",
  "start_url": "/app/dashboard"
}
```

### Display & Theme Fields

**`start_url`** (highly recommended)
- URL user lands on when opening the app from home screen
- Should be a valid path on your origin, typically `/app` or `/`
- Relative URLs are resolved against manifest URL
- Why: Controls the entry point; crucial for analytics (add `?utm_source=pwa`)

```json
{
  "start_url": "/app/?utm_source=pwa&utm_medium=homescreen"
}
```

**`display`**
- Controls how the app appears when installed
- Options: `fullscreen`, `standalone`, `minimal-ui`, `browser`
- **Why each matters**:
  - `fullscreen`: No browser chrome at all. For games/immersive experiences. Rarely what users expect.
  - `standalone`: Hidden address bar, no tabs. **Best for most PWAs**. Feels native.
  - `minimal-ui`: Shows address bar + back button. Hybrid between app and browser.
  - `browser`: Opens in a browser tab. Useful if you want PWA caching benefits without app UI.

```json
{
  "display": "standalone"
}
```

**`display_override`** (Advanced)
- Preference list: `["window-controls-overlay", "standalone", "browser"]`
- Browsers use first option they support
- `window-controls-overlay`: Overlays title bar controls; enables custom title bar via CSS (see section 10)

```json
{
  "display_override": ["window-controls-overlay", "standalone"]
}
```

**`theme_color`** & **`background_color`**
- `theme_color`: Used for address bar, tab color, splash screen
- `background_color`: Splash screen background while app loads
- Both are CSS color values (hex, rgb, color names)
- Why: Greets users with your brand immediately on launch

```json
{
  "theme_color": "#2563eb",
  "background_color": "#ffffff"
}
```

**`orientation`**
- Lock app to portrait, landscape, or allow both
- Values: `any`, `natural`, `landscape`, `landscape-primary`, `landscape-secondary`, `portrait`, `portrait-primary`, `portrait-secondary`
- Why: Some apps (games, video) need orientation lock. Others need flexibility.

```json
{
  "orientation": "portrait-primary"
}
```

**`dir`** & **`lang`**
- `dir`: Text direction (ltr, rtl, auto)
- `lang`: BCP 47 language tag (e.g., "en-US")
- Why: Affects manifest field interpretation; important for RTL languages

```json
{
  "lang": "en-US",
  "dir": "ltr"
}
```

**`scope`**
- Which URLs are "part of" this app for navigation purposes
- User navigates within scope = stay in app. Navigate outside = open in browser.
- Relative to manifest location
- Why: Prevents app from capturing external links and confusing users

```json
{
  "scope": "/app/",
  "start_url": "/app/home"
}
```

### Scope Behavior Example
- Manifest at `/manifest.json`, scope `/app/`
- User clicks link to `/app/profile` → stays in app
- User clicks link to `/blog` → opens in browser
- Essential for trust and UX

## 2. Icon Strategy

Icons are your PWA's visual identity. You need multiple formats for different contexts.

### Sizes Strategy

**Why so many sizes?**
- Home screen: 192px, 384px (high-DPI)
- Splash screens: 512px
- Browser tabs, favicons: 16px, 32px, 48px
- Windows Start menu: varies; 256px safe minimum

```json
{
  "icons": [
    {
      "src": "/images/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/images/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/images/icon-192-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

**Mandatory sizes:**
- `192x192` (minimum for home screen)
- `512x512` (for splash screens and large contexts)
- **Both as `any` purpose** for fallback display

### Maskable Icons

**What:** Icons with safe zone (80% inner circle) that adapt to OS-specific shapes (rounded squares, circles, tear drops).

**Why:** Modern Android applies dynamic shapes. Maskable ensures your icon looks intentional, not cropped.

**How to create:**
- Design with 192x192px canvas
- Keep important elements in center 80% (≤77px from center)
- Outer ring can extend to edges
- Export as separate file with `"purpose": "maskable"`

```json
{
  "src": "/images/icon-maskable.png",
  "sizes": "192x192",
  "type": "image/png",
  "purpose": "maskable"
}
```

### iOS apple-touch-icon

iOS **ignores** the manifest. Add to HTML `<head>`:

```html
<!-- iOS: 180x180 for home screen icon -->
<link rel="apple-touch-icon" href="/images/apple-touch-icon-180.png">
<!-- Prevents URL bar on launch -->
<meta name="apple-mobile-web-app-capable" content="yes">
<!-- Sets status bar color -->
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

**Why separate:** iOS had no manifest concept until recently; this is legacy but necessary for reliable iOS home screen support.

### Favicon

Include both manifest icons AND favicon for full browser coverage:

```html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
```

**Why both:** Manifest icons are for installed app context; favicon is for browser tabs and legacy systems.

## 3. Screenshots

Screenshots shown in app install dialogs and app stores. They drive install conversion.

```json
{
  "screenshots": [
    {
      "src": "/images/screenshot-desktop-1.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Task board view"
    },
    {
      "src": "/images/screenshot-mobile-1.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Create new task"
    }
  ]
}
```

**Fields:**
- `src`: Path to screenshot image
- `sizes`: Exact dimensions (width x height)
- `form_factor`: `"wide"` (desktop) or `"narrow"` (mobile)
- `label`: Accessibility alt text + app store description

**Why it matters:**
- Narrow form factor on mobile triggers the "Add to Home Screen" prompt
- Desktop screenshots shown to desktop users
- Good screenshots increase install rate by 30%+

**Best practices:**
- Show core features, not splash screens
- Use realistic data
- Include text overlays explaining what user sees
- Minimum 2 screenshots; 3-5 optimal

## 4. Shortcuts

Quick launch points for common app actions. Shown in app context menu (long-press on desktop, right-click on mobile).

```json
{
  "shortcuts": [
    {
      "name": "Create New Task",
      "short_name": "New Task",
      "description": "Jump directly to new task creation",
      "url": "/app/task/new?utm_source=shortcut",
      "icons": [
        {
          "src": "/images/shortcut-new-task-192.png",
          "sizes": "192x192",
          "type": "image/png"
        }
      ]
    },
    {
      "name": "View My Board",
      "short_name": "My Board",
      "url": "/app/board/mine",
      "icons": [
        {
          "src": "/images/shortcut-board-192.png",
          "sizes": "192x192"
        }
      ]
    }
  ]
}
```

**Fields:**
- `name`: Full shortcut name
- `short_name`: Abbreviated (12 chars max)
- `description`: What the shortcut does (accessibility + metadata)
- `url`: Path opened when user taps shortcut
- `icons`: At least 192x192 (maskable recommended)

**Why use shortcuts:**
- Reduce friction for common tasks
- Increase app engagement by 20%+
- Show power users there's depth to your app

**URL pattern tip:** Add `?utm_source=shortcut&utm_action=name` for analytics.

## 5. Share Target API

Let users share content FROM other apps INTO your PWA.

### Manifest Configuration

```json
{
  "share_target": {
    "action": "/app/share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url",
      "files": [
        {
          "name": "media",
          "accept": ["image/*", "video/*"]
        }
      ]
    }
  }
}
```

**Fields:**
- `action`: URL your service worker POSTs shared data to
- `method`: Usually `POST` (for file uploads)
- `enctype`: `application/x-www-form-urlencoded` for text; `multipart/form-data` for files
- `params`: Map manifest param names to HTML form field names
- `files`: Arrays of file types accepted

**Key insight:** When user shares, browser POSTs form data to your action URL.

### Service Worker Handler

```javascript
// In your service worker registration
self.addEventListener('message', (event) => {
  if (event.data.type === 'SHARE_TARGET') {
    const { title, text, url, files } = event.data;
    // Handle shared content
    fetch('/api/save-share', {
      method: 'POST',
      body: JSON.stringify({ title, text, url }),
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

Actually, Share Target data arrives via **form submission** to your action URL. Handle it server-side or in your app's fetch handler:

```javascript
// In your service worker fetch handler
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/app/share') && event.request.method === 'POST') {
    event.respondWith(
      event.request.formData().then((formData) => {
        const title = formData.get('title');
        const text = formData.get('text');
        const url = formData.get('url');
        const files = formData.getAll('media');

        // Store or process shared data
        return Response.redirect('/app?shared=true', 303);
      })
    );
  }
});
```

**Why it matters:** Makes your PWA a first-class target in the OS share sheet. Users discover your app through sharing workflows.

## 6. Web Share API

Let users share content FROM your PWA to other apps.

**Why:** Native sharing feels right; respects user's favorite apps.

### Feature Detection & Basic Usage

```javascript
if (navigator.share) {
  document.getElementById('share-btn').addEventListener('click', async () => {
    try {
      await navigator.share({
        title: 'Check out my task',
        text: 'I completed this important project',
        url: window.location.href
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    }
  });
} else {
  // Fallback: copy link to clipboard or show custom UI
  document.getElementById('share-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href);
  });
}
```

### File Sharing

```javascript
if (navigator.canShare && navigator.canShare({ files: [new File([], 'test')] })) {
  document.getElementById('share-file-btn').addEventListener('click', async () => {
    const canvas = document.getElementById('my-canvas');
    const blob = await new Promise(resolve => canvas.toBlob(resolve));
    const file = new File([blob], 'my-artwork.png', { type: 'image/png' });

    try {
      await navigator.share({
        files: [file],
        title: 'My Artwork'
      });
    } catch (err) {
      if (err.name !== 'AbortError') console.error(err);
    }
  });
}
```

**Why check `canShare()`:** Different platforms support different share types. Always validate before attempting.

## 7. File Handling API

Register your PWA to open specific file types.

### Manifest Configuration

```json
{
  "file_handlers": [
    {
      "action": "/app/editor",
      "accept": {
        "text/markdown": [".md", ".markdown"],
        "text/plain": [".txt"]
      },
      "icons": [
        {
          "src": "/images/file-handler-192.png",
          "sizes": "192x192"
        }
      ],
      "launch_type": "single-client"
    }
  ]
}
```

**Fields:**
- `action`: URL to open files
- `accept`: MIME type → file extensions mapping
- `icons`: File type icon for OS file picker
- `launch_type`: `"single-client"` (reuse window) or `"multiple-clients"` (new window per file)

### Service Worker launchQueue Handler

```javascript
// In your service worker
if (launchQueue) {
  launchQueue.setConsumer((launchParams) => {
    // launchParams.files is an array of FileSystemFileHandle
    launchParams.files.forEach(async (fileHandle) => {
      try {
        const file = await fileHandle.getFile();
        const content = await file.text();

        // Send to open window or create new one
        const clients = await self.clients.matchAll({ type: 'window' });
        if (clients.length > 0) {
          clients[0].postMessage({
            type: 'FILE_OPENED',
            content: content,
            name: file.name
          });
        }
      } catch (err) {
        console.error('Failed to read file:', err);
      }
    });
  });
}
```

**Why it matters:** File handlers make your app the "default" for file types. Users open `.md` files directly in your editor from file explorer.

## 8. Protocol Handlers

Register your PWA to handle custom URLs (like `mailto:` or custom schemes).

### Manifest Configuration

```json
{
  "protocol_handlers": [
    {
      "protocol": "web+task",
      "url": "/app/protocol?url=%s"
    }
  ]
}
```

**How it works:**
- User clicks `<a href="web+task://123">Open task</a>`
- Browser opens your PWA with URL `/app/protocol?url=web+task://123`
- Your app parses the URL and navigates to the appropriate view

```javascript
// In your app
const params = new URLSearchParams(window.location.search);
const protocolUrl = params.get('url'); // "web+task://123"
const taskId = protocolUrl.replace('web+task://', '');
// Load task with ID 123
```

**Valid protocols:** Must start with `web+` (e.g., `web+task`, `web+notes`, `web+chat`). Prevents hijacking standard protocols.

**Why use it:** Deep linking from external systems. Invoicing apps can link directly to tasks; chat apps can link to conversations.

## 9. Launch Handler

Control how the PWA behaves when launched while already open.

### Manifest Configuration

```json
{
  "launch_handler": {
    "client_mode": "navigate"
  }
}
```

**Options:**
- `"auto"` (default): Browser decides (usually "navigate" on desktop, "auto" on mobile)
- `"navigate"`: Open URL in existing window (replaces current page)
- `"auto-client"`: Reuse existing window if URL is same, else new window
- `"target-existing"`: Switch to existing window if app is open, else new window

**When to use each:**
- **Document editors (Docs, Sheets):** Use `"navigate"` so opening new documents replaces current
- **Chat apps:** Use `"target-existing"` so launching from notification focuses existing window
- **Dashboards:** Use `"auto"` for browser defaults

```json
{
  "launch_handler": {
    "client_mode": "navigate-new"
  }
}
```

(Note: `client_mode` values vary by browser; check current spec for your targets)

## 10. Display Override & Window Controls Overlay

Create custom title bars using `display_override` and CSS environment variables.

### Manifest Configuration

```json
{
  "display_override": ["window-controls-overlay", "standalone"],
  "theme_color": "#2563eb"
}
```

**Why:** On Windows, `window-controls-overlay` lets you draw custom UI behind the minimize/maximize/close buttons, creating seamless app branding.

### CSS Implementation

```css
/* Ensure layout accounts for title bar controls */
body {
  padding-top: max(var(--safe-area-inset-top, 0px), env(titlebar-area-height, 0px));
}

header {
  /* Draw behind title bar */
  position: fixed;
  top: 0;
  left: env(titlebar-area-x, 0);
  width: env(titlebar-area-width, 100vw);
  height: env(titlebar-area-height, 32px);
  background: linear-gradient(to right, #2563eb, #1e40af);
  color: white;
  display: flex;
  align-items: center;
  padding: 0 env(titlebar-area-x, 8px);
  app-region: drag; /* Make draggable; prevents text selection */
}

button {
  app-region: no-drag; /* Allow clicks on buttons */
}
```

**Available env() variables:**
- `titlebar-area-x`, `titlebar-area-y`: Position of controls
- `titlebar-area-width`, `titlebar-area-height`: Size of control area
- Safe area insets (notches, rounded corners)

## 11. Badging API

Display notification badges on app icon (unread count, pending actions).

```javascript
async function updateAppBadge(count) {
  try {
    if (count === 0) {
      await navigator.clearAppBadge();
    } else {
      await navigator.setAppBadge(count);
    }
  } catch (err) {
    console.warn('Badging API not supported:', err);
  }
}

// Usage
updateAppBadge(5); // Shows "5" on home screen icon
updateAppBadge(0); // Clears badge
```

**Why it matters:** Brings users back to your app. Better than notifications because it's non-intrusive (no sound, permission).

**Use cases:**
- Unread messages count
- Pending approvals
- Overdue tasks
- New content available

**Browser support:** Android primary; experimental on other platforms.

## 12. Notifications & Push

Show notifications to users, even when app is closed.

### Permission Flow

```javascript
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}
```

### Service Worker Push Handler

```javascript
// In your service worker
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'New notification';
  const options = {
    body: data.body,
    icon: '/images/icon-192.png',
    badge: '/images/badge-72.png',
    tag: data.tag || 'notification', // Reuse same notification
    requireInteraction: data.requireInteraction || false, // Keep until user closes
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' }
    ],
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if already open
      for (let i = 0; i < clientList.length; i++) {
        if (clientList[i].url === urlToOpen && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
```

### Getting VAPID Keys for Push

VAPID keys authenticate your server to the push service. Generate them:

```bash
# Using web-push CLI
npm install -g web-push
web-push generate-vapid-keys

# Output:
# Public Key: <long base64 string>
# Private Key: <long base64 string>
```

Store the private key securely on your server (environment variable, not in code).

### Subscribing to Push (Client)

```javascript
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;

  // Use your public VAPID key
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
  });

  // Send subscription to your server
  await fetch('/api/subscribe-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription)
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

### Server-Side Push (Node.js Example)

```javascript
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:your@email.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendPushNotification(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    console.error('Push failed:', err);
  }
}

// Usage
sendPushNotification(subscription, {
  title: 'Task assigned to you',
  body: 'John assigned you a new task',
  url: '/app/tasks/123',
  tag: 'task-assignment'
});
```

## 13. Credential Management API

Store and retrieve credentials securely (passwords, federated login).

### Password Credentials

```javascript
// Store password after login
async function storePasswordCredential(username, password) {
  if (!window.PasswordCredential) return;

  const cred = new PasswordCredential({
    id: username,
    password: password,
    name: username,
    iconURL: '/images/avatar.png'
  });

  await navigator.credentials.store(cred);
}

// Retrieve on next visit
async function getStoredCredential() {
  if (!navigator.credentials) return null;

  try {
    const cred = await navigator.credentials.get({ password: true });
    if (cred) {
      // Auto-fill login form
      document.getElementById('username').value = cred.id;
      document.getElementById('password').value = cred.password;
      return cred;
    }
  } catch (err) {
    console.warn('Credential retrieval failed:', err);
  }
}
```

### Federated Credentials (OAuth, SAML)

```javascript
// Store OAuth login info
async function storeFederatedCredential(username, provider, iconURL) {
  if (!window.FederatedCredential) return;

  const cred = new FederatedCredential({
    id: username,
    name: username,
    iconURL: iconURL,
    provider: provider // 'https://accounts.google.com', 'https://login.microsoft.com', etc.
  });

  await navigator.credentials.store(cred);
}

// Retrieve federated credential
async function getFederatedCredential() {
  try {
    const cred = await navigator.credentials.get({
      federated: {
        providers: ['https://accounts.google.com']
      }
    });

    if (cred) {
      // Trigger OAuth login with this provider
      return cred;
    }
  } catch (err) {
    console.warn('Federated credential retrieval failed:', err);
  }
}
```

### WebAuthn Integration

WebAuthn (FIDO2) replaces passwords with biometric/hardware key authentication. Integrate with Credential API:

```javascript
// Register WebAuthn credential
async function registerWebAuthn() {
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: new Uint8Array(32), // From server
      rp: { name: 'TaskFlow' },
      user: {
        id: new Uint8Array(16),
        name: 'user@example.com',
        displayName: 'John Doe'
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }], // ES256
      timeout: 60000,
      attestation: 'direct'
    }
  });

  // Send credential to server for storage
  await fetch('/api/register-webauthn', {
    method: 'POST',
    body: JSON.stringify(credential)
  });
}

// Authenticate with WebAuthn
async function authenticateWebAuthn() {
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: new Uint8Array(32), // From server
      timeout: 60000,
      userVerification: 'preferred'
    }
  });

  // Send assertion to server for verification
  await fetch('/api/verify-webauthn', {
    method: 'POST',
    body: JSON.stringify(assertion)
  });
}
```

**Why WebAuthn:** Phishing-proof. Credentials are cryptographic, not passwords. Hardware keys work on all platforms.

---

## Quick Reference: When to Use Each API

| API | Use When | Impact |
|-----|----------|--------|
| Share Target | App receives shared content | Users share TO your app |
| Web Share | App shares content out | Users share FROM your app |
| File Handlers | App edits specific file types | Opens `.md` files directly in your editor |
| Protocol Handlers | Custom deep linking scheme | `web+task://123` launches app |
| Badging | Show unread/pending count | Non-intrusive engagement driver |
| Push Notifications | Send timely updates | Works even when app is closed |
| WebAuthn | Replace passwords | Phishing-proof authentication |
| Display Override | Custom title bar UI | Windows/Chromebook professional look |

---

## Testing Manifest Changes

Always test after manifest updates:

```javascript
// Verify manifest loaded
navigator.serviceWorker.ready.then((registration) => {
  console.log('Manifest:', registration);
});

// Check icon availability
window.matchMedia('(display-mode: standalone)').matches
  ? console.log('Running as installed app')
  : console.log('Running in browser');

// Test notifications
Notification.requestPermission().then((permission) => {
  if (permission === 'granted') {
    new Notification('Test notification');
  }
});
```

Remember: **Manifest changes require service worker update.** Either bump your service worker version or clear cache after deploying manifest updates.
