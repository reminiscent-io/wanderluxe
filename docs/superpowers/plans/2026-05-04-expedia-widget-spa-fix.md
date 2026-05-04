# Expedia Widget SPA Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken Expedia widget bootstrap on the Booking tab so the search iframe actually renders in our SPA, and the fallback CTA shows when something fails.

**Architecture:** The upstream `eg-widgets.js` script binds rendering to `DOMContentLoaded`, which never fires after initial app boot in a SPA — so the widget div stays empty with no error. We replace the script-bootstrap path entirely: construct the iframe ourselves from the same params, load the upstream CSS for matching styles, and listen for the `eg-widget/resize` `postMessage` from `creator.expediagroup.com` to size the frame. `buildExpediaHotelSearchUrl` / `trackExpediaClick` (used by `PlaceCard`) are untouched.

**Tech Stack:** React 19, TypeScript, Vitest + jsdom, Tailwind. No new deps.

---

## File Structure

- **Modify:** `src/lib/expedia.ts`
  - Remove: `loadExpediaWidgetScript`, `EG_WIDGETS_SRC` const
  - Add: `buildExpediaWidgetIframeUrl(opts)` — pure URL builder
  - Add: `loadExpediaWidgetStyles()` — idempotent CSS link injector returning `Promise<void>`
  - Add: `mountExpediaWidget(opts)` — appends iframe + resize listener; returns cleanup `() => void`
  - Keep: `EXPEDIA_WIDGET_CAMREF`, `EXPEDIA_PARTNERIZE_CAMREF`, `EXPEDIA_FALLBACK_URL`, `buildExpediaHotelSearchUrl`, `trackExpediaClick`

- **Modify:** `src/components/trip/BookingView.tsx`
  - Replace `loadExpediaWidgetScript(widget)` call with `mountExpediaWidget({ container, camref, pubref })`
  - Drop the upstream `data-*` attributes on the widget div (we no longer need them; they were only read by the upstream script)
  - `widgetFailed` now reflects CSS-load failure (real signal)

- **Create:** `src/lib/expedia.test.ts` — unit tests for URL builder, mount DOM behavior, resize handler, cleanup idempotency

---

## Task 1: URL builder (pure)

**Files:**
- Modify: `src/lib/expedia.ts`
- Create: `src/lib/expedia.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/expedia.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildExpediaWidgetIframeUrl } from './expedia';

describe('buildExpediaWidgetIframeUrl', () => {
  it('builds the search-widget URL with all params and instance', () => {
    const url = buildExpediaWidgetIframeUrl({
      widget: 'search',
      program: 'us-expedia',
      lobs: 'stays,flights',
      network: 'pz',
      camref: '1101l5IQx5',
      pubref: 'booking_page_widget',
      instance: 'abc123',
    });
    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://creator.expediagroup.com');
    expect(parsed.pathname).toBe('/products/widgets/search-widget');
    expect(parsed.searchParams.get('program')).toBe('us-expedia');
    expect(parsed.searchParams.get('lobs')).toBe('stays,flights');
    expect(parsed.searchParams.get('network')).toBe('pz');
    expect(parsed.searchParams.get('camref')).toBe('1101l5IQx5');
    expect(parsed.searchParams.get('pubref')).toBe('booking_page_widget');
    expect(parsed.searchParams.get('instance')).toBe('abc123');
  });

  it('omits empty optional params', () => {
    const url = buildExpediaWidgetIframeUrl({
      widget: 'search',
      program: 'us-expedia',
      lobs: '',
      network: 'pz',
      camref: 'x',
      pubref: 'y',
      instance: 'z',
    });
    expect(new URL(url).searchParams.has('lobs')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/expedia.test.ts`
Expected: FAIL with `buildExpediaWidgetIframeUrl is not exported`

- [ ] **Step 3: Add the URL builder to `src/lib/expedia.ts`**

Append (do not yet remove `loadExpediaWidgetScript`):

```ts
const EG_WIDGETS_BASE = 'https://creator.expediagroup.com/products/widgets';

export interface ExpediaWidgetIframeUrlOptions {
  widget: 'search';
  program: string;
  lobs: string;
  network: string;
  camref: string;
  pubref: string;
  instance: string;
}

export function buildExpediaWidgetIframeUrl(
  opts: ExpediaWidgetIframeUrlOptions,
): string {
  const params = new URLSearchParams();
  const entries: Array<[string, string]> = [
    ['program', opts.program],
    ['lobs', opts.lobs],
    ['network', opts.network],
    ['camref', opts.camref],
    ['pubref', opts.pubref],
    ['instance', opts.instance],
  ];
  for (const [k, v] of entries) {
    if (v !== '' && v != null) params.set(k, v);
  }
  return `${EG_WIDGETS_BASE}/${opts.widget}-widget?${params.toString()}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/expedia.test.ts`
Expected: PASS (2 tests)

---

## Task 2: Idempotent CSS loader

**Files:**
- Modify: `src/lib/expedia.ts`
- Modify: `src/lib/expedia.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/expedia.test.ts`:

```ts
import { beforeEach } from 'vitest';
import { loadExpediaWidgetStyles } from './expedia';

describe('loadExpediaWidgetStyles', () => {
  beforeEach(() => {
    document.head.querySelectorAll('link.eg-widgets-style').forEach((n) => n.remove());
  });

  it('injects exactly one stylesheet link, even when called twice', async () => {
    const p1 = loadExpediaWidgetStyles();
    const p2 = loadExpediaWidgetStyles();
    // Resolve the link load synchronously in jsdom by firing onload manually.
    document
      .head
      .querySelectorAll<HTMLLinkElement>('link.eg-widgets-style')
      .forEach((l) => l.dispatchEvent(new Event('load')));
    await Promise.all([p1, p2]);
    const links = document.head.querySelectorAll('link.eg-widgets-style');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('rel')).toBe('stylesheet');
    expect(links[0].getAttribute('href')).toBe(
      'https://creator.expediagroup.com/products/widgets/assets/eg-widgets.css',
    );
  });

  it('rejects when the link errors', async () => {
    const p = loadExpediaWidgetStyles();
    document
      .head
      .querySelector<HTMLLinkElement>('link.eg-widgets-style')!
      .dispatchEvent(new Event('error'));
    await expect(p).rejects.toThrow(/eg-widgets.css/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/expedia.test.ts`
Expected: FAIL — `loadExpediaWidgetStyles is not exported`

- [ ] **Step 3: Implement the loader in `src/lib/expedia.ts`**

Append:

```ts
const EG_WIDGETS_CSS = `${EG_WIDGETS_BASE}/assets/eg-widgets.css`;

let stylesPromise: Promise<void> | null = null;

export function loadExpediaWidgetStyles(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const existing = document.head.querySelector<HTMLLinkElement>(
    'link.eg-widgets-style',
  );
  // Reuse the in-flight/resolved promise only if the link is still in the DOM.
  // (Tests, or external code, may remove the link; in that case we re-create.)
  if (stylesPromise && existing) return stylesPromise;
  // Stale link from a previous failed load — drop it before re-trying.
  if (existing) existing.remove();
  stylesPromise = new Promise<void>((resolve, reject) => {
    const link = document.createElement('link');
    link.className = 'eg-widgets-style';
    link.rel = 'stylesheet';
    link.href = EG_WIDGETS_CSS;
    link.onload = () => resolve();
    link.onerror = () => {
      stylesPromise = null;
      reject(new Error(`Failed to load eg-widgets.css`));
    };
    document.head.appendChild(link);
  });
  return stylesPromise;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/expedia.test.ts`
Expected: PASS (4 tests total)

---

## Task 3: `mountExpediaWidget` — iframe + resize + cleanup

**Files:**
- Modify: `src/lib/expedia.ts`
- Modify: `src/lib/expedia.test.ts`

- [ ] **Step 1: Write the failing test for mount + cleanup**

Append to `src/lib/expedia.test.ts`:

```ts
import { mountExpediaWidget } from './expedia';

describe('mountExpediaWidget', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    document.head.querySelectorAll('link.eg-widgets-style').forEach((n) => n.remove());
  });

  it('appends an iframe to the container with widget URL', async () => {
    const container = document.getElementById('container')!;
    const cleanup = mountExpediaWidget({
      container,
      camref: 'CAM',
      pubref: 'PUB',
    });
    // Resolve CSS load
    document
      .head
      .querySelector<HTMLLinkElement>('link.eg-widgets-style')!
      .dispatchEvent(new Event('load'));
    await Promise.resolve();

    const iframe = container.querySelector('iframe.eg-widget-frame') as HTMLIFrameElement;
    expect(iframe).not.toBeNull();
    const u = new URL(iframe.src);
    expect(u.pathname).toBe('/products/widgets/search-widget');
    expect(u.searchParams.get('camref')).toBe('CAM');
    expect(u.searchParams.get('pubref')).toBe('PUB');
    expect(u.searchParams.get('instance')).toBeTruthy();

    cleanup();
    expect(container.querySelector('iframe.eg-widget-frame')).toBeNull();
  });

  it('resizes the iframe on a valid postMessage', async () => {
    const container = document.getElementById('container')!;
    mountExpediaWidget({ container, camref: 'C', pubref: 'P' });
    document
      .head
      .querySelector<HTMLLinkElement>('link.eg-widgets-style')!
      .dispatchEvent(new Event('load'));
    await Promise.resolve();
    const iframe = container.querySelector('iframe.eg-widget-frame') as HTMLIFrameElement;
    const instance = new URL(iframe.src).searchParams.get('instance')!;

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://creator.expediagroup.com',
        data: {
          type: 'eg-widget/resize',
          meta: { instance },
          payload: { frame: { style: { width: '100%', height: '420px' } } },
        },
      }),
    );

    expect(iframe.style.width).toBe('100%');
    expect(iframe.style.height).toBe('420px');
  });

  it('ignores postMessages from other origins', async () => {
    const container = document.getElementById('container')!;
    mountExpediaWidget({ container, camref: 'C', pubref: 'P' });
    document
      .head
      .querySelector<HTMLLinkElement>('link.eg-widgets-style')!
      .dispatchEvent(new Event('load'));
    await Promise.resolve();
    const iframe = container.querySelector('iframe.eg-widget-frame') as HTMLIFrameElement;
    const instance = new URL(iframe.src).searchParams.get('instance')!;
    const before = iframe.style.height;

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://evil.example',
        data: {
          type: 'eg-widget/resize',
          meta: { instance },
          payload: { frame: { style: { width: '100%', height: '999px' } } },
        },
      }),
    );

    expect(iframe.style.height).toBe(before);
  });

  it('rejects via onError callback when CSS load fails', async () => {
    const container = document.getElementById('container')!;
    const onError = vi.fn();
    mountExpediaWidget({ container, camref: 'C', pubref: 'P', onError });
    document
      .head
      .querySelector<HTMLLinkElement>('link.eg-widgets-style')!
      .dispatchEvent(new Event('error'));
    await new Promise((r) => setTimeout(r, 0));
    expect(onError).toHaveBeenCalled();
  });
});
```

(Add `import { vi } from 'vitest';` at the top of the file if not already there.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/expedia.test.ts`
Expected: FAIL — `mountExpediaWidget is not exported`

- [ ] **Step 3: Implement `mountExpediaWidget` in `src/lib/expedia.ts`**

Append:

```ts
export interface ExpediaWidgetOptions {
  container: HTMLElement;
  camref: string;
  pubref: string;
  widget?: 'search';
  program?: string;
  lobs?: string;
  network?: string;
  onError?: (err: Error) => void;
}

const EG_WIDGETS_ORIGIN = 'https://creator.expediagroup.com';

function generateInstanceId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function mountExpediaWidget(opts: ExpediaWidgetOptions): () => void {
  const {
    container,
    camref,
    pubref,
    widget = 'search',
    program = 'us-expedia',
    lobs = 'stays,flights',
    network = 'pz',
    onError,
  } = opts;

  const instance = generateInstanceId();

  const iframe = document.createElement('iframe');
  iframe.className = `eg-widget-frame eg-${widget}-widget-frame`;
  iframe.src = buildExpediaWidgetIframeUrl({
    widget,
    program,
    lobs,
    network,
    camref,
    pubref,
    instance,
  });
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.margin = 'auto';
  iframe.style.border = 'none';
  container.classList.add('eg-widget', `eg-${widget}-widget`);
  container.appendChild(iframe);

  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== EG_WIDGETS_ORIGIN) return;
    const data = event.data as
      | { type?: string; meta?: { instance?: string }; payload?: { frame?: { style?: { width?: string; height?: string } } } }
      | undefined;
    if (!data || data.type !== 'eg-widget/resize') return;
    if (data.meta?.instance !== instance) return;
    const style = data.payload?.frame?.style;
    if (style?.width) iframe.style.width = style.width;
    if (style?.height) iframe.style.height = style.height;
  };
  window.addEventListener('message', handleMessage);

  loadExpediaWidgetStyles().catch((err) => {
    onError?.(err instanceof Error ? err : new Error(String(err)));
  });

  return () => {
    window.removeEventListener('message', handleMessage);
    iframe.remove();
  };
}
```

- [ ] **Step 4: Run all expedia tests**

Run: `npx vitest run src/lib/expedia.test.ts`
Expected: PASS (8 tests total)

---

## Task 4: Remove the old script bootstrap

**Files:**
- Modify: `src/lib/expedia.ts`

- [ ] **Step 1: Delete the obsolete export**

In `src/lib/expedia.ts`, remove the entire `loadExpediaWidgetScript` function and its `EG_WIDGETS_SRC` constant (lines `38-65` of the current file). Keep all other exports.

- [ ] **Step 2: Verify nothing else references it**

Run: `npx tsc --noEmit`
Expected: errors only in `src/components/trip/BookingView.tsx` (it still imports `loadExpediaWidgetScript`). No other files.

If any other file references `loadExpediaWidgetScript`, STOP and update them — Task 5 only covers `BookingView`.

---

## Task 5: Wire `BookingView` to the new mount function

**Files:**
- Modify: `src/components/trip/BookingView.tsx`

- [ ] **Step 1: Update the import block**

Replace lines 7–12:

```ts
import {
  EXPEDIA_WIDGET_CAMREF,
  EXPEDIA_FALLBACK_URL,
  loadExpediaWidgetScript,
  trackExpediaClick,
} from '@/lib/expedia';
```

with:

```ts
import {
  EXPEDIA_FALLBACK_URL,
  mountExpediaWidget,
  trackExpediaClick,
  EXPEDIA_WIDGET_CAMREF,
} from '@/lib/expedia';
```

- [ ] **Step 2: Replace the widget useEffect**

Replace lines 31–45 (the `useEffect` that calls `loadExpediaWidgetScript`) with:

```tsx
useEffect(() => {
  if (widgetFailed) return;
  const widget = widgetRef.current;
  if (!widget) return;

  const cleanup = mountExpediaWidget({
    container: widget,
    camref: EXPEDIA_WIDGET_CAMREF,
    pubref: 'booking_page_widget',
    onError: () => setWidgetFailed(true),
  });

  const handler = () => trackExpediaClick('booking_page_widget', { trip_id: tripId });
  widget.addEventListener('click', handler);

  return () => {
    widget.removeEventListener('click', handler);
    cleanup();
  };
}, [widgetFailed, tripId]);
```

- [ ] **Step 3: Strip the now-unused `data-*` attributes from the widget div**

Replace lines 117–130 (the `widgetFailed ? … : ( <div className="min-h-[200px]"> … </div> )` block's else branch) with:

```tsx
) : (
  <div className="min-h-[200px]">
    <div ref={widgetRef} />
  </div>
)}
```

(All `data-widget` / `data-program` / `data-lobs` / `data-network` / `data-camref` / `data-pubref` attributes go away — `mountExpediaWidget` reads its config from function args.)

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/lib/expedia.ts src/components/trip/BookingView.tsx`
Expected: clean.

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: all pass.

---

## Task 6: Browser smoke test

**Files:** none modified.

- [ ] **Step 1: Start the dev server**

Run: `npx vite --port 8080` (or `bun run dev` if `bun` is available — `bun` is NOT on PATH per repo memory).

- [ ] **Step 2: Open Booking tab on any trip**

Navigate: `http://localhost:8080`, log in, open a trip, click the Booking tab.

Expected:
- Within ~1s, an Expedia search iframe renders inside the "Book now on Expedia" card with a sensible height (200–600px).
- DevTools Network tab shows successful loads of `eg-widgets.css` and `creator.expediagroup.com/products/widgets/search-widget?…`.
- Console has no errors from `expedia.ts` and no CSP violations.

- [ ] **Step 3: Test failure path**

In DevTools, block requests to `creator.expediagroup.com/*/eg-widgets.css`, then reload the Booking tab.

Expected: the fallback panel renders with the "Open Expedia" button linking to `EXPEDIA_FALLBACK_URL`.

- [ ] **Step 4: Test re-mount idempotency**

Click another trip tab (Timeline) and back to Booking.

Expected: the iframe re-renders cleanly each time. No duplicate iframes, no stale event listeners (check via `getEventListeners(window)` in Chrome DevTools — `message` count stays at 1 from this module).

---

## Task 7: Commit

- [ ] **Step 1: Stage and commit**

```bash
git add src/lib/expedia.ts src/lib/expedia.test.ts src/components/trip/BookingView.tsx docs/superpowers/plans/2026-05-04-expedia-widget-spa-fix.md
git commit -m "fix(booking): render Expedia widget without DOMContentLoaded

The upstream eg-widgets.js binds rendering to DOMContentLoaded, which
never fires after initial app boot in a SPA — so the widget div stayed
empty with no error. Replace the script-bootstrap path with a direct
iframe mount: build the search-widget URL ourselves, load eg-widgets.css
once, and listen for postMessage resize from creator.expediagroup.com.
widgetFailed now reflects a real CSS-load failure."
```

---

## Notes for the executor

- **No new dependencies** — everything uses platform APIs (`URLSearchParams`, `MessageEvent`, `URL`).
- **CSP is already configured** — `server/index.ts` permits `creator.expediagroup.com` and `*.expediagroup.com` for `script-src`, `style-src`, `font-src`, `img-src`, `connect-src`, `frame-src`. No CSP change needed.
- **Don't touch `buildExpediaHotelSearchUrl` or `trackExpediaClick`** — they are consumed by `PlaceCard.tsx` and are unrelated.
- **Origin check is strict** (`event.origin !== EG_WIDGETS_ORIGIN`). Do not add the staging/sandbox origins from upstream — they were defensive against test environments we don't use.
- **Instance ID** — generated per mount, scoped via `meta.instance` in resize messages. This makes the listener safe even if the user has multiple Expedia widgets on the page (we don't, today, but the property is cheap to preserve).
