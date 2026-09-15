# Print Studio Consolidation & Landing Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the free PDF export and the Pro Print Studio into one `Print` dialog, and add an interactive landing-page section that shows a timeline becoming a designed, editable, printable edition.

**Architecture:** One dialog holds two sections: a free *Simple PDF* section that calls the untouched pdfmake pipeline, and a *Studio edition* section that shows Pro users the theme form and free users a preview of their own trip drawn by the real `PrintDocument` in a fixed sample style. The landing page renders the same `PrintDocument` against committed fixture data and committed, model-generated design specs, so it makes no network calls at runtime.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind, TanStack Query, framer-motion, Vitest + Testing Library, pdfmake (unchanged), tsx for the one-off asset script.

**Spec:** `docs/superpowers/specs/2026-09-14-print-studio-consolidation-design.md`

## Global Constraints

- **Install first, in this worktree:** `npm install --no-package-lock --no-save` (the committed lockfile points at Replit-only registry URLs; never rewrite them).
- **Run tests with** `npx vitest run <path>`. Never `bun`.
- **`npm run type-check` is not a clean baseline** — it exits non-zero on ~300 pre-existing errors. Judge only the files you touched; compare against a pre-change run.
- **No new dependencies.**
- **DESIGN.md is binding.** Never `#FFFFFF`/`#000000`; no cool grays (`gray-*`, `slate-*`, `zinc-*`); shadows only from the `shadow-warm-*` family; at most one `variant="sunset"` button per screen; no `border-left`/`border-right` accent stripes; no cards nested in cards; animate `transform` and `opacity` only, never `width`/`height`/`top`/`padding`/`margin`; no "Premium" badges, gold, or marble.
- **Cream, not white:** page backgrounds use `bg-background`, cards `bg-sand-50`.
- **Small red text** uses `text-destructive-ink`, never `text-destructive`.
- **Copy rules:** an edition is openable by people with access to the trip. Never write copy implying a public share link ("share with anyone", "send a link to friends"). Correct phrasing: "everyone on the trip can open it".
- **House voice** (`src/lib/printDesign/voice.ts`): no banned words or travel clichés in any new user-facing copy.
- **Times are floating wall-clock values.** Never convert between zones; never `Date.parse` a date string built from parts.
- **jsdom limits in tests** (`src/test/setup.ts`): `ResizeObserver` and `IntersectionObserver` are inert no-op classes and never fire callbacks, and `Element.prototype.scrollIntoView` does not exist. Production code must work when an observer never fires and must guard `scrollIntoView`.

---

### Task 1: Shared print-data module and font hook

Extract the three things `PrintItinerary.tsx` keeps private so the dialog's preview can share its query cache. Pure refactor; no behavior change.

**Files:**
- Create: `src/components/trip/print-studio/printTripData.ts`
- Create: `src/components/trip/print-studio/useGoogleFonts.ts`
- Create: `src/components/trip/print-studio/printTripData.test.ts`
- Modify: `src/pages/PrintItinerary.tsx` (remove the local `PRINT_OPTS`, `CONTENT_WIDTH`, `useGoogleFonts`; import them instead)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `PRINT_OPTS: { readonly showImages: true; readonly showCosts: true }`
  - `CONTENT_WIDTH: 800`
  - `printTripDataKey(tripId: string | undefined, finalizedAt: string | null): (string | undefined)[]`
  - `useGoogleFonts(googleQuery: string | null): void`

- [ ] **Step 1: Write the failing test**

Create `src/components/trip/print-studio/printTripData.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PRINT_OPTS, CONTENT_WIDTH, printTripDataKey } from './printTripData';

describe('printTripDataKey', () => {
  it('keys a live edition as "live" so every live reader shares one cache entry', () => {
    expect(printTripDataKey('trip-1', null)).toEqual(['print-trip-data', 'trip-1', 'live']);
  });

  it('keys a finalized edition by its timestamp so freezing swaps the source', () => {
    expect(printTripDataKey('trip-1', '2026-09-01T10:00:00Z')).toEqual([
      'print-trip-data',
      'trip-1',
      '2026-09-01T10:00:00Z',
    ]);
  });

  it('pins the options the document is measured at', () => {
    expect(PRINT_OPTS).toEqual({ showImages: true, showCosts: true });
    expect(CONTENT_WIDTH).toBe(800);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/trip/print-studio/printTripData.test.ts`
Expected: FAIL — cannot resolve `./printTripData`.

- [ ] **Step 3: Write the module**

Create `src/components/trip/print-studio/printTripData.ts`:

```ts
// The Print Studio's view of a trip — shared by the edition page and the
// dialog's free preview so both read one React Query cache entry. An edition
// opened straight after upgrading then renders from a warm cache.

/** Options the document is always measured at: it is a keepsake, so photos and costs are in. */
export const PRINT_OPTS = { showImages: true, showCosts: true } as const;

/** Width the cover image is cropped to. Matches the document's measure. */
export const CONTENT_WIDTH = 800;

/**
 * Cache key for one trip's print data. `finalizedAt` is part of the key so
 * freezing or reopening an edition swaps the source of the itinerary rather
 * than serving a stale render; `null` means the live trip.
 */
export function printTripDataKey(tripId: string | undefined, finalizedAt: string | null) {
  return ['print-trip-data', tripId, finalizedAt ?? 'live'];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/trip/print-studio/printTripData.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Move the font hook into its own module**

Create `src/components/trip/print-studio/useGoogleFonts.ts` by moving the function from `src/pages/PrintItinerary.tsx` verbatim, adding `export` and the `useEffect` import:

```ts
import { useEffect } from 'react';

/**
 * Loads a design's Google Fonts pairing. The preconnect matters here: the
 * whole document is a type specimen, so a late stylesheet shows it in
 * fallback faces first.
 */
export function useGoogleFonts(googleQuery: string | null) {
  useEffect(() => {
    if (!googleQuery) return;
    const nodes: HTMLLinkElement[] = [];
    const add = (rel: string, href: string, crossOrigin?: string) => {
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      if (crossOrigin !== undefined) link.crossOrigin = crossOrigin;
      document.head.appendChild(link);
      nodes.push(link);
    };
    add('preconnect', 'https://fonts.googleapis.com');
    add('preconnect', 'https://fonts.gstatic.com', '');
    add('stylesheet', `https://fonts.googleapis.com/css2?${googleQuery}&display=swap`);
    return () => {
      for (const node of nodes) node.remove();
    };
  }, [googleQuery]);
}
```

- [ ] **Step 6: Point `PrintItinerary.tsx` at the shared modules**

In `src/pages/PrintItinerary.tsx`:
1. Delete the local `useGoogleFonts` function (the whole block, roughly lines 60–84) and the `const PRINT_OPTS` / `const CONTENT_WIDTH` declarations (roughly lines 55–58).
2. Add the imports:

```ts
import { PRINT_OPTS, CONTENT_WIDTH, printTripDataKey } from '@/components/trip/print-studio/printTripData';
import { useGoogleFonts } from '@/components/trip/print-studio/useGoogleFonts';
```

3. Replace the inline query key with the helper:

```ts
    queryKey: printTripDataKey(tripId, designRow?.finalized_at ?? null),
```

Leave every other line, including the surrounding comment about `finalized_at`, as it is.

- [ ] **Step 7: Verify nothing else broke**

Run: `npx vitest run src/components/trip/print-studio src/services/pdf`
Expected: PASS, including the existing `PrintStudioDialog` and PDF suites.

- [ ] **Step 8: Commit**

```bash
git add src/components/trip/print-studio/printTripData.ts src/components/trip/print-studio/printTripData.test.ts src/components/trip/print-studio/useGoogleFonts.ts src/pages/PrintItinerary.tsx docs/superpowers
git commit -m "$(cat <<'EOF'
refactor: share the Print Studio's trip-data key and font hook

The dialog's free preview needs the same query key, options and font
loading the edition page uses, so an edition opened after upgrading
renders from a warm cache.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: The sample design for the free preview

One fixed `PrintDesignSpec` with no AI prose, used to show a free user's own trip in a designed style. Its palette is chosen to survive `sanitizePrintDesign` untouched (verified: ink 13.89:1, muted 5.63:1, secondary 6.99:1, primary 8.49:1, accent 4.51:1 against the background; background luminance 0.944).

**Files:**
- Create: `src/lib/printDesign/sample.ts`
- Create: `src/lib/printDesign/sample.test.ts`

**Interfaces:**
- Consumes: `PrintDesignSpec`, `sanitizePrintDesign` from `./spec`.
- Produces:
  - `SAMPLE_TEASER_DESIGN: PrintDesignSpec`
  - `teaserDesign(destination?: string): PrintDesignSpec`

- [ ] **Step 1: Write the failing test**

Create `src/lib/printDesign/sample.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SAMPLE_TEASER_DESIGN, teaserDesign } from './sample';
import { sanitizePrintDesign } from './spec';
import { findSlop } from './voice';

describe('SAMPLE_TEASER_DESIGN', () => {
  it('survives the sanitizer unchanged, so the preview shows what it claims', () => {
    expect(sanitizePrintDesign(SAMPLE_TEASER_DESIGN, [])).toEqual(SAMPLE_TEASER_DESIGN);
  });

  it('invents no prose: every optional copy slot is empty', () => {
    expect(SAMPLE_TEASER_DESIGN.cover.tagline).toBe('');
    expect(SAMPLE_TEASER_DESIGN.cover.subtitle).toBe('');
    expect(SAMPLE_TEASER_DESIGN.themeRationale).toBe('');
    expect(SAMPLE_TEASER_DESIGN.intro).toBe('');
    expect(SAMPLE_TEASER_DESIGN.dayCaptions).toEqual({});
  });

  it('clears the house voice on the copy it does set', () => {
    expect(findSlop(SAMPLE_TEASER_DESIGN.themeName)).toEqual([]);
    expect(findSlop(SAMPLE_TEASER_DESIGN.closing)).toEqual([]);
  });

  it('reads as a different design from the Simple PDF', () => {
    expect(SAMPLE_TEASER_DESIGN.fontPairing).toBe('editorial');
    expect(SAMPLE_TEASER_DESIGN.motif).toBe('waves');
  });
});

describe('teaserDesign', () => {
  it('titles the cover with the trip destination', () => {
    expect(teaserDesign('Lisbon').cover.title).toBe('Lisbon');
  });

  it('falls back to the sample title when there is no destination', () => {
    expect(teaserDesign().cover.title).toBe(SAMPLE_TEASER_DESIGN.cover.title);
    expect(teaserDesign('   ').cover.title).toBe(SAMPLE_TEASER_DESIGN.cover.title);
  });

  it('changes nothing else about the design', () => {
    const { cover, ...rest } = teaserDesign('Lisbon');
    const { cover: sampleCover, ...sampleRest } = SAMPLE_TEASER_DESIGN;
    expect(rest).toEqual(sampleRest);
    expect(cover.tagline).toBe(sampleCover.tagline);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/printDesign/sample.test.ts`
Expected: FAIL — cannot resolve `./sample`.

- [ ] **Step 3: Write the module**

Create `src/lib/printDesign/sample.ts`:

```ts
// src/lib/printDesign/sample.ts — one fixed design, for showing a free user
// what the Studio does to their own trip.
//
// No model call, and deliberately no model prose: the cover carries the
// destination and nothing else, so the preview promises only what it shows.
// Every copy slot here is either empty or a value sanitizePrintDesign would
// have produced anyway, which is what lets the preview claim to be the real
// renderer (asserted in ./sample.test.ts).
//
// Dependency-free and DOM-free, like ./spec.ts.

import type { PrintDesignSpec } from './spec';

export const SAMPLE_TEASER_DESIGN: PrintDesignSpec = {
  themeName: 'Sample',
  themeRationale: '',
  palette: {
    primary: '#14505f',
    secondary: '#7a4a2e',
    background: '#f7f9fa',
    surface: '#eef3f5',
    ink: '#1f2a30',
    muted: '#566670',
    accent: '#2a7d8c',
  },
  fontPairing: 'editorial',
  motif: 'waves',
  cover: {
    // The sanitizer's own fallback title, so this spec round-trips unchanged.
    // teaserDesign() replaces it with the trip's destination.
    title: 'The Itinerary',
    subtitle: '',
    tagline: '',
  },
  intro: '',
  dayCaptions: {},
  // The sanitizer's fallback sign-off, for the same reason.
  closing: 'Safe travels.',
};

/** The sample design, titled with this trip's destination. */
export function teaserDesign(destination?: string): PrintDesignSpec {
  const title = destination?.trim();
  return {
    ...SAMPLE_TEASER_DESIGN,
    cover: {
      ...SAMPLE_TEASER_DESIGN.cover,
      title: title || SAMPLE_TEASER_DESIGN.cover.title,
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/printDesign/sample.test.ts`
Expected: PASS (7 tests). If the round-trip test fails on a color, the sanitizer demoted a role — do not loosen the test; adjust that hex until it clears its floor (`ink`/`muted`/`secondary` ≥ 4.5:1, `primary`/`accent` ≥ 3:1 against the background).

- [ ] **Step 5: Commit**

```bash
git add src/lib/printDesign/sample.ts src/lib/printDesign/sample.test.ts
git commit -m "$(cat <<'EOF'
feat: add the Print Studio sample design

One fixed spec for showing a free user their own trip in a designed
style. No model call and no model prose, and it round-trips through
sanitizePrintDesign unchanged so the preview is the real renderer.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `PageThumbnail`

Renders a full-width document at a readable scale inside a small frame. Used by the dialog preview and the landing stage.

**Files:**
- Create: `src/components/trip/print-studio/PageThumbnail.tsx`
- Create: `src/components/trip/print-studio/PageThumbnail.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: default export `PageThumbnail`, props
  `{ children: React.ReactNode; pageWidth?: number; aspect?: number; className?: string; label: string }`
  (`aspect` = height ÷ width of the frame; `label` is the screen-reader description of the image).

- [ ] **Step 1: Write the failing test**

Create `src/components/trip/print-studio/PageThumbnail.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageThumbnail from './PageThumbnail';

describe('PageThumbnail', () => {
  it('renders its document even when no ResizeObserver callback ever fires', () => {
    render(
      <PageThumbnail label="Preview of this trip">
        <p>Ten Days in Tokyo</p>
      </PageThumbnail>
    );
    expect(screen.getByText('Ten Days in Tokyo')).toBeInTheDocument();
  });

  it('describes itself to assistive tech and hides the rendered page from it', () => {
    const { container } = render(
      <PageThumbnail label="Preview of this trip">
        <p>Ten Days in Tokyo</p>
      </PageThumbnail>
    );
    expect(screen.getByText('Preview of this trip')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('lays the page out at its natural width, scaled from the top left', () => {
    const { container } = render(
      <PageThumbnail label="Preview" pageWidth={736}>
        <p>x</p>
      </PageThumbnail>
    );
    const page = container.querySelector('[data-testid="thumb-page"]') as HTMLElement;
    expect(page.style.width).toBe('736px');
    expect(page.style.transformOrigin).toBe('top left');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/trip/print-studio/PageThumbnail.test.tsx`
Expected: FAIL — cannot resolve `./PageThumbnail`.

- [ ] **Step 3: Write the component**

Create `src/components/trip/print-studio/PageThumbnail.tsx`:

```tsx
// A document at reading scale inside a small frame.
//
// The page is laid out at its natural width and scaled with a transform, so
// the type keeps its real proportions instead of reflowing into a narrow
// column — a 46rem measure squeezed to 10rem would not be the document the
// traveler is being shown. Scale is width-driven and starts at a sensible
// fraction, so a frame that never reports a width (jsdom, a hidden panel)
// still renders something truthful rather than nothing.

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface PageThumbnailProps {
  children: React.ReactNode;
  /** Natural width of the document being scaled. 736px = the document's 46rem. */
  pageWidth?: number;
  /** Frame height ÷ width. Taller shows more of the page. */
  aspect?: number;
  /** What a screen reader is told this picture is. */
  label: string;
  className?: string;
}

const PageThumbnail: React.FC<PageThumbnailProps> = ({
  children,
  pageWidth = 736,
  aspect = 1.25,
  label,
  className,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => {
      const width = frame.clientWidth;
      if (width > 0) setScale(width / pageWidth);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [pageWidth]);

  return (
    <div className={cn('relative', className)}>
      <div
        ref={frameRef}
        className="overflow-hidden rounded-card border border-border bg-background shadow-warm-sm"
        style={{ aspectRatio: `1 / ${aspect}` }}
        aria-hidden="true"
      >
        <div
          data-testid="thumb-page"
          className="pointer-events-none origin-top-left"
          style={{ width: `${pageWidth}px`, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          {children}
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default PageThumbnail;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/trip/print-studio/PageThumbnail.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/trip/print-studio/PageThumbnail.tsx src/components/trip/print-studio/PageThumbnail.test.tsx
git commit -m "$(cat <<'EOF'
feat: add PageThumbnail for showing a document at reading scale

Scales the page with a transform rather than reflowing it, so a preview
keeps the real proportions of the printed type.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `SimplePdfSection`

The free half of the merged dialog. Same options and same export call as today's `PdfExportDialog`, in a section instead of a dialog of its own.

**Files:**
- Create: `src/components/trip/print-studio/SimplePdfSection.tsx`
- Create: `src/components/trip/print-studio/SimplePdfSection.test.tsx`

**Interfaces:**
- Consumes: `exportItineraryPdf(tripId, options)` from `@/services/pdfmake-export`; `defaultPageSize`, `PdfPageSize` from `@/services/pdf/theme`; `PdfExportOptions` from `@/services/pdf/types`.
- Produces: default export `SimplePdfSection`, props `{ tripId: string }`.

- [ ] **Step 1: Write the failing test**

Create `src/components/trip/print-studio/SimplePdfSection.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SimplePdfSection from './SimplePdfSection';

const exportItineraryPdf = vi.fn();
vi.mock('@/services/pdfmake-export', () => ({
  exportItineraryPdf: (...args: unknown[]) => exportItineraryPdf(...args),
}));
const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (m: string) => toastError(m), success: (m: string) => toastSuccess(m) } }));

beforeEach(() => {
  exportItineraryPdf.mockReset().mockResolvedValue(undefined);
  toastError.mockReset();
  toastSuccess.mockReset();
});

describe('SimplePdfSection', () => {
  it('exports with photos and costs on by default', async () => {
    render(<SimplePdfSection tripId="trip-1" />);
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));

    await waitFor(() => expect(exportItineraryPdf).toHaveBeenCalledTimes(1));
    const [tripId, options] = exportItineraryPdf.mock.calls[0];
    expect(tripId).toBe('trip-1');
    expect(options.showImages).toBe(true);
    expect(options.showCosts).toBe(true);
  });

  it('passes the traveler’s choices through to the export', async () => {
    render(<SimplePdfSection tripId="trip-1" />);
    fireEvent.click(screen.getByRole('switch', { name: /prices/i }));
    fireEvent.click(screen.getByRole('button', { name: /^A4$/ }));
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));

    await waitFor(() => expect(exportItineraryPdf).toHaveBeenCalled());
    const [, options] = exportItineraryPdf.mock.calls[0];
    expect(options.showCosts).toBe(false);
    expect(options.pageSize).toBe('A4');
  });

  it('reports a failed export instead of failing silently', async () => {
    exportItineraryPdf.mockRejectedValue(new Error('boom'));
    render(<SimplePdfSection tripId="trip-1" />);
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError.mock.calls[0][0]).toMatch(/boom/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/trip/print-studio/SimplePdfSection.test.tsx`
Expected: FAIL — cannot resolve `./SimplePdfSection`.

- [ ] **Step 3: Write the component**

Create `src/components/trip/print-studio/SimplePdfSection.tsx`:

```tsx
// The free half of the Print dialog: the plain typeset PDF.
//
// It is the same pdfmake export it always was — a real file, downloadable and
// readable on a plane — and it sits above the Studio section so the two read
// as one thing with a simple version and a designed version.

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { exportItineraryPdf } from '@/services/pdfmake-export';
import { defaultPageSize, type PdfPageSize } from '@/services/pdf/theme';
import type { PdfExportOptions } from '@/services/pdf/types';

const SimplePdfSection: React.FC<{ tripId: string }> = ({ tripId }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<PdfExportOptions>({
    showImages: true,
    showCosts: true,
    pageSize: defaultPageSize(),
  });

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      await exportItineraryPdf(tripId, options);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('[SimplePdfSection] Export failed:', error);
      toast.error(
        `Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section aria-labelledby="print-simple-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="print-simple-heading" className="text-sm font-semibold text-foreground">
          Simple PDF
        </h3>
        <span className="shrink-0 text-xs uppercase tracking-wider text-muted-foreground">Free</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        The whole itinerary, typeset and ready to print. Keep it on your phone for the flight.
      </p>

      {/* One row rather than three labelled rows: this is the quick path, and
          the Studio section below has to stay reachable on a short viewport. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-2">
          <Switch
            id="print-photos"
            checked={options.showImages}
            onCheckedChange={(checked) => setOptions((p) => ({ ...p, showImages: checked }))}
          />
          <Label htmlFor="print-photos" className="text-sm text-earth-600">
            Photos
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="print-prices"
            checked={options.showCosts}
            onCheckedChange={(checked) => setOptions((p) => ({ ...p, showCosts: checked }))}
          />
          <Label htmlFor="print-prices" className="text-sm text-earth-600">
            Prices
          </Label>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Paper size">
          {(['LETTER', 'A4'] as PdfPageSize[]).map((size) => (
            <Button
              key={size}
              type="button"
              size="sm"
              variant={options.pageSize === size ? 'default' : 'outline'}
              aria-pressed={options.pageSize === size}
              onClick={() => setOptions((p) => ({ ...p, pageSize: size }))}
            >
              {size === 'LETTER' ? 'Letter' : 'A4'}
            </Button>
          ))}
        </div>
      </div>

      <Button
        type="button"
        onClick={handleDownload}
        disabled={isExporting}
        className="mt-4 h-11 w-full sm:h-10 sm:w-auto"
      >
        {isExporting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <FileDown className="mr-2 h-4 w-4" aria-hidden />
        )}
        {isExporting ? 'Preparing…' : 'Download PDF'}
      </Button>
    </section>
  );
};

export default SimplePdfSection;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/trip/print-studio/SimplePdfSection.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/trip/print-studio/SimplePdfSection.tsx src/components/trip/print-studio/SimplePdfSection.test.tsx
git commit -m "$(cat <<'EOF'
feat: add the Simple PDF section for the merged Print dialog

Same pdfmake export, same options, in a section rather than a dialog of
its own.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `ProFeatureList` and `StudioTeaser`

The free user's view of the Studio section: their own trip, drawn by the real renderer in the sample style, with the existing feature list kept as the fallback when trip data can't be loaded.

**Files:**
- Create: `src/components/trip/print-studio/ProFeatureList.tsx`
- Create: `src/components/trip/print-studio/StudioTeaser.tsx`
- Create: `src/components/trip/print-studio/StudioTeaser.test.tsx`

**Interfaces:**
- Consumes: `PRINT_OPTS`, `CONTENT_WIDTH`, `printTripDataKey` (Task 1); `teaserDesign` (Task 2); `PageThumbnail` (Task 3); `fetchPdfTripData` from `@/services/pdf/data`; `PrintDocument` from `./PrintDocument`; `getFontPairing` from `@/lib/printDesign/spec`; `useGoogleFonts` (Task 1).
- Produces:
  - `ProFeatureList` (default export) and `PRO_FEATURES: string[]` from `ProFeatureList.tsx`
  - `StudioTeaser` (default export), props `{ tripId: string; destination?: string; enabled?: boolean }`

- [ ] **Step 1: Write the failing test**

Create `src/components/trip/print-studio/StudioTeaser.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StudioTeaser from './StudioTeaser';
import { PRO_FEATURES } from './ProFeatureList';

const fetchPdfTripData = vi.fn();
vi.mock('@/services/pdf/data', () => ({
  fetchPdfTripData: (...args: unknown[]) => fetchPdfTripData(...args),
}));

const tripData = {
  destination: 'Lisbon',
  dateRange: 'May 4 – May 11',
  coverImageDataUri: '',
  coverImageRequested: false,
  days: [
    {
      date: '2026-05-04',
      title: 'Arrival',
      items: [
        { type: 'transportation', title: 'Flight lands, LIS', time: '2:10 PM', sortKey: 850 },
        { type: 'accommodation', title: 'Check in, Bairro Alto', time: '4:00 PM', sortKey: 960 },
      ],
    },
  ],
  stays: [],
  transports: [],
  diningRefs: [],
  budgetData: { budget: null, categories: [], total: 0 },
};

const renderTeaser = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <StudioTeaser tripId="trip-1" destination="Lisbon" />
    </QueryClientProvider>
  );
};

beforeEach(() => {
  fetchPdfTripData.mockReset().mockResolvedValue(tripData);
});

describe('StudioTeaser', () => {
  it('shows the traveler’s own trip, titled with the destination', async () => {
    renderTeaser();
    await waitFor(() => expect(screen.getByText('Lisbon')).toBeInTheDocument());
    expect(screen.getByText('Flight lands, LIS')).toBeInTheDocument();
  });

  it('describes the picture for assistive tech', async () => {
    renderTeaser();
    await waitFor(() =>
      expect(screen.getByText(/preview of this trip in a sample print studio style/i)).toBeInTheDocument()
    );
  });

  it('falls back to the feature list when trip data cannot be loaded', async () => {
    fetchPdfTripData.mockRejectedValue(new Error('offline'));
    renderTeaser();
    await waitFor(() => expect(screen.getByText(PRO_FEATURES[0])).toBeInTheDocument());
    expect(screen.queryByText('Flight lands, LIS')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/trip/print-studio/StudioTeaser.test.tsx`
Expected: FAIL — cannot resolve `./StudioTeaser`.

- [ ] **Step 3: Write `ProFeatureList`**

Create `src/components/trip/print-studio/ProFeatureList.tsx`. The strings move verbatim from `PRO_FEATURES` in `PrintStudioDialog.tsx`, and the markup from its `upsellPanel`:

```tsx
// What Pro buys, in words. Now the Studio section's fallback: the preview
// shows this instead of an error when a trip's data cannot be loaded, because
// an upsell that looks broken is worse than an upsell that only tells.

import React from 'react';
import { Check } from 'lucide-react';

export const PRO_FEATURES = [
  'A custom theme designed for each trip',
  'Every activity, stay, and reservation included',
  'Every line of copy is yours to rewrite',
  'Print it, or save it as a PDF',
  'Cancel anytime',
];

const ProFeatureList: React.FC = () => (
  <div className="rounded-card border border-border bg-sand-50 p-4">
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <span className="text-base font-semibold text-foreground">WanderLuxe Pro</span>
      <span className="shrink-0 text-sm text-muted-foreground">
        <span className="text-lg font-semibold tabular-nums text-foreground">$3.99</span> / month
      </span>
    </div>
    <ul className="m-0 list-none space-y-2 p-0">
      {PRO_FEATURES.map((f) => (
        <li key={f} className="flex items-start gap-2 text-sm text-earth-600">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>{f}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default ProFeatureList;
```

- [ ] **Step 4: Write `StudioTeaser`**

Create `src/components/trip/print-studio/StudioTeaser.tsx`:

```tsx
// The free user's view of the Studio: their own itinerary, in a designed page.
//
// Showing beats describing, and showing *their* trip beats showing a stranger's
// — but only if it is honest. So this is the real PrintDocument with the real
// trip data and a fixed sample design that carries no model prose: a palette,
// a typeface pairing, a motif, and the traveler's own plans.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPdfTripData } from '@/services/pdf/data';
import { getFontPairing } from '@/lib/printDesign/spec';
import { teaserDesign } from '@/lib/printDesign/sample';
import PrintDocument from './PrintDocument';
import PageThumbnail from './PageThumbnail';
import ProFeatureList from './ProFeatureList';
import { useGoogleFonts } from './useGoogleFonts';
import { PRINT_OPTS, CONTENT_WIDTH, printTripDataKey } from './printTripData';
import { Skeleton } from '@/components/ui/skeleton';

interface StudioTeaserProps {
  tripId: string;
  destination?: string;
  /** False keeps the query idle — the dialog is closed, or the user is Pro. */
  enabled?: boolean;
}

const StudioTeaser: React.FC<StudioTeaserProps> = ({ tripId, destination, enabled = true }) => {
  const design = teaserDesign(destination);
  useGoogleFonts(enabled ? getFontPairing(design.fontPairing).googleQuery : null);

  const { data, isError } = useQuery({
    // The edition page's key: an edition opened after upgrading finds this
    // fetch already done.
    queryKey: printTripDataKey(tripId, null),
    enabled,
    queryFn: () => fetchPdfTripData(tripId, PRINT_OPTS, CONTENT_WIDTH),
    staleTime: 60_000,
  });

  if (isError) return <ProFeatureList />;

  return (
    <div className="flex items-start gap-4">
      <div className="w-[10rem] shrink-0">
        {data ? (
          <PageThumbnail label="Preview of this trip in a sample Print Studio style" aspect={1.3}>
            <PrintDocument design={design} data={data} />
          </PageThumbnail>
        ) : (
          <Skeleton className="w-full rounded-card" style={{ aspectRatio: '1 / 1.3' }} />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-earth-600">
          Your trip, in a sample style. Pro designs one around it — a palette, typefaces and a line
          for every day — and every line is yours to rewrite.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">$3.99</span> / month
        </p>
      </div>
    </div>
  );
};

export default StudioTeaser;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/trip/print-studio/StudioTeaser.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/trip/print-studio/ProFeatureList.tsx src/components/trip/print-studio/StudioTeaser.tsx src/components/trip/print-studio/StudioTeaser.test.tsx
git commit -m "$(cat <<'EOF'
feat: show free users their own trip in a sample Studio style

The real renderer, the real itinerary, a fixed sample design and no
model prose. The old feature list stays as the fallback when trip data
cannot be loaded.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Merge the two sections into `PrintStudioDialog`

**Files:**
- Modify: `src/components/trip/print-studio/PrintStudioDialog.tsx`
- Modify: `src/components/trip/print-studio/PrintStudioDialog.test.tsx`

**Interfaces:**
- Consumes: `SimplePdfSection` (Task 4), `StudioTeaser` + `ProFeatureList` (Task 5).
- Produces: `PrintStudioDialogProps` gains `tripDestination?: string` and `initialSection?: 'pdf' | 'studio'` (default `'pdf'`).

- [ ] **Step 1: Write the failing tests**

Add to `src/components/trip/print-studio/PrintStudioDialog.test.tsx` (keep every existing test and mock; the file already mocks `AuthContext` with a mutable `tier`, the Supabase client, `sonner` and analytics):

```tsx
vi.mock('./SimplePdfSection', () => ({
  default: ({ tripId }: { tripId: string }) => <div data-testid="simple-pdf">{tripId}</div>,
}));
vi.mock('./StudioTeaser', () => ({
  default: ({ destination }: { destination?: string }) => (
    <div data-testid="studio-teaser">{destination}</div>
  ),
}));

describe('PrintStudioDialog — one door, two tiers', () => {
  it('offers the Simple PDF to a Pro member alongside the theme field', async () => {
    tier = 'pro';
    renderDialog();
    expect(screen.getByTestId('simple-pdf')).toBeInTheDocument();
    expect(screen.getByLabelText(/theme/i)).toBeInTheDocument();
    expect(screen.queryByTestId('studio-teaser')).not.toBeInTheDocument();
  });

  it('offers a free member the Simple PDF and a preview of their own trip', async () => {
    tier = 'free';
    renderDialog();
    expect(screen.getByTestId('simple-pdf')).toBeInTheDocument();
    expect(screen.getByTestId('studio-teaser')).toBeInTheDocument();
    expect(screen.queryByLabelText(/theme/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /unlock the print studio/i })).toBeInTheDocument();
  });

  it('keeps the Simple PDF reachable while an edition is generating', async () => {
    tier = 'pro';
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /design my edition/i }));
    await waitFor(() => expect(screen.getByText(/reading every day of your trip/i)).toBeInTheDocument());
    expect(screen.getByTestId('simple-pdf')).toBeInTheDocument();
  });
});
```

```tsx
  it('scrolls to the Studio half when that is what the deep link asked for', () => {
    tier = 'free';
    // jsdom has no scrollIntoView, which is why the component guards the call.
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView as unknown as typeof Element.prototype.scrollIntoView;
    try {
      render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <MemoryRouter>
            <PrintStudioDialog tripId="trip-1" open onOpenChange={vi.fn()} initialSection="studio" />
          </MemoryRouter>
        </QueryClientProvider>
      );
      expect(scrollIntoView).toHaveBeenCalled();
    } finally {
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  });
```

The generating test needs a fetch that never settles, so the progress panel stays up:

```tsx
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
```
Put that line immediately before the `fireEvent.click` in that test (`afterEach` already calls `vi.unstubAllGlobals()`).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/trip/print-studio/PrintStudioDialog.test.tsx`
Expected: FAIL — no `simple-pdf` element; the free case still renders the inline upsell.

- [ ] **Step 3: Rework the dialog**

In `src/components/trip/print-studio/PrintStudioDialog.tsx`:

1. Add imports and drop the now-shared list:

```tsx
import SimplePdfSection from './SimplePdfSection';
import StudioTeaser from './StudioTeaser';
import ProFeatureList, { PRO_FEATURES } from './ProFeatureList';
```

Delete the local `const PRO_FEATURES = [...]` array and the whole `upsellPanel` JSX block. `PRO_FEATURES` stays imported only if something still reads it; if nothing does, import just `ProFeatureList`.

2. Extend the props:

```tsx
interface PrintStudioDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Titles the free preview's cover. */
  tripDestination?: string;
  /** Which half the traveler asked for. Deep links from the guide set this. */
  initialSection?: 'pdf' | 'studio';
}
```

and destructure `tripDestination` and `initialSection = 'pdf'`.

3. Scroll to the Studio section when that is what was asked for. jsdom has no
   `scrollIntoView`, so guard the call:

```tsx
  const studioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || initialSection !== 'studio') return;
    const el = studioRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'start' });
    }
  }, [open, initialSection]);
```

4. Replace the body of the scroll region. `isGenerating` now swaps only the
   Studio half, so the free PDF stays reachable:

```tsx
        <div className="-mx-4 min-h-0 flex-1 space-y-4 overflow-y-auto px-4 sm:-mx-6 sm:px-6">
          <SimplePdfSection tripId={tripId} />

          <div ref={studioRef} className="border-t border-border pt-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">Studio edition</h3>
              <span className="shrink-0 text-xs uppercase tracking-wider text-muted-foreground">
                Pro
              </span>
            </div>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">
              The same itinerary, art-directed: a palette, typefaces, a motif, and a line for every
              day.
            </p>

            {isGenerating ? (
              generatingPanel
            ) : isPro ? (
              themeField
            ) : (
              <StudioTeaser tripId={tripId} destination={tripDestination} enabled={open} />
            )}
          </div>

          {!isGenerating && editionList}
        </div>
```

5. Update the dialog description so it names both halves:

```tsx
          <DialogDescription>
            Download a simple PDF of this trip, or have the Studio design an edition of it.
          </DialogDescription>
```

Delete the `isPro ?` branch in the description — both tiers now see the same sentence.

6. Track the upgrade click. In `handleUpgrade`, immediately after `setIsUpgrading(true)`:

```tsx
    track('print_studio_upgrade_click', { trip_id: tripId, source: 'print_dialog' });
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/trip/print-studio`
Expected: PASS — the four new tests plus every pre-existing dialog test.

- [ ] **Step 5: Commit**

```bash
git add src/components/trip/print-studio/PrintStudioDialog.tsx src/components/trip/print-studio/PrintStudioDialog.test.tsx
git commit -m "$(cat <<'EOF'
feat: one Print dialog with a free and a Pro half

The Simple PDF sits above the Studio edition for every tier, so the
paid feature reads as the designed version of the file people already
use rather than an unrelated button.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: One `Print` button in the trip toolbar

**Files:**
- Modify: `src/components/trip/TimelineView.tsx` (imports line 6 and 9, state lines 67–70, the deep-link effect lines 95–115, the desktop toolbar around lines 363–378, the mobile row around lines 405–425, the dialog mount around line 510)
- Modify: `src/components/trip/TimelineView.test.tsx`
- Delete: `src/components/trip/ExportPdfButton.tsx`
- Delete: `src/components/trip/PdfExportDialog.tsx`

**Interfaces:**
- Consumes: `PrintStudioDialog` with `tripDestination` and `initialSection` (Task 6).
- Produces: nothing for later tasks.

- [ ] **Step 1: Write the failing tests**

In `src/components/trip/TimelineView.test.tsx`, delete the line
`vi.mock('./ExportPdfButton', () => ({ default: () => null }));` and replace the
`PrintStudioDialog` mock with one that records its props:

```tsx
const printDialogProps: Array<Record<string, unknown>> = [];
vi.mock('./print-studio/PrintStudioDialog', () => ({
  default: (props: Record<string, unknown>) => {
    printDialogProps.push(props);
    return props.open ? <div data-testid="print-dialog">{String(props.initialSection)}</div> : null;
  },
}));
```

Add a suite:

```tsx
describe('TimelineView print entry point', () => {
  beforeEach(() => {
    printDialogProps.length = 0;
    (window as { gtag?: unknown }).gtag = vi.fn();
  });

  it('offers one Print button per layout instead of separate PDF and Studio buttons', () => {
    renderView();
    expect(screen.queryByRole('button', { name: /^PDF$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Studio$/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Print$/ }).length).toBeGreaterThan(0);
  });

  it('opens the dialog on the Studio half for a keepsake deep link', () => {
    renderView('/trip/trip-1/timeline?print=1');
    expect(screen.getByTestId('print-dialog')).toHaveTextContent('studio');
  });

  it('opens the dialog on the PDF half for an export deep link', () => {
    renderView('/trip/trip-1/timeline?export=pdf');
    expect(screen.getByTestId('print-dialog')).toHaveTextContent('pdf');
  });

  it('passes the destination through so the preview cover can use it', () => {
    renderView('/trip/trip-1/timeline?print=1');
    expect(printDialogProps.at(-1)?.tripDestination).toBe('Kyoto');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/trip/TimelineView.test.tsx`
Expected: FAIL — two buttons still exist and `initialSection` is undefined.

- [ ] **Step 3: Rework the toolbar**

In `src/components/trip/TimelineView.tsx`:

1. Delete `import ExportPdfButton from './ExportPdfButton';` (line 6). In the
   lucide import (line 9) remove `FileDown` and `Palette` if nothing else uses
   them, and add `Printer`.
2. Replace the two state hooks (lines 69–70) with:

```tsx
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printSection, setPrintSection] = useState<'pdf' | 'studio'>('pdf');
```

3. In the deep-link effect, replace the two `if` lines:

```tsx
    if (exportParam === 'pdf') {
      setPrintSection('pdf');
      setIsPrintOpen(true);
    }
    if (print === '1') {
      setPrintSection('studio');
      setIsPrintOpen(true);
    }
```

Leave the param-stripping block exactly as it is.

4. In the desktop toolbar, replace the `<ExportPdfButton .../>` element and the
   `Studio` button with one button:

```tsx
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              title="Print this trip: a simple PDF, or a designed edition"
              onClick={() => {
                setPrintSection('pdf');
                setIsPrintOpen(true);
              }}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
```

5. In the mobile row, replace the `PDF` and `Studio` buttons with:

```tsx
            <Button
              variant="outline"
              className="h-11 flex-1"
              title="Print this trip: a simple PDF, or a designed edition"
              onClick={() => {
                setPrintSection('pdf');
                setIsPrintOpen(true);
              }}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
```

6. Update the dialog mount:

```tsx
        <PrintStudioDialog
          tripId={tripId}
          open={isPrintOpen}
          onOpenChange={setIsPrintOpen}
          tripDestination={tripDestination}
          initialSection={printSection}
        />
```

- [ ] **Step 4: Delete the two dead components**

```bash
git rm src/components/trip/ExportPdfButton.tsx src/components/trip/PdfExportDialog.tsx
```

Then check nothing still imports them:

Run: `grep -rn "ExportPdfButton\|PdfExportDialog" src server scripts`
Expected: no matches.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/components/trip/TimelineView.test.tsx src/components/trip/print-studio`
Expected: PASS, including the pre-existing TimelineView suites.

- [ ] **Step 6: Commit**

```bash
git add -A src/components/trip
git commit -m "$(cat <<'EOF'
feat: replace the PDF and Studio buttons with one Print button

Deep links keep working: ?export=pdf opens the PDF half and ?print=1
the Studio half. The mobile action row drops from four buttons to three.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Landing fixture and generated showcase assets

Everything the landing section renders is committed. This task produces the fixture, the one-off script, and its three outputs.

**Files:**
- Create: `src/components/landing/print-showcase/tokyoRows.ts`
- Create: `scripts/build-print-showcase.ts`
- Create (generated): `src/components/landing/print-showcase/tokyoTrip.json`
- Create (generated): `src/components/landing/print-showcase/tokyoEditions.json`
- Create (generated): `public/images/print-showcase-simple-pdf.png`
- Create: `src/components/landing/print-showcase/showcase.test.ts`
- Modify: `package.json` (one script entry)

**Interfaces:**
- Consumes: `PdfTripRows`, `buildPdfTripData` from `@/services/pdf/data`; `buildDocDefinition` from `@/services/pdf/builder`; `generatePrintDesign`, `PrintTripRows` from `server/lib/printDesign`; `sanitizePrintDesign` from `@/lib/printDesign/spec`.
- Produces:
  - `TOKYO_ROWS: PdfTripRows`
  - `TOKYO_THEMES: string[]` (the three theme prompts, so the script and a re-run agree)
  - `tokyoTrip.json` → `PdfTripData`
  - `tokyoEditions.json` → `PrintDesignSpec[]` (length 3)

- [ ] **Step 1: Write the fixture**

Create `src/components/landing/print-showcase/tokyoRows.ts`. The column names
below are the ones `buildDays` in `src/services/pdf/data.ts` actually reads —
do not rename them:

```ts
// The trip behind the landing page's Print Studio section.
//
// Tokyo, because the app screenshots above it are Tokyo: a visitor should read
// the page as one trip moving through the product, not four unrelated demos.
//
// Raw rows rather than projected data, because this one fixture feeds three
// consumers: the pdfmake page, the Studio document, and the model that designs
// the sample editions (see scripts/build-print-showcase.ts).

import type { PdfTripRows } from '@/services/pdf/data';

const DAY_1 = '11111111-1111-4111-8111-111111111111';
const DAY_2 = '22222222-2222-4222-8222-222222222222';
const DAY_3 = '33333333-3333-4333-8333-333333333333';

export const TOKYO_ROWS: PdfTripRows = {
  trip: {
    destination: 'Tokyo',
    arrival_date: '2026-10-03',
    departure_date: '2026-10-05',
    cover_image_url: null,
    budget: 4200,
    timezone: 'Asia/Tokyo',
  },
  days: [
    { day_id: DAY_1, date: '2026-10-03', title: 'Landing, and a first walk', description: null },
    { day_id: DAY_2, date: '2026-10-04', title: 'Teamlab, then Shibuya', description: null },
    { day_id: DAY_3, date: '2026-10-05', title: 'Tsukiji, and the train west', description: null },
  ] as PdfTripRows['days'],
  stays: [
    {
      hotel: 'Hotel Ryumeikan Ochanomizu',
      hotel_address: '3-4 Kanda Surugadai, Chiyoda City, Tokyo',
      hotel_phone: '+81 3-3251-1135',
      hotel_website: null,
      hotel_details: 'Corner room, city side',
      hotel_checkin_date: '2026-10-03',
      hotel_checkout_date: '2026-10-05',
      checkin_time: '18:00',
      checkout_time: '11:00',
      cost: 980,
      currency: 'USD',
      image_url: null,
      timezone: null,
    },
  ] as PdfTripRows['stays'],
  trans: [
    {
      type: 'flight',
      provider: 'ANA 175',
      departure_location: 'San Francisco (SFO)',
      arrival_location: 'Tokyo (HND)',
      start_date: '2026-10-03',
      start_time: '11:05',
      end_time: '15:40',
      confirmation_number: 'NH4K7Q2',
      details: 'Two checked bags',
      cost: 1460,
      currency: 'USD',
      departure_timezone: 'America/Los_Angeles',
      arrival_timezone: 'Asia/Tokyo',
    },
  ] as PdfTripRows['trans'],
  acts: [
    {
      day_id: DAY_1,
      title: 'Walk the Kanda river to Akihabara',
      description: 'Slow first evening, no tickets, no plan',
      start_time: '19:30',
      cost: null,
      currency: null,
      timezone: null,
    },
    {
      day_id: DAY_2,
      title: 'teamLab Planets',
      description: 'Barefoot rooms; arrive before the afternoon crowd',
      start_time: '10:00',
      cost: 38,
      currency: 'USD',
      timezone: null,
    },
    {
      day_id: DAY_2,
      title: 'Shibuya Sky at sunset',
      description: null,
      start_time: '17:15',
      cost: 26,
      currency: 'USD',
      timezone: null,
    },
    {
      day_id: DAY_3,
      title: 'Tsukiji outer market, early',
      description: 'Tamagoyaki stand on the second lane',
      start_time: '07:30',
      cost: null,
      currency: null,
      timezone: null,
    },
  ] as PdfTripRows['acts'],
  dine: [
    {
      day_id: DAY_2,
      restaurant_name: 'Sushi Sho',
      address: '1-11 Yotsuya, Shinjuku City, Tokyo',
      reservation_time: '20:00',
      number_of_people: 2,
      confirmation_number: 'SS-4471',
      notes: 'Counter seats, omakase only',
      cost: 310,
      currency: 'USD',
      timezone: null,
    },
  ] as PdfTripRows['dine'],
  otherExpenses: [],
};

/** The three directions the sample editions are generated from. */
export const TOKYO_THEMES = [
  'Sun-bleached coast',
  'Art deco poster',
  'Botanical notes',
];
```

- [ ] **Step 2: Write the build script**

Create `scripts/build-print-showcase.ts`:

```ts
// Builds the committed assets behind the landing page's Print Studio section.
// Run by hand, never in CI or the build:
//
//   npm run build:print-showcase
//
// Needs OPENAI_API_KEY in .env (three model calls, a few cents), and the PDF
// page step uses macOS `sips`. Outputs are committed, so nobody else ever runs
// this and the landing page never calls an API at runtime.

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { buildPdfTripData } from '../src/services/pdf/data';
import { buildDocDefinition } from '../src/services/pdf/builder';
import { defaultPageSize } from '../src/services/pdf/theme';
import { sanitizePrintDesign } from '../src/lib/printDesign/spec';
import { generatePrintDesign, type PrintTripRows } from '../server/lib/printDesign';
import { TOKYO_ROWS, TOKYO_THEMES } from '../src/components/landing/print-showcase/tokyoRows';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src/components/landing/print-showcase');
const fontsDir = path.join(root, 'src/assets/fonts/pdf');
const OPTS = { showImages: false, showCosts: true } as const;
const CONTENT_WIDTH = 800;

/** The generation module names its rows differently from the PDF module. */
function toPrintTripRows(rows: typeof TOKYO_ROWS): PrintTripRows {
  return {
    trip: rows.trip as unknown as Record<string, unknown>,
    days: rows.days as unknown as Record<string, unknown>[],
    activities: rows.acts as unknown as Record<string, unknown>[],
    stays: rows.stays as unknown as Record<string, unknown>[],
    transportation: rows.trans as unknown as Record<string, unknown>[],
    reservations: rows.dine as unknown as Record<string, unknown>[],
    otherExpenses: [],
  };
}

async function writeTripData() {
  const data = await buildPdfTripData(TOKYO_ROWS, OPTS, CONTENT_WIDTH);
  // The showcase cover is a local file, not a fetched data URI.
  data.coverImageDataUri = '';
  data.coverImageRequested = false;
  fs.writeFileSync(path.join(outDir, 'tokyoTrip.json'), `${JSON.stringify(data, null, 2)}\n`);
  console.log(
    `tokyoTrip.json: ${data.days.length} days, ${data.days.reduce((n, d) => n + d.items.length, 0)} items`
  );
  return data;
}

function renderSimplePdfImage(doc: TDocumentDefinitions) {
  const printer = new PdfPrinter({
    DMSerifDisplay: {
      normal: path.join(fontsDir, 'DMSerifDisplay-Regular.ttf'),
      bold: path.join(fontsDir, 'DMSerifDisplay-Regular.ttf'),
      italics: path.join(fontsDir, 'DMSerifDisplay-Italic.ttf'),
      bolditalics: path.join(fontsDir, 'DMSerifDisplay-Italic.ttf'),
    },
    DMSans: {
      normal: path.join(fontsDir, 'DMSans-Regular.ttf'),
      bold: path.join(fontsDir, 'DMSans-Medium.ttf'),
      italics: path.join(fontsDir, 'DMSans-Italic.ttf'),
      bolditalics: path.join(fontsDir, 'DMSans-MediumItalic.ttf'),
    },
  });

  const tmpPdf = path.join(root, 'node_modules/.cache/print-showcase.pdf');
  fs.mkdirSync(path.dirname(tmpPdf), { recursive: true });

  return new Promise<void>((resolve, reject) => {
    const stream = fs.createWriteStream(tmpPdf);
    const pdf = printer.createPdfKitDocument(doc);
    pdf.pipe(stream);
    pdf.on('error', reject);
    stream.on('finish', () => {
      const out = path.join(root, 'public/images/print-showcase-simple-pdf.png');
      // sips converts page one only, which is what the landing page shows.
      execFileSync('sips', ['-s', 'format', 'png', tmpPdf, '--out', out]);
      console.log(`wrote ${path.relative(root, out)}`);
      resolve();
    });
    pdf.end();
  });
}

async function writeEditions() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required to generate the showcase editions');

  const rows = toPrintTripRows(TOKYO_ROWS);
  const dayDates = TOKYO_ROWS.days.map((d) => d.date as string);
  const editions = [];
  for (const theme of TOKYO_THEMES) {
    const { design } = await generatePrintDesign(apiKey, rows, theme);
    editions.push(sanitizePrintDesign(design, dayDates));
    console.log(`generated: ${theme}`);
  }
  fs.writeFileSync(path.join(outDir, 'tokyoEditions.json'), `${JSON.stringify(editions, null, 2)}\n`);
}

async function main() {
  const data = await writeTripData();
  await renderSimplePdfImage(buildDocDefinition(data, {
    showImages: false,
    showCosts: true,
    pageSize: defaultPageSize(),
    exportedAt: new Date('2026-09-01T09:00:00'),
  }));
  await writeEditions();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Add to `package.json` scripts, after `"build:sitemap"`:

```json
    "build:print-showcase": "npx tsx scripts/build-print-showcase.ts",
```

- [ ] **Step 3: Run the script**

Run: `npm run build:print-showcase`
Expected: it prints the day and item counts, the PNG path, and one line per
generated edition, then exits 0. Confirm the item count is 6 (four activities,
one reservation, one flight) and open the PNG to check it is a typeset page
rather than a blank sheet.

If `OPENAI_API_KEY` is missing, stop and ask the user rather than hand-writing
editions — hand-written specs would make the landing page a mockup instead of
real output.

- [ ] **Step 4: Write the guard test**

Create `src/components/landing/print-showcase/showcase.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import editions from './tokyoEditions.json';
import trip from './tokyoTrip.json';
import { sanitizePrintDesign, type PrintDesignSpec } from '@/lib/printDesign/spec';
import { findSlop } from '@/lib/printDesign/voice';

const specs = editions as unknown as PrintDesignSpec[];
const dayDates = (trip as { days: { date: string }[] }).days.map((d) => d.date);

describe('committed showcase editions', () => {
  it('ships three editions', () => {
    expect(specs).toHaveLength(3);
  });

  it('are already sanitized, so the landing page shows what the product would', () => {
    for (const spec of specs) {
      expect(sanitizePrintDesign(spec, dayDates)).toEqual(spec);
    }
  });

  it('carry no copy the house voice would drop', () => {
    for (const spec of specs) {
      const prose = [
        spec.themeName,
        spec.themeRationale,
        spec.cover.title,
        spec.cover.tagline,
        spec.intro,
        spec.closing,
        ...Object.values(spec.dayCaptions),
      ].filter(Boolean);
      for (const line of prose) {
        expect(findSlop(line), line).toEqual([]);
      }
    }
  });

  it('caption only real days of the sample trip', () => {
    for (const spec of specs) {
      for (const date of Object.keys(spec.dayCaptions)) {
        expect(dayDates).toContain(date);
      }
    }
  });

  it('ships a sample trip with items on every day', () => {
    const days = (trip as { days: { items: unknown[] }[] }).days;
    expect(days.length).toBeGreaterThan(1);
    for (const day of days) expect(day.items.length).toBeGreaterThan(0);
  });
});
```

`resolveJsonModule` is already on for this project's app config; if the import
errors, add `with { type: 'json' }` rather than changing tsconfig.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/landing/print-showcase/showcase.test.ts`
Expected: PASS (5 tests). A failure here means the generated output needs
regenerating, not that the test should be relaxed.

- [ ] **Step 6: Commit**

```bash
git add src/components/landing/print-showcase scripts/build-print-showcase.ts package.json public/images/print-showcase-simple-pdf.png
git commit -m "$(cat <<'EOF'
feat: add the committed Tokyo fixture and showcase assets

One raw-row fixture feeds all three showcase surfaces: the pdfmake page
image, the Studio document, and the model that designed the three sample
editions. Generated once and committed, so the landing page calls
nothing at runtime.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: `ShowcaseStage`

The interactive five-step stage. Mounted lazily by Task 10; tested directly, because the test environment's `IntersectionObserver` never fires.

**Files:**
- Create: `src/components/landing/print-showcase/ShowcaseStage.tsx`
- Create: `src/components/landing/print-showcase/ShowcaseStage.test.tsx`

**Interfaces:**
- Consumes: `tokyoTrip.json`, `tokyoEditions.json` (Task 8); `PageThumbnail` (Task 3); `PrintDocument`, `EditableCopy` from `@/components/trip/print-studio/…`; `useGoogleFonts` (Task 1); `getFontPairing` from `@/lib/printDesign/spec`; `applyCopyOverrides` from `@/lib/printDesign/edits`.
- Produces: default export `ShowcaseStage` (no props), and `SHOWCASE_STEPS: { id: string; label: string }[]`.

- [ ] **Step 1: Write the failing test**

Create `src/components/landing/print-showcase/ShowcaseStage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ShowcaseStage from './ShowcaseStage';

const reducedMotion = { current: false };
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { ...actual, useReducedMotion: () => reducedMotion.current };
});

beforeEach(() => {
  reducedMotion.current = false;
  vi.useRealTimers();
});

const step = (name: RegExp) => screen.getByRole('tab', { name });

describe('ShowcaseStage', () => {
  it('starts on the timeline step', () => {
    render(<ShowcaseStage />);
    expect(step(/your timeline/i)).toHaveAttribute('aria-selected', 'true');
  });

  it('moves between steps on click', () => {
    render(<ShowcaseStage />);
    fireEvent.click(step(/studio edition/i));
    expect(step(/studio edition/i)).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('group', { name: /sample editions/i })).toBeInTheDocument();
  });

  it('moves between steps with the arrow keys', () => {
    render(<ShowcaseStage />);
    fireEvent.keyDown(step(/your timeline/i), { key: 'ArrowRight' });
    expect(step(/simple pdf/i)).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps every itinerary item when the edition changes', () => {
    render(<ShowcaseStage />);
    fireEvent.click(step(/studio edition/i));
    const itemsBefore = screen.getAllByText(/teamLab Planets/i).length;

    const chips = within(screen.getByRole('group', { name: /sample editions/i })).getAllByRole('button');
    fireEvent.click(chips[1]);

    expect(screen.getAllByText(/teamLab Planets/i)).toHaveLength(itemsBefore);
    expect(chips[1]).toHaveAttribute('aria-pressed', 'true');
  });

  it('lets a visitor rewrite a line and put it back', () => {
    render(<ShowcaseStage />);
    fireEvent.click(step(/your words/i));

    const title = screen.getByLabelText(/cover title/i) as HTMLTextAreaElement;
    const original = title.value;
    fireEvent.change(title, { target: { value: 'Five Days, Mostly Walking' } });
    expect((screen.getByLabelText(/cover title/i) as HTMLTextAreaElement).value).toBe(
      'Five Days, Mostly Walking'
    );

    fireEvent.click(screen.getByRole('button', { name: /restore the original cover title/i }));
    expect((screen.getByLabelText(/cover title/i) as HTMLTextAreaElement).value).toBe(original);
  });

  it('does not autoplay when the visitor asked for less motion', () => {
    reducedMotion.current = true;
    vi.useFakeTimers();
    render(<ShowcaseStage />);
    vi.advanceTimersByTime(8000);
    expect(step(/your timeline/i)).toHaveAttribute('aria-selected', 'true');
  });

  it('autoplays as far as the edition, then stops', () => {
    vi.useFakeTimers();
    render(<ShowcaseStage />);
    vi.advanceTimersByTime(8000);
    expect(step(/studio edition/i)).toHaveAttribute('aria-selected', 'true');
  });

  it('stops autoplaying once the visitor takes over', () => {
    vi.useFakeTimers();
    render(<ShowcaseStage />);
    fireEvent.click(step(/print/i));
    vi.advanceTimersByTime(8000);
    expect(step(/print/i)).toHaveAttribute('aria-selected', 'true');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/landing/print-showcase/ShowcaseStage.test.tsx`
Expected: FAIL — cannot resolve `./ShowcaseStage`.

- [ ] **Step 3: Write the component**

Create `src/components/landing/print-showcase/ShowcaseStage.tsx`:

```tsx
// The landing page's Print Studio demonstration.
//
// Five steps over one sheet of paper: the plan as a timeline, the free PDF of
// it, the designed edition, the words being rewritten, and the finished thing.
// It runs the product's own renderer over committed fixture data, so it cannot
// drift from what the Studio actually prints, and the editing is the real
// editing component rather than a picture of it.

import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { BedDouble, Compass, Plane, UtensilsCrossed } from 'lucide-react';
import PrintDocument from '@/components/trip/print-studio/PrintDocument';
import EditableCopy from '@/components/trip/print-studio/EditableCopy';
import PageThumbnail from '@/components/trip/print-studio/PageThumbnail';
import { useGoogleFonts } from '@/components/trip/print-studio/useGoogleFonts';
import { getFontPairing, type PrintDesignSpec } from '@/lib/printDesign/spec';
import { applyCopyOverrides, type PrintCopyOverrides } from '@/lib/printDesign/edits';
import type { PdfTripData } from '@/services/pdf/types';
import { cn } from '@/lib/utils';
import editionsJson from './tokyoEditions.json';
import tripJson from './tokyoTrip.json';

const TRIP = tripJson as unknown as PdfTripData;
const EDITIONS = editionsJson as unknown as PrintDesignSpec[];

export const SHOWCASE_STEPS = [
  { id: 'timeline', label: 'Your timeline' },
  { id: 'pdf', label: 'Simple PDF' },
  { id: 'edition', label: 'Studio edition' },
  { id: 'words', label: 'Your words' },
  { id: 'print', label: 'Print' },
] as const;

type StepId = (typeof SHOWCASE_STEPS)[number]['id'];

const ROW_ICONS = {
  transportation: Plane,
  accommodation: BedDouble,
  activity: Compass,
  dining: UtensilsCrossed,
} as const;

/** Day one as the app shows it — the state every traveler starts from. */
const TimelineRows: React.FC = () => (
  <ul className="m-0 list-none space-y-3 p-0">
    {TRIP.days[0].items.map((item) => {
      const Icon = ROW_ICONS[item.type];
      return (
        <li
          key={`${item.time}-${item.title}`}
          className="flex items-start gap-3 rounded-card border border-earth-100 bg-sand-50 p-3"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-earth-200 text-earth-500">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-sans text-sm font-medium text-earth-600">{item.title}</span>
            <span className="block font-sans text-xs text-earth-500">{item.time}</span>
          </span>
        </li>
      );
    })}
  </ul>
);

const ShowcaseStage: React.FC = () => {
  const prefersReduced = useReducedMotion();
  const [step, setStep] = useState<StepId>('timeline');
  const [editionIndex, setEditionIndex] = useState(0);
  const [overrides, setOverrides] = useState<PrintCopyOverrides>({});
  const tookOver = useRef(false);

  const baseDesign = EDITIONS[editionIndex];
  const design = applyCopyOverrides(baseDesign, overrides);
  useGoogleFonts(getFontPairing(design.fontPairing).googleQuery);

  // One short run to the edition, so a visitor who only scrolls past still
  // sees the plain page become a designed one. Their first interaction ends it.
  useEffect(() => {
    if (prefersReduced) return;
    const timers = [
      window.setTimeout(() => !tookOver.current && setStep('pdf'), 1800),
      window.setTimeout(() => !tookOver.current && setStep('edition'), 4000),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [prefersReduced]);

  const go = (id: StepId) => {
    tookOver.current = true;
    setStep(id);
  };

  const onStepKeyDown = (e: React.KeyboardEvent, index: number) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = SHOWCASE_STEPS[(index + delta + SHOWCASE_STEPS.length) % SHOWCASE_STEPS.length];
    go(next.id);
  };

  const editable = (key: string, label: string, max: number) => (value: string) => {
    const current = overrides[key] ?? value;
    return (
      <EditableCopy
        fieldKey={key}
        value={current}
        onChange={(next) => setOverrides((prev) => ({ ...prev, [key]: next }))}
        max={max}
        label={label}
        placeholder={label}
        edited={overrides[key] !== undefined}
        onRevert={
          overrides[key] !== undefined
            ? () =>
                setOverrides((prev) => {
                  const { [key]: _dropped, ...rest } = prev;
                  return rest;
                })
            : undefined
        }
      />
    );
  };

  const renderCopy = (key: string, value: string) => {
    if (step !== 'words') return value;
    if (key === 'cover.title') return editable('cover.title', 'Cover title', 80)(value);
    if (key === 'cover.tagline') return editable('cover.tagline', 'Cover tagline', 160)(value);
    const firstCaption = `day.${TRIP.days[0].date}`;
    if (key === firstCaption) return editable(firstCaption, 'Day caption', 140)(value);
    return value;
  };

  const document = (
    <PageThumbnail
      label="A Print Studio edition of a sample trip to Tokyo"
      aspect={1.15}
      className="w-full"
    >
      <PrintDocument design={design} data={TRIP} renderCopy={step === 'words' ? renderCopy : undefined} />
    </PageThumbnail>
  );

  return (
    <div className="grid gap-6 md:grid-cols-[14rem_1fr] md:gap-10">
      {/* Mobile: a snap rail — five steps will not fit a segmented control at
          375px. sm+: a column beside the sheet. */}
      <div
        role="tablist"
        aria-label="Print Studio steps"
        aria-orientation="vertical"
        className="-mx-6 flex snap-x gap-2 overflow-x-auto px-6 md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:px-0"
      >
        {SHOWCASE_STEPS.map((s, i) => {
          const selected = s.id === step;
          return (
            <button
              key={s.id}
              role="tab"
              type="button"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => go(s.id)}
              onKeyDown={(e) => onStepKeyDown(e, i)}
              className={cn(
                'shrink-0 snap-start rounded-full border px-4 py-2 text-left font-sans text-sm transition-colors md:rounded-card',
                selected
                  ? 'border-earth-600 bg-earth-600 text-sand-50'
                  : 'border-border bg-background text-earth-500 hover:border-earth-300 hover:text-earth-600'
              )}
            >
              <span className="tabular-nums text-xs opacity-70">{String(i + 1).padStart(2, '0')}</span>
              <span className="ml-2">{s.label}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" aria-label={SHOWCASE_STEPS.find((s) => s.id === step)!.label}>
        {step === 'timeline' && <TimelineRows />}

        {step === 'pdf' && (
          <figure className="m-0">
            <img
              src="/images/print-showcase-simple-pdf.png"
              alt="The first page of a simple PDF itinerary for a trip to Tokyo, typeset in two columns"
              className="block h-auto w-full rounded-card border border-border shadow-warm-sm"
              loading="lazy"
              decoding="async"
            />
            <figcaption className="mt-3 font-sans text-sm text-earth-500">
              Free on every trip: the whole itinerary, typeset and ready to print.
            </figcaption>
          </figure>
        )}

        {step !== 'timeline' && step !== 'pdf' && (
          <div className="space-y-4">
            {document}

            {step === 'edition' && (
              <div role="group" aria-label="Sample editions" className="flex flex-wrap gap-2">
                {EDITIONS.map((e, i) => (
                  <button
                    key={e.themeName}
                    type="button"
                    aria-pressed={i === editionIndex}
                    onClick={() => {
                      tookOver.current = true;
                      setEditionIndex(i);
                    }}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-3 py-2 font-sans text-sm transition-colors',
                      i === editionIndex
                        ? 'border-earth-600 text-earth-600'
                        : 'border-border text-earth-500 hover:border-earth-300'
                    )}
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: e.palette.primary }}
                      aria-hidden
                    />
                    {e.themeName}
                  </button>
                ))}
              </div>
            )}

            {step === 'words' && (
              <p className="font-sans text-sm text-earth-500">
                Click any highlighted line and rewrite it. Nothing here is saved; on your own trip,
                every edit is kept and the AI's version is one click away.
              </p>
            )}

            {step === 'print' && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="rounded-full border border-earth-200 px-3 py-1 font-sans text-xs uppercase tracking-widest text-earth-500">
                  Finalized
                </span>
                <span className="font-sans text-sm text-earth-500">
                  Freeze it when the plan is set, print copies, and everyone on the trip can open it.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowcaseStage;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/landing/print-showcase/ShowcaseStage.test.tsx`
Expected: PASS (8 tests). If the "rewrite a line" test cannot find the cover
title field, check that `renderCopy` is wired to `PrintDocument`'s `renderCopy`
prop and that the edition's `cover.tagline` is non-empty; `PrintDocument` only
renders an empty optional slot when `isEditing` is set.

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/print-showcase/ShowcaseStage.tsx src/components/landing/print-showcase/ShowcaseStage.test.tsx
git commit -m "$(cat <<'EOF'
feat: add the interactive Print Studio showcase stage

Five steps from timeline to printed edition, running the product's own
renderer and editor over committed fixture data.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: The landing section and its lazy mount

**Files:**
- Create: `src/components/landing/sections/PrintStudioShowcase.tsx`
- Create: `src/components/landing/sections/PrintStudioShowcase.test.tsx`
- Modify: `src/components/landing/WhySignUp.tsx`

**Interfaces:**
- Consumes: `ShowcaseStage` (Task 9), lazily.
- Produces: default export `PrintStudioShowcase`.

- [ ] **Step 1: Write the failing test**

Create `src/components/landing/sections/PrintStudioShowcase.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PrintStudioShowcase from './PrintStudioShowcase';

vi.mock('../print-showcase/ShowcaseStage', () => ({
  default: () => <div data-testid="showcase-stage" />,
}));

const renderSection = () =>
  render(
    <MemoryRouter>
      <PrintStudioShowcase />
    </MemoryRouter>
  );

describe('PrintStudioShowcase', () => {
  it('puts its heading and pitch in the static markup, for prerendering and SEO', () => {
    renderSection();
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/print studio/i)).toBeInTheDocument();
  });

  it('is linkable from the pricing section', () => {
    const { container } = renderSection();
    expect(container.querySelector('#print-studio')).toBeTruthy();
  });

  it('holds the stage’s space without mounting it until it is near the screen', () => {
    renderSection();
    // jsdom's IntersectionObserver never fires, which is exactly the
    // "not scrolled there yet" case.
    expect(screen.queryByTestId('showcase-stage')).not.toBeInTheDocument();
    expect(screen.getByTestId('showcase-placeholder')).toBeInTheDocument();
  });

  it('offers a way in without stealing the page’s one sunset button', () => {
    renderSection();
    const cta = screen.getByRole('link', { name: /try it on your trip/i });
    expect(cta).toHaveAttribute('href', '/auth?mode=signup');
    expect(cta.className).not.toMatch(/sunset/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/landing/sections/PrintStudioShowcase.test.tsx`
Expected: FAIL — cannot resolve `./PrintStudioShowcase`.

- [ ] **Step 3: Write the section**

Create `src/components/landing/sections/PrintStudioShowcase.tsx`:

```tsx
// The Print Studio's place on the landing page: the one paid feature, shown
// rather than described.
//
// The heading and pitch are static so they prerender and index. The stage is a
// separate chunk that mounts when the section nears the viewport — it pulls in
// the document renderer, its stylesheet and edition fonts, none of which
// belong in the landing page's first paint.

import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const ShowcaseStage = lazy(() => import('../print-showcase/ShowcaseStage'));

const PrintStudioShowcase = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px' }
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="print-studio" className="bg-background py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          className="max-w-2xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: '-80px' }}
        >
          <p className="font-sans text-sm uppercase tracking-widest text-earth-500">Print Studio</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl text-earth-600 [text-wrap:balance]">
            The plan you made, set as something to keep
          </h2>
          <p className="mt-4 font-sans text-lg text-earth-500 leading-relaxed [text-wrap:pretty]">
            Every trip can be a clean printed PDF, free. For $3.99 a month, the Studio takes the
            same itinerary and designs it: a palette, typefaces, a motif, and a line written for
            each day. Then you rewrite any line you like and print it.
          </p>
        </motion.div>

        <div ref={hostRef} className="mt-10" data-testid="showcase-host">
          {nearViewport ? (
            <Suspense fallback={<div data-testid="showcase-placeholder" className="min-h-[28rem]" />}>
              <ShowcaseStage />
            </Suspense>
          ) : (
            // Reserves the stage's height so arriving at it shifts nothing.
            <div data-testid="showcase-placeholder" className="min-h-[28rem]" />
          )}
        </div>

        <div className="mt-8">
          <Button size="lg" asChild>
            <Link to="/auth?mode=signup">Try it on your trip</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PrintStudioShowcase;
```

- [ ] **Step 4: Mount it on the landing page**

In `src/components/landing/WhySignUp.tsx`, import the section and place it
between `ValueProps` and `PricingClarity`:

```tsx
import PrintStudioShowcase from "./sections/PrintStudioShowcase";
```

```tsx
      <ValueProps />
      <PrintStudioShowcase />
      <PricingClarity />
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/components/landing`
Expected: PASS (4 new tests plus any existing landing tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/landing/sections/PrintStudioShowcase.tsx src/components/landing/sections/PrintStudioShowcase.test.tsx src/components/landing/WhySignUp.tsx
git commit -m "$(cat <<'EOF'
feat: add the Print Studio section to the landing page

Static heading and pitch for prerendering; the interactive stage is a
lazy chunk that mounts when the section nears the viewport.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Align the copy everywhere else, and the docs

**Files:**
- Modify: `src/components/landing/sections/PricingClarity.tsx`
- Modify: `src/pages/Guide.tsx`
- Modify: `src/pages/Profile.tsx` (the Studio bullet, around line 176)
- Modify: `src/components/trip/ai-assistant/PaywallModal.tsx` (around line 190)
- Modify: `src/pages/LLMTraining.tsx` (around lines 23 and 255)
- Modify: `CLAUDE.md` (§6, §7, §23)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Update the pricing section**

In `src/components/landing/sections/PricingClarity.tsx`:

```tsx
const freeFeatures = [
  "Unlimited trips",
  "Unlimited AI chat with the Trip Assistant",
  "20 document imports a day",
  "Share with anyone, to view or edit",
  "Timeline, calendar, and map views",
  "Simple PDF itinerary and calendar sync",
];

const proFeatures = [
  "Everything in Free",
  "Print Studio: your itinerary as a designed edition",
  "A custom palette, type, and theme for every trip",
  "Every line of copy is yours to rewrite",
  "Early access to new features",
  "Cancel anytime",
];
```

In the intro paragraph, replace the last sentence with:

```tsx
            Planning, sharing, exporting, and AI chat cost nothing, on as many
            trips as you like. Every trip prints as a simple PDF for free; the
            $3.99 a month buys the Print Studio, which designs the same
            itinerary as a keepsake edition.
```

Under the Pro card's `FeatureList`, above its button, add the anchor link:

```tsx
              <a
                href="#print-studio"
                className="mt-6 inline-block font-sans text-sm text-earth-500 underline underline-offset-4 hover:text-earth-600"
              >
                See what an edition looks like
              </a>
```

- [ ] **Step 2: Merge the two Guide cards into one**

In `src/pages/Guide.tsx`, delete both the "Print or save a PDF" item and the
"Make a keepsake edition (Pro)" item, and put this single item in their place:

```tsx
      {
        icon: Printer,
        title: 'Print it, simply or designed',
        body: 'Every trip exports as a simple PDF, free: a proper typeset itinerary to print, email, or keep on your phone for the flight when there is no signal. With Pro, the Print Studio designs the same itinerary as a keepsake edition — a palette, a typeface pairing, a motif, and a line of copy for each day — and every line it writes is yours to rewrite. Either way, the bookings and times come from your itinerary.',
        to: (p) => (p ? `${p}/timeline?print=1` : null),
        actionLabel: 'Open it',
      },
```

If `FileDown` is now unused in that file, remove it from the lucide import.

- [ ] **Step 3: Align the two Pro bullets**

In `src/pages/Profile.tsx` (~line 176) and
`src/components/trip/ai-assistant/PaywallModal.tsx` (~line 190), replace
`Print Studio: keepsake itineraries designed by AI` with
`Print Studio: your itinerary as a designed edition`.

- [ ] **Step 4: Update the LLM-facing description**

In `src/pages/LLMTraining.tsx`:

- Line ~23: replace `and a professional PDF export` with
  `and a free PDF export of any itinerary`, and replace
  `A Pro subscription adds the Print Studio, which art-directs a keepsake printed edition of a trip.`
  with
  `A Pro subscription adds the Print Studio, which art-directs the same itinerary as a keepsake printed edition whose copy the traveler can rewrite.`
- Line ~255: after the first sentence, add
  `Every trip can be printed as a plain PDF for free; the Studio is the designed version of that same itinerary.`

- [ ] **Step 5: Update CLAUDE.md**

Make these four edits, using this exact wording.

1. §6, **Trip Details Page**, the deep-link bullet. Replace the `?export=pdf` and
   `?print=1` clauses with:

```
`?sync=1` (calendar sync sheet), `?export=pdf` and `?print=1` (both open the single Print dialog — `export=pdf` on its Simple PDF half, `print=1` on its Studio half)
```

2. §7, **PDF Export**, as a new first bullet:

```
- **Entry point**: the Simple PDF section of the Print dialog (`components/trip/print-studio/SimplePdfSection.tsx`). `ExportPdfButton` and `PdfExportDialog` are gone; the pdfmake pipeline below is unchanged
```

3. §23, **Print Studio**, replace the first sentence of the Entry paragraph with:

```
Entry: one **Print** button in the TimelineView toolbar opens `PrintStudioDialog`, which holds both halves — a free **Simple PDF** section (`SimplePdfSection.tsx`, the pdfmake export of §7) above a **Studio edition** section. Pro members get the theme field; free members see their own trip rendered by `PrintDocument` in the fixed `SAMPLE_TEASER_DESIGN` (`src/lib/printDesign/sample.ts`) — no AI call, no invented prose — with the upgrade button beneath. Anyone with trip access can open existing editions.
```

and add this bullet at the end of §23:

```
- **Landing page**: `components/landing/sections/PrintStudioShowcase.tsx` + `components/landing/print-showcase/` — a five-step demo (timeline → simple PDF → edition → rewritten words → print) that runs the real `PrintDocument` and `EditableCopy` over committed fixtures, so it cannot drift from the product and calls nothing at runtime. The stage is a lazy chunk mounted near the viewport. Regenerate the fixtures with `npm run build:print-showcase` (needs `OPENAI_API_KEY`, three model calls; the PDF-page image step uses macOS `sips`); `print-showcase/showcase.test.ts` holds the committed editions to the sanitizer and the house voice
```

4. **Important Files & Patterns** table, two new rows:

```
| `src/lib/printDesign/sample.ts` | Fixed sample design for the free Studio preview (no AI call, no prose) |
| `components/landing/print-showcase/` | Landing-page Print Studio demo — fixture, generated editions, interactive stage |
```

- [ ] **Step 6: Verify the whole suite and the lint**

Run: `npx vitest run`
Expected: PASS. Investigate any failure; do not skip tests.

Run: `npm run lint`
Expected: no new errors from the files in this plan.

- [ ] **Step 7: Check the claims in the new copy against the product**

Run: `grep -rn "share with anyone\|send.*link.*friend" src/components/landing src/pages/Guide.tsx`
Expected: only the Free tier's existing "Share with anyone, to view or edit"
line (which is about trip sharing and is true). No new copy promising a public
link to an edition.

- [ ] **Step 8: Commit**

```bash
git add src/components/landing/sections/PricingClarity.tsx src/pages/Guide.tsx src/pages/Profile.tsx src/components/trip/ai-assistant/PaywallModal.tsx src/pages/LLMTraining.tsx CLAUDE.md
git commit -m "$(cat <<'EOF'
docs: describe the PDF as the free version of the Print Studio

Pricing, guide, profile, paywall and the LLM-facing page now tell one
story: every trip prints as a simple PDF for free, and Pro designs the
same itinerary as an edition whose copy you can rewrite.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: See it running

The tests prove the parts; this proves the page.

**Files:** none.

- [ ] **Step 1: Start the app**

Run: `npm run dev`
Open `http://localhost:8080/`.

- [ ] **Step 2: Check the landing section**

- Scroll to the Print Studio section. The stage appears before you reach it.
- Walk all five steps. Switching editions must not change any itinerary line.
- On the "Your words" step, rewrite the cover title, then revert it.
- Narrow the window to 375px: the step rail scrolls, the sheet fits, and the
  page never scrolls sideways.
- Turn on Reduce Motion in the OS and reload: no autoplay, no sliding.

- [ ] **Step 3: Check the dialog on a trip**

- Open a trip, press `Print`. Both sections are visible; `Download PDF` produces
  a file.
- As a free account, confirm the preview shows that trip's own cover and day
  one, and that `Unlock the Print Studio` opens checkout.
- Visit `/trip/<id>/timeline?print=1` and confirm the dialog opens scrolled to
  the Studio half.

- [ ] **Step 4: Report**

Summarize what you saw, with anything that looked wrong, and stop. Do not open
a pull request without being asked.
