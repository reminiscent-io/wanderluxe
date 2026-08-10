# PDF Export Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the itinerary PDF export render identically for every user — no stretched images, no tofu glyphs, no orphaned day headers or half-empty pages, one type scale, one layout regardless of device or locale — and lock it in with regression tests.

**Architecture:** Keep the export fully client-side on pdfmake (no server dependency). Stage 1 fixes the visible bugs in place. Stage 2 collapses the device/locale layout forks into one themed, canonical document. Stage 3 extracts a pure `buildDocDefinition(data, options)` separated from Supabase fetching and browser delivery, then pins it with snapshot, invariant, and render-smoke tests.

**Tech Stack:** TypeScript, pdfmake 0.2.23 (browser build for the app, Node printer for tests), Vitest (jsdom env, globals on, `@` → `src` alias), date-fns, existing DM Sans / DM Serif Display TTFs in `src/assets/fonts/pdf/`.

---

## Background (from the 2026-06-10 audit)

Verified failures in `src/services/pdfmake-export.ts` (1,471 lines), reproduced by rendering a pixel-true mirror with the Node printer:

1. **Stretched images** — cover image forces both `width` and `height` (line ~828); thumbnails force `28×28` (line ~584). pdfmake distorts to fit. Covers are also downscaled to ~72 DPI (canvas target = contentWidth *px* rendered at the same number of *points*).
2. **Tofu** — `✈` (U+2708) used in day headers does not exist in DM Sans / DM Serif Display; renders as a box.
3. **Pagination fights** — `calculatePageFit` (line ~682) guesses page capacity by item count and inserts hard breaks while pdfmake paginates for real by height. Result: orphaned day headers at page bottoms and pages 40% empty.
4. **No type scale** — body text 8–9pt; ~30 call sites compute sizes via ad-hoc arithmetic (`baseFontSize - 0.5`, `+ 4`, …) producing 14 fractional sizes.
5. **Forked layout** — UA sniffing picks mobile vs desktop presets; browser locale silently picks LETTER vs A4. The same trip exports differently per device.
6. **Dead code** — `renderAccommodationSummary`, `renderTransportSummary`, `renderDailySummary`, `getDensityIndicator`, 8 named styles, the `imageWidth` preset, and the unreachable `strategy`/`pagePreset` plumbing (`PdfExportOptions` only carries `showImages`/`showCosts`).
7. **Smaller items** — PNG transparency turns black in JPEG conversion; object URLs never revoked; failed image fetches silently vanish; `$` hardcoded in budget while items show `EUR 780`; 20–24pt margins below printer safe zones.

## Conventions for this plan

- **Branch:** create `feature/pdf-export-consistency` off `main-agent` before Task 1.
- **The working tree has unrelated uncommitted changes** (ActivityForm, RestaurantReservationForm, LuxuryDateTimeRangePicker, settings). Never `git add -A` / `git add .`. Stage only the exact paths listed in each commit step.
- **Commands:** `bun` is not on PATH. Use `npx tsc --noEmit`, `npx vitest run <path>`, `npx eslint <path>`.
- **Commit messages** follow repo convention (`feat(pdf-export): …`, `fix(pdf-export): …`, `refactor(pdf-export): …`, `test(pdf-export): …`) and end with:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- Line numbers cited below are from the audit snapshot of `src/services/pdfmake-export.ts`; they drift as tasks land. Function names are authoritative.

## Target file structure

```
src/services/
├── pdfmake-export.ts        # MODIFIED in place (Stages 1–2), thin orchestrator after Stage 3
└── pdf/
    ├── theme.ts             # Stage 1: TYPE/SPACE/COLORS/PAGE/FONTS tokens + page geometry helpers
    ├── theme.test.ts        # Stage 1: token invariants
    ├── images.ts            # Stage 1: cover-crop geometry + canvas dataURI pipeline
    ├── images.test.ts       # Stage 1: pure geometry tests
    ├── pagination.ts        # Stage 1: orphan-heading predicate
    ├── pagination.test.ts   # Stage 1
    ├── format.ts            # Stage 2: fmtMoney; Stage 3: all formatters move here
    ├── format.test.ts       # Stage 2–3
    ├── types.ts             # Stage 3: PdfTripData, ResolvedPdfOptions, Item, Day, …
    ├── data.ts              # Stage 3: Supabase fetch + image resolution → PdfTripData
    ├── builder.ts           # Stage 3: pure buildDocDefinition(data, opts)
    ├── builder.test.ts      # Stage 3: snapshots + invariants
    ├── render.test.ts       # Stage 3: Node-printer smoke test (+ PDF_PREVIEW artifact)
    └── fixtures.ts          # Stage 3: deterministic Rome trip fixture
src/components/trip/
└── PdfExportDialog.tsx      # Stage 2: page-size control; Stage 3: re-exports options type
CLAUDE.md                    # Stage 3: correct stale docs
```

`src/services/pdf-fonts.ts`, `src/components/trip/ExportPdfButton.tsx` are untouched.

---

# Stage 1 — Stop the visible breakage

Ships: undistorted sharp images, no tofu, no orphaned headers, no half-empty pages.

### Task 1: Theme tokens

**Files:**
- Create: `src/services/pdf/theme.ts`
- Test: `src/services/pdf/theme.test.ts`

- [ ] **Step 1: Create branch**

```bash
git checkout main-agent && git pull && git checkout -b feature/pdf-export-consistency
```

- [ ] **Step 2: Write the failing test**

```ts
// src/services/pdf/theme.test.ts
import { describe, it, expect } from 'vitest';
import { TYPE, SPACE, COLORS, PAGE, FONTS, innerPageWidth } from './theme';

describe('pdf theme tokens', () => {
  it('type scale is strictly descending and print-legible (>= 8.5pt)', () => {
    const ordered = [TYPE.display, TYPE.title, TYPE.section, TYPE.body, TYPE.detail, TYPE.caption];
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i]).toBeLessThan(ordered[i - 1]);
    }
    expect(TYPE.caption).toBeGreaterThanOrEqual(8.5);
  });

  it('page margins meet the 36pt printer safe zone', () => {
    for (const m of PAGE.margins) expect(m).toBeGreaterThanOrEqual(36);
  });

  it('spacing scale is ascending', () => {
    const ordered = [SPACE.xs, SPACE.sm, SPACE.md, SPACE.lg, SPACE.xl, SPACE.xxl];
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i]).toBeGreaterThan(ordered[i - 1]);
    }
  });

  it('colors are 6-digit hex (pdfmake requirement)', () => {
    for (const c of Object.values(COLORS)) expect(c).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('computes inner page width from page size and margins', () => {
    expect(innerPageWidth('LETTER', [40, 48, 40, 48])).toBe(532);
    expect(innerPageWidth('A4', [40, 48, 40, 48])).toBeCloseTo(515.28, 2);
  });

  it('exposes font family names matching pdf-fonts registration', () => {
    expect(FONTS.serif).toBe('DMSerifDisplay');
    expect(FONTS.sans).toBe('DMSans');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/services/pdf/theme.test.ts`
Expected: FAIL — `Cannot find module './theme'` (or "Failed to resolve import").

- [ ] **Step 4: Write the theme module**

```ts
// src/services/pdf/theme.ts
/**
 * Single source of truth for the PDF document's visual system.
 * Every size, color, and spacing in the export must come from here —
 * builder.test.ts enforces this with invariant tests.
 */

export const COLORS = {
  earth: '#6B6354',
  earthLight: '#8A7F6C',
  earthMid: '#A89B8E',
  sand: '#FAF9F7',
  accent: '#5C544A',
  sunset: '#D97706',
  white: '#FFFFFF',
  rule: '#E6E2DE',      // hairline table separators
  totalFill: '#F5F3F2', // budget total row background
} as const;

/** Point sizes. One scale for the whole document — no arithmetic on these. */
export const TYPE = {
  display: 24, // cover title
  title: 16,   // page-level headings ("Reference Information")
  section: 12, // section + day headings, cover subtitle
  body: 10,    // item titles, primary text
  detail: 9,   // secondary text, time column, day descriptions
  caption: 8.5,// header/footer chrome, table cells, costs, tags
} as const;

/** Vertical rhythm (points). */
export const SPACE = { xs: 2, sm: 4, md: 8, lg: 12, xl: 16, xxl: 24 } as const;

export const FONTS = { serif: 'DMSerifDisplay', sans: 'DMSans' } as const;

export type PdfPageSize = 'LETTER' | 'A4';

export const PAGE = {
  /** [left, top, right, bottom] — 40/48pt clears every consumer printer's dead zone. */
  margins: [40, 48, 40, 48] as [number, number, number, number],
  headerOffsetY: 20,    // header text offset inside the top margin band
  footerOffsetY: 18,    // footer text offset inside the bottom margin band
  timeColWidth: 56,
  thumbSize: 28,        // square thumbnail box (points)
  thumbScale: 3,        // bitmap supersampling for thumbnails (~216 DPI)
  coverImageHeight: 240,
  coverScale: 2,        // bitmap supersampling for the cover (~144 DPI)
} as const;

const PAGE_WIDTHS: Record<PdfPageSize, number> = { A4: 595.28, LETTER: 612 };

export function innerPageWidth(
  pageSize: PdfPageSize,
  margins: [number, number, number, number]
): number {
  return PAGE_WIDTHS[pageSize] - margins[0] - margins[2];
}

/** US locales print on Letter; everyone else on A4. Used only as a UI default. */
export function defaultPageSize(): PdfPageSize {
  const loc = (Intl.DateTimeFormat().resolvedOptions().locale || '').toLowerCase();
  return loc.startsWith('en-us') ? 'LETTER' : 'A4';
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/services/pdf/theme.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/services/pdf/theme.ts src/services/pdf/theme.test.ts
git commit -m "feat(pdf-export): add theme tokens for type scale, spacing, colors, page geometry

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 2: Delete dead code

**Files:**
- Modify: `src/services/pdfmake-export.ts`

- [ ] **Step 1: Confirm the functions are unreferenced**

Run: `grep -n "renderAccommodationSummary\|renderTransportSummary\|renderDailySummary\|getDensityIndicator" src/services/pdfmake-export.ts`
Expected: only the four `function` definitions and their internal calls (`getDensityIndicator` is called only by `renderDailySummary`). No call sites elsewhere.

- [ ] **Step 2: Delete dead functions**

In `src/services/pdfmake-export.ts` delete entirely:
- `getDensityIndicator` (lines ~225–233)
- `renderAccommodationSummary` (~611–637)
- `renderTransportSummary` (~639–653)
- `renderDailySummary` (~655–672)
- The section comment `/* Summary sections */` above them.

- [ ] **Step 3: Delete dead styles and dead preset fields**

In the `styles:` object of the doc definition (lines ~1317–1333), delete these keys (referenced only by the deleted functions or by nothing): `heroTitle`, `heroSub`, `summaryPageTitle`, `summaryTitle`, `summaryHeader`, `summaryCell`, `summaryItem`, `dayHeader`.

Keep: `timeCell`, `itemTitle`, `itemDetail`, `itemMeta`, `itemCost`.

In `pagePresetSettings` (lines ~126–145), delete the now-unused return fields `heroTitle`, `dayHeader`, `imageWidth` (the comment on `imageWidth` claims it's a downscale target, but nothing reads it). In `exportItineraryPdf`, remove `heroTitle`, `dayHeader`, `imageWidth` from the destructuring (lines ~1184–1197).

- [ ] **Step 4: Verify**

Run: `grep -n "heroTitle\|heroSub\|summaryPageTitle\|summaryTitle\|summaryHeader\|summaryCell\|summaryItem\|imageWidth\|getDensityIndicator" src/services/pdfmake-export.ts`
Expected: no matches.

Run: `npx tsc --noEmit`
Expected: clean (same baseline as before the change).

- [ ] **Step 5: Commit**

```bash
git add src/services/pdfmake-export.ts
git commit -m "refactor(pdf-export): delete dead summary renderers, styles, and preset fields

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 3: Cover-crop geometry (pure functions)

**Files:**
- Create: `src/services/pdf/images.ts`
- Test: `src/services/pdf/images.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/services/pdf/images.test.ts
import { describe, it, expect } from 'vitest';
import { computeCoverCrop, computeOutputSize } from './images';

describe('computeCoverCrop (CSS object-fit: cover semantics)', () => {
  it('crops a portrait source vertically to fill a wide box', () => {
    // 400x600 portrait into a 564x250 banner (the audit's stretched-cover case)
    const crop = computeCoverCrop(400, 600, 564, 250);
    expect(crop).toEqual({ sx: 0, sy: 212, sw: 400, sh: 177 });
  });

  it('crops a landscape source horizontally to fill a square box', () => {
    const crop = computeCoverCrop(1600, 900, 28, 28);
    expect(crop).toEqual({ sx: 350, sy: 0, sw: 900, sh: 900 });
  });

  it('returns the full source when aspect ratios already match', () => {
    const crop = computeCoverCrop(1128, 500, 564, 250);
    expect(crop).toEqual({ sx: 0, sy: 0, sw: 1128, sh: 500 });
  });
});

describe('computeOutputSize', () => {
  it('supersamples to scale x the box for print sharpness', () => {
    const crop = { sx: 0, sy: 0, sw: 2256, sh: 1000 };
    expect(computeOutputSize(crop, 564, 250, 2)).toEqual({ w: 1128, h: 500 });
  });

  it('never upscales beyond the source crop width', () => {
    const crop = { sx: 0, sy: 212, sw: 400, sh: 177 };
    // 2x of 564 would be 1128, but the source only has 400px across
    expect(computeOutputSize(crop, 564, 250, 2)).toEqual({ w: 400, h: 177 });
  });

  it('keeps the box aspect ratio in the output bitmap', () => {
    const { w, h } = computeOutputSize({ sx: 0, sy: 0, sw: 5000, sh: 5000 }, 28, 28, 3);
    expect(w).toBe(84);
    expect(h).toBe(84);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/pdf/images.test.ts`
Expected: FAIL — cannot resolve `./images`.

- [ ] **Step 3: Implement the geometry**

```ts
// src/services/pdf/images.ts
/**
 * Image pipeline for the PDF export.
 * Geometry is pure (unit-tested); the canvas/fetch glue is browser-only and
 * verified via the Stage 3 render preview + manual QA.
 */

export type CropRect = { sx: number; sy: number; sw: number; sh: number };

/**
 * Centered source rect with the target box's aspect ratio
 * (CSS `object-fit: cover`). Guarantees zero distortion when the
 * crop is drawn into the box.
 */
export function computeCoverCrop(
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number
): CropRect {
  const srcRatio = srcW / srcH;
  const targetRatio = targetW / targetH;
  if (srcRatio > targetRatio) {
    const sw = Math.round(srcH * targetRatio);
    return { sx: Math.round((srcW - sw) / 2), sy: 0, sw, sh: srcH };
  }
  const sh = Math.round(srcW / targetRatio);
  return { sx: 0, sy: Math.round((srcH - sh) / 2), sw: srcW, sh };
}

/**
 * Output bitmap size: `scale`x the PDF point box (print sharpness),
 * capped at the source crop width so we never upscale.
 */
export function computeOutputSize(
  crop: CropRect,
  boxW: number,
  boxH: number,
  scale: number
): { w: number; h: number } {
  const w = Math.min(crop.sw, Math.round(boxW * scale));
  const h = Math.round(w * (boxH / boxW));
  return { w: Math.max(1, w), h: Math.max(1, h) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/pdf/images.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/pdf/images.ts src/services/pdf/images.test.ts
git commit -m "feat(pdf-export): add pure cover-crop geometry with supersampling caps

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 4: Canvas pipeline + swap call sites (kills stretching)

**Files:**
- Modify: `src/services/pdf/images.ts`
- Modify: `src/services/pdfmake-export.ts`

- [ ] **Step 1: Append the browser glue to `src/services/pdf/images.ts`**

```ts
// --- browser-only glue below (not unit-testable in jsdom; see render preview) ---

const imgCache = new Map<string, Promise<string>>();

/**
 * Fetch a remote image and return a JPEG data URI center-cropped to exactly
 * the boxW:boxH aspect ratio at `scale`x resolution. Returns '' on any
 * failure (CORS, network, decode) — callers decide placeholder behavior.
 */
export async function imageToCoverDataURI(
  url: string,
  boxW: number,
  boxH: number,
  scale: number
): Promise<string> {
  if (!url) return '';
  const key = `${url}@${boxW}x${boxH}@${scale}`;
  const hit = imgCache.get(key);
  if (hit) return hit;

  const job = (async () => {
    try {
      const resp = await fetch(url, { mode: 'cors' });
      if (!resp.ok) throw new Error('Image fetch failed');
      const blob = await resp.blob();
      return (await drawCover(blob, boxW, boxH, scale)) ?? '';
    } catch {
      return '';
    }
  })();

  imgCache.set(key, job);
  return job;
}

function loadImage(blob: Blob): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    img.src = objectUrl;
  });
}

async function drawCover(
  blob: Blob,
  boxW: number,
  boxH: number,
  scale: number
): Promise<string | null> {
  const img = await loadImage(blob);
  if (!img || !img.width || !img.height) return null;
  try {
    const crop = computeCoverCrop(img.width, img.height, boxW, boxH);
    const { w, h } = computeOutputSize(crop, boxW, boxH, scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // White underlay so PNG transparency doesn't go black in the JPEG.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return null; // tainted canvas (CORS) or draw failure
  }
}
```

- [ ] **Step 2: Swap the two call sites in `src/services/pdfmake-export.ts`**

Add imports at the top:

```ts
import { imageToCoverDataURI } from './pdf/images';
import { PAGE } from './pdf/theme';
```

In `buildDays` (the `o.showImages` block, lines ~524–545), replace:

```ts
toDataURI(url, 96).then((dataUrl) => {
```

with:

```ts
imageToCoverDataURI(url, PAGE.thumbSize, PAGE.thumbSize, PAGE.thumbScale).then((dataUrl) => {
```

In `exportItineraryPdf` (cover image block, lines ~1232–1237), replace:

```ts
coverDataUrl = await toDataURI(trip.cover_image_url, Math.round(contentWidth));
```

with:

```ts
coverDataUrl = await imageToCoverDataURI(
  trip.cover_image_url,
  Math.round(contentWidth),
  coverImageHeight,
  PAGE.coverScale
);
```

- [ ] **Step 3: Delete the old image helpers from `pdfmake-export.ts`**

Delete `imgCache`, `toDataURI`, `blobToDataURL`, `drawToCanvas` (lines ~235–300) and the section comment above them.

- [ ] **Step 4: Verify**

Run: `grep -n "toDataURI\|drawToCanvas\|blobToDataURL" src/services/pdfmake-export.ts`
Expected: only `imageToCoverDataURI` import/usages remain.

Run: `npx tsc --noEmit`
Expected: clean.

The image nodes (`width: 28, height: 28` thumb; cover `width: contentWidth, height: coverImageHeight`) are intentionally unchanged — they're now safe because the bitmap aspect ratio matches the box exactly.

- [ ] **Step 5: Commit**

```bash
git add src/services/pdf/images.ts src/services/pdfmake-export.ts
git commit -m "fix(pdf-export): center-crop images to their boxes; 2-3x supersampling; white PNG underlay

Cover and thumbnail nodes force both width and height, which made pdfmake
stretch any image whose aspect ratio differed. Bitmaps are now pre-cropped
to the exact box ratio, supersampled for print, and object URLs are revoked.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 5: Replace the ✈ glyph (kills tofu)

**Files:**
- Modify: `src/services/pdfmake-export.ts` (`renderCompactDayHeader`, lines ~710–753)

- [ ] **Step 1: Rewrite the day-header text as styled runs**

In `renderCompactDayHeader`, replace:

```ts
const travelMarker = d.hasTransport ? ' ✈ TRAVEL DAY' : '';
const dayText = d.title?.trim()
  ? `${fmtShort(d.date)} • ${d.title}${travelMarker}`
  : `${fmtShort(d.date)}${travelMarker}`;
```

with:

```ts
const dayText = d.title?.trim()
  ? `${fmtShort(d.date)} • ${d.title}`
  : fmtShort(d.date);
```

and replace the first stack entry:

```ts
{
  text: dayText,
  fontSize,
  bold: false,
  font: 'DMSerifDisplay',
  color: BRAND.earth,
  margin: [0, isFirstOnPage ? 0 : 10, 0, 2] as [number, number, number, number],
},
```

with:

```ts
{
  text: [
    { text: dayText },
    ...(d.hasTransport
      ? [{
          text: '   TRAVEL DAY',
          fontSize: TYPE.caption,
          font: FONTS.sans,
          color: COLORS.sunset,
          characterSpacing: 1,
        }]
      : []),
  ],
  fontSize,
  bold: false,
  font: 'DMSerifDisplay',
  color: BRAND.earth,
  margin: [0, isFirstOnPage ? 0 : 10, 0, 2] as [number, number, number, number],
},
```

Add to the theme import in this file (extend the existing import from Task 4):

```ts
import { PAGE, TYPE, COLORS, FONTS } from './pdf/theme';
```

- [ ] **Step 2: Verify no airplane glyphs remain anywhere in the export**

Run: `grep -rn "✈" src/services/`
Expected: no matches (the other two ✈ sites died with the dead code in Task 2).

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/services/pdfmake-export.ts
git commit -m "fix(pdf-export): replace U+2708 airplane with styled TRAVEL DAY tag

DM Sans / DM Serif Display have no glyph for the airplane character, so it
rendered as a tofu box in day headers.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 6: Real pagination (kills orphaned headers and empty pages)

**Files:**
- Create: `src/services/pdf/pagination.ts`
- Test: `src/services/pdf/pagination.test.ts`
- Modify: `src/services/pdfmake-export.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/services/pdf/pagination.test.ts
import { describe, it, expect } from 'vitest';
import { isOrphanedHeading } from './pagination';

describe('isOrphanedHeading', () => {
  it('breaks when a heading would be the last node on the page', () => {
    expect(isOrphanedHeading({ headlineLevel: 1 }, [])).toBe(true);
  });

  it('does not break when content follows the heading on the same page', () => {
    expect(isOrphanedHeading({ headlineLevel: 1 }, [{}])).toBe(false);
  });

  it('ignores non-heading nodes', () => {
    expect(isOrphanedHeading({}, [])).toBe(false);
    expect(isOrphanedHeading({ headlineLevel: 2 }, [])).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/pdf/pagination.test.ts`
Expected: FAIL — cannot resolve `./pagination`.

- [ ] **Step 3: Implement the predicate**

```ts
// src/services/pdf/pagination.ts
/**
 * pdfmake `pageBreakBefore` rule: a heading (headlineLevel 1) must never be
 * the last node on a page — push it to the next page with its content.
 * This replaces the old calculatePageFit item-count heuristic, which fought
 * pdfmake's real height-based pagination and produced orphaned day headers
 * and half-empty pages.
 */
export function isOrphanedHeading(
  node: { headlineLevel?: unknown },
  followingNodesOnPage: readonly unknown[]
): boolean {
  return node.headlineLevel === 1 && followingNodesOnPage.length === 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/pdf/pagination.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Delete the page-fit heuristic and let pdfmake paginate**

In `src/services/pdfmake-export.ts`:

1. Delete the `calculatePageFit` function (lines ~678–705) and its doc comment.
2. In `exportItineraryPdf`, replace the whole day loop (lines ~1258–1286):

```ts
// Daily itineraries with dynamic multi-day layout
let currentDayIdx = 0;
let pageStartIdx = 0;

while (currentDayIdx < days.length) {
  const daysOnPage = calculatePageFit(days, currentDayIdx);
  const isFirstPage = pageStartIdx === 0;

  // Add page break before each page (except first)
  if (!isFirstPage) {
    content.push({ text: '', pageBreak: 'before' });
  }

  // Render days for this page
  for (let i = 0; i < daysOnPage && currentDayIdx < days.length; i++) {
    const d = days[currentDayIdx];
    const isFirstOnPage = i === 0;

    // Compact day header with divider
    content.push(renderCompactDayHeader(d, isFirstOnPage, compactDayHeader, contentWidth));

    // Day items table
    content.push(renderTable(d.items, o, timeWidth));

    currentDayIdx++;
  }

  pageStartIdx++;
}
```

with:

```ts
// Daily itineraries — pdfmake paginates by real height; the pageBreakBefore
// rule (isOrphanedHeading) keeps day headers attached to their tables.
days.forEach((d, idx) => {
  content.push(renderCompactDayHeader(d, idx === 0, compactDayHeader, contentWidth));
  content.push(renderTable(d.items, o, timeWidth));
});
```

3. In `renderCompactDayHeader`, change the return statement from:

```ts
return { stack };
```

to:

```ts
return { stack, headlineLevel: 1, unbreakable: true };
```

4. Add the import and wire the rule into the doc definition (after `styles:` in the `TDocumentDefinitions` literal):

```ts
import { isOrphanedHeading } from './pdf/pagination';
```

```ts
pageBreakBefore: (currentNode, followingNodesOnPage) =>
  isOrphanedHeading(currentNode, followingNodesOnPage),
```

- [ ] **Step 6: Verify**

Run: `grep -n "calculatePageFit\|pageStartIdx\|daysOnPage" src/services/pdfmake-export.ts`
Expected: no matches.

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/services/pdf/pagination.ts src/services/pdf/pagination.test.ts src/services/pdfmake-export.ts
git commit -m "fix(pdf-export): replace item-count pagination heuristic with orphan-heading rule

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 7: Stage 1 checkpoint (manual QA)

- [ ] **Step 1: Static checks across everything touched**

Run: `npx tsc --noEmit && npx eslint src/services/pdf src/services/pdfmake-export.ts && npx vitest run src/services/pdf`
Expected: all clean/passing.

- [ ] **Step 2: Manual export QA**

Run: `npm run dev` (or `npx vite` for frontend-only), open `http://localhost:8080`, sign in, open a trip that has a portrait or square cover photo and at least one accommodation with an image, then Export PDF (images + costs on). Verify in the downloaded file:

- Cover photo fills its banner with no distortion (faces/circles look natural) and looks sharp when zoomed to 200%.
- Accommodation thumbnails are square crops, not squashed.
- Day headers show "TRAVEL DAY" as a small orange tag — no □ boxes anywhere.
- No day header sits alone at the bottom of a page; no page is more than ~half empty mid-document.

- [ ] **Step 3: Record findings**

If any QA item fails, fix it before proceeding to Stage 2 (these are the bugs this stage exists to fix). Nothing to commit if all pass.

---

# Stage 2 — One canonical document

Ships: identical output on every device and locale (page size becomes an explicit user choice), one type scale, consistent money formatting, comfortable print margins.

### Task 8: Money formatter

**Files:**
- Create: `src/services/pdf/format.ts`
- Test: `src/services/pdf/format.test.ts`
- Modify: `src/services/pdfmake-export.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/services/pdf/format.test.ts
import { describe, it, expect } from 'vitest';
import { fmtMoney } from './format';

describe('fmtMoney', () => {
  it('formats with currency symbol and grouping', () => {
    expect(fmtMoney(1234.5, 'EUR')).toBe('€1,234.50');
    expect(fmtMoney(54, 'USD')).toBe('$54.00');
  });

  it('defaults to USD when currency is missing', () => {
    expect(fmtMoney(50, null)).toBe('$50.00');
    expect(fmtMoney(50, undefined)).toBe('$50.00');
  });

  it('falls back gracefully on invalid currency codes', () => {
    expect(fmtMoney(50, 'ZZZ@')).toBe('ZZZ@ 50.00');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/pdf/format.test.ts`
Expected: FAIL — cannot resolve `./format`.

- [ ] **Step 3: Implement**

```ts
// src/services/pdf/format.ts
/**
 * Locale-pinned formatters for the PDF.
 * en-US is intentional: the exported document must look identical no matter
 * which browser/locale generated it.
 */

export function fmtMoney(amount: number, currency?: string | null): string {
  const code = currency || 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).format(amount);
  } catch {
    // Unknown/invalid ISO code in user data — show it verbatim.
    return `${code} ${amount.toFixed(2)}`;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/pdf/format.test.ts`
Expected: PASS (3 tests). If the `narrowSymbol` output differs in your Node ICU (e.g. `€1,234.50` vs `EUR 1,234.50`), trust the test run and update the *expected strings* to the actual narrowSymbol output — the invariant is "one formatter everywhere", not a specific symbol.

- [ ] **Step 5: Replace all money call sites in `pdfmake-export.ts`**

Add import: `import { fmtMoney } from './pdf/format';`

| Location | Old | New |
|---|---|---|
| accommodation item (~line 424) | `` cost: s.cost != null ? `${s.currency} ${s.cost}` : undefined `` | `cost: s.cost != null ? fmtMoney(s.cost, s.currency) : undefined` |
| transportation item (~line 458) | `` cost: t.cost != null ? `${t.currency} ${t.cost}` : undefined `` | `cost: t.cost != null ? fmtMoney(t.cost, t.currency) : undefined` |
| activity item (~line 475) | `` cost: a.cost != null ? `${a.currency} ${a.cost}` : undefined `` | `cost: a.cost != null ? fmtMoney(a.cost, a.currency) : undefined` |
| dining item (~line 506) | `` cost: r.cost != null ? `${r.currency} ${r.cost}` : undefined `` | `cost: r.cost != null ? fmtMoney(r.cost, r.currency) : undefined` |
| budget rows (`renderBudgetSummary`) | `` text: `$${c.amount.toFixed(2)}` `` | `text: fmtMoney(c.amount, 'USD')` |
| budget total | `` text: `$${budgetData.total.toFixed(2)}` `` | `text: fmtMoney(budgetData.total, 'USD')` |
| budget vs actual line (3 spots) | `` `Budget: $${budgetData.budget.toFixed(2)}` `` etc. | `` `Budget: ${fmtMoney(budgetData.budget, 'USD')}` `` / `` `Over budget by ${fmtMoney(Math.abs(remaining), 'USD')}` `` / `` `Remaining: ${fmtMoney(remaining, 'USD')}` `` |

Add this comment above the budget table body in `renderBudgetSummary`:

```ts
// Budget categories sum raw amounts across currencies and have always been
// labeled USD. Honest multi-currency totals need exchange-rate conversion —
// out of scope here (see plan: Out of scope).
```

- [ ] **Step 6: Verify**

Run: `grep -n 'toFixed(2)\|\${.*currency}' src/services/pdfmake-export.ts`
Expected: no matches (all money flows through `fmtMoney`).

Run: `npx tsc --noEmit && npx vitest run src/services/pdf`
Expected: clean / passing.

- [ ] **Step 7: Commit**

```bash
git add src/services/pdf/format.ts src/services/pdf/format.test.ts src/services/pdfmake-export.ts
git commit -m "feat(pdf-export): single locale-pinned money formatter for items and budget

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 9: Remove the device/locale layout fork

**Files:**
- Modify: `src/services/pdfmake-export.ts`
- Modify: `src/components/trip/PdfExportDialog.tsx` (type only; UI control is Task 11)

- [ ] **Step 1: Extend the options type**

In `src/components/trip/PdfExportDialog.tsx`:

```ts
import type { PdfPageSize } from '@/services/pdf/theme';

export interface PdfExportOptions {
  showImages: boolean;
  showCosts: boolean;
  /** Paper size; defaults to locale-appropriate size when omitted. */
  pageSize?: PdfPageSize;
}
```

- [ ] **Step 2: Delete the fork machinery in `pdfmake-export.ts`**

Delete entirely:
- `isProbablyMobile` (lines ~113–118)
- `defaultPageSize` (~120–124) — now lives in `pdf/theme.ts`
- `pagePresetSettings` (~126–145)
- `resolveStrategy` (~147–151)
- `innerPageWidth` (~153–158) — now lives in `pdf/theme.ts`
- the `ExportStrategy` and `PagePreset` type aliases (~58–59)
- the `BRAND` constant (~48–56) — replaced by `COLORS` from the theme (next task does the call-site sweep; in this task add `const BRAND = COLORS;` as a temporary alias so the build stays green, and remove it in Task 10)

Update the theme import to:

```ts
import {
  PAGE, TYPE, SPACE, COLORS, FONTS,
  innerPageWidth, defaultPageSize,
  type PdfPageSize,
} from './pdf/theme';
```

- [ ] **Step 3: Rewrite the head of `exportItineraryPdf` and the delivery tail**

Replace the preset destructuring block (lines ~1183–1199) with:

```ts
const pageSize: PdfPageSize = o.pageSize ?? defaultPageSize();
const contentWidth = innerPageWidth(pageSize, PAGE.margins);
const exportedAt = new Date();
```

Then fix the four references that used preset values:
- `coverImageHeight` → `PAGE.coverImageHeight` (cover call from Task 4)
- `compactDayHeader` (day loop) → `TYPE.section`
- `timeWidth` (day loop) → `PAGE.timeColWidth`
- `baseFontSize` is no longer destructured, but `renderCombinedCoverPage`, `renderBudgetSummary`, `renderReferenceSection`, and `buildActivityLevelEntries` still take it until Task 10 rewrites them. Add a temporary shim next to the `BRAND` alias so the build stays green between tasks: `const baseFontSize = 9; // TEMP shim, removed in Task 10`. Leave their call sites unchanged in this task.
- Likewise the styles dict and header/footer functions still reference `isMobile`, `headerFont`, and `footerFont` until Task 10 rewrites them. Add matching shims (desktop values, so the interim commit renders like today's desktop output): `const isMobile = false; const headerFont = 9; const footerFont = 8; // TEMP shims, removed in Task 10`.

In the doc definition replace `pageMargins,` with `pageMargins: PAGE.margins,` and keep `pageSize` (now the resolved const). In the footer, replace `fnsFormat(new Date(), 'PP p')` with `fnsFormat(exportedAt, 'PP p')`.

Replace the entire delivery `return new Promise<void>(…)` block (lines ~1345–1466, all three strategy branches) with one path — anchor download works on every platform:

```ts
const fileName = `${sanitizeFilename(trip.destination)}-itinerary.pdf`;
const pdf = pdfMake.createPdf(doc);

return new Promise<void>((resolve, reject) => {
  pdf.getBlob((blob: Blob) => {
    try {
      if (!blob) {
        reject(new Error('Failed to generate PDF blob'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve();
      }, 100);
    } catch (err) {
      reject(err);
    }
  });
});
```

Also delete the `const strategy = resolveStrategy(o);` line and the `[PDF Export]` `console.log` calls throughout the function (keep `console.error` in the catch blocks).

- [ ] **Step 4: Verify**

Run: `grep -n "isProbablyMobile\|pagePresetSettings\|resolveStrategy\|PagePreset\|ExportStrategy\|window.open" src/services/pdfmake-export.ts`
Expected: no matches.

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/services/pdfmake-export.ts src/components/trip/PdfExportDialog.tsx
git commit -m "feat(pdf-export): one canonical layout — remove UA/locale forks and strategy branches

The exported document no longer depends on which device or locale generated
it. Page size becomes an explicit option (locale only sets the default), and
delivery is a single download path.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 10: Apply the type scale and spacing everywhere

**Files:**
- Modify: `src/services/pdfmake-export.ts` (every render function + doc styles)

This is the big sweep. Every `fontSize:` arithmetic expression and every magic margin is replaced by theme tokens or named styles. The complete new code for each function follows — replace each function body wholesale.

- [ ] **Step 1: Replace the doc-level `defaultStyle`, `header`, `footer`, `styles`**

```ts
defaultStyle: { fontSize: TYPE.body, lineHeight: 1.3, font: FONTS.sans, color: COLORS.accent },
header: () => ({
  text: dateRange ? `${trip.destination} • ${dateRange}` : (trip.destination ?? ''),
  alignment: 'center' as const,
  style: 'pageChrome',
  margin: [0, PAGE.headerOffsetY, 0, 0] as [number, number, number, number],
}),
footer: (p: number, c: number) => ({
  text: `Page ${p} of ${c} • exported ${fnsFormat(exportedAt, 'PP p')}`,
  alignment: 'center' as const,
  style: 'pageChrome',
  margin: [0, PAGE.footerOffsetY, 0, 0] as [number, number, number, number],
}),
styles: {
  coverTitle: { fontSize: TYPE.display, font: FONTS.serif, color: COLORS.earth },
  coverSubtitle: { fontSize: TYPE.section, color: COLORS.earthLight },
  pageHeading: { fontSize: TYPE.title, font: FONTS.serif, color: COLORS.earth },
  sectionHeading: { fontSize: TYPE.section, font: FONTS.serif, color: COLORS.earth },
  dayDescription: { fontSize: TYPE.detail, italics: true, color: COLORS.earthLight },
  body: { fontSize: TYPE.body },
  timeCell: { fontSize: TYPE.detail, bold: true, color: COLORS.earthLight },
  itemTitle: { fontSize: TYPE.body, bold: true, color: COLORS.earth },
  itemDetail: { fontSize: TYPE.detail, color: COLORS.earthLight },
  itemMeta: { fontSize: TYPE.detail, italics: true, color: COLORS.earthMid },
  itemCost: { fontSize: TYPE.caption, color: COLORS.earthMid },
  tableHeader: { fontSize: TYPE.caption, bold: true, color: COLORS.white, fillColor: COLORS.earthLight },
  tableCell: { fontSize: TYPE.caption },
  tableCellStrong: { fontSize: TYPE.body, bold: true },
  metaText: { fontSize: TYPE.caption, color: COLORS.earthMid },
  pageChrome: { fontSize: TYPE.caption, color: COLORS.earthLight },
},
```

(`dateRange` and `exportedAt` are in scope inside `exportItineraryPdf`, where the doc literal lives.)

- [ ] **Step 2: Replace `renderTable`**

```ts
function renderTable(items: Item[], o: PdfExportOptions, timeWidth: number) {
  if (!items.length) {
    return { text: 'No activities scheduled', style: 'itemMeta', margin: [0, 0, 0, SPACE.md] };
  }

  const body = items.map((it, idx) => {
    const zebra = idx % 2 === 0 ? COLORS.white : COLORS.sand;

    const titleLine =
      (o.showCosts && it.cost)
        ? {
            columns: [
              { text: it.title, style: 'itemTitle', width: '*' },
              { text: it.cost, style: 'itemCost', alignment: 'right', width: 'auto' },
            ],
            columnGap: SPACE.md,
          }
        : { text: it.title, style: 'itemTitle' };

    const combinedDetails: string[] = [];
    if (it.details) combinedDetails.push(it.details);
    if (it.location) combinedDetails.push(it.location);

    const stack: Content[] = [titleLine];

    if (combinedDetails.length) {
      stack.push({ text: combinedDetails.join(' • '), style: 'itemDetail', margin: [0, SPACE.xs, 0, 0] });
    }

    if (it.thumb && o.showImages) {
      stack.push({ image: it.thumb, width: PAGE.thumbSize, height: PAGE.thumbSize, margin: [0, SPACE.sm, 0, 0] });
    }

    return [
      { text: it.time, style: 'timeCell', alignment: 'right', margin: [0, SPACE.sm, SPACE.sm + 2, SPACE.sm], fillColor: zebra },
      { stack, fillColor: zebra, margin: [SPACE.sm + 2, SPACE.sm, SPACE.sm + 2, SPACE.sm] },
    ];
  });

  return {
    table: { widths: [timeWidth, '*'], body, dontBreakRows: true },
    layout: {
      hLineWidth: (i: number) => (i === 0 || i === body.length ? 0 : 0.5),
      vLineWidth: () => 0,
      hLineColor: () => COLORS.rule,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 3,
      paddingBottom: () => 3,
    },
  };
}
```

- [ ] **Step 3: Replace `renderCompactDayHeader`**

```ts
function renderCompactDayHeader(d: Day, isFirstOnPage: boolean, contentWidth: number): Content {
  const dayText = d.title?.trim()
    ? `${fmtShort(d.date)} • ${d.title}`
    : fmtShort(d.date);

  const stack: Content[] = [
    {
      text: [
        { text: dayText },
        ...(d.hasTransport
          ? [{
              text: '   TRAVEL DAY',
              fontSize: TYPE.caption,
              font: FONTS.sans,
              color: COLORS.sunset,
              characterSpacing: 1,
            }]
          : []),
      ],
      style: 'sectionHeading',
      margin: [0, isFirstOnPage ? 0 : SPACE.lg, 0, SPACE.xs] as [number, number, number, number],
    },
    {
      canvas: [
        { type: 'line', x1: 0, y1: 0, x2: Math.max(100, Math.round(contentWidth)), y2: 0, lineWidth: 0.5, lineColor: COLORS.earthLight },
      ],
      margin: [0, 0, 0, SPACE.sm] as [number, number, number, number],
    },
  ];

  if (d.description?.trim()) {
    stack.push({
      text: d.description.trim(),
      style: 'dayDescription',
      margin: [0, 0, 0, SPACE.sm] as [number, number, number, number],
    });
  }

  return { stack, headlineLevel: 1, unbreakable: true };
}
```

Update its call site to `renderCompactDayHeader(d, idx === 0, contentWidth)` (the `fontSize` param is gone; `timeWidth` for `renderTable` becomes `PAGE.timeColWidth`).

- [ ] **Step 4: Replace `renderCombinedCoverPage`**

New signature — no nullable trip row, no `baseFontSize`/`imageHeight` params, deterministic placeholder when a requested cover failed to load:

```ts
function renderCombinedCoverPage(
  destination: string,
  dateRange: string,
  stays: AccommodationSummary[],
  transports: TransportSegment[],
  days: Day[],
  coverDataUrl: string,
  coverRequested: boolean,
  contentWidth: number
): Content[] {
  const content: Content[] = [];
  const bandWidth = Math.max(200, Math.round(contentWidth));

  content.push({
    canvas: [{ type: 'rect', x: 0, y: 0, w: bandWidth, h: 6, color: COLORS.earthLight }],
    margin: [0, 0, 0, SPACE.lg] as [number, number, number, number],
  });

  if (coverDataUrl) {
    content.push({
      image: coverDataUrl,
      width: bandWidth,
      height: PAGE.coverImageHeight,
      margin: [0, 0, 0, SPACE.xl] as [number, number, number, number],
    });
  } else if (coverRequested) {
    // Image fetch failed (CORS/network): keep the layout identical with a sand band
    // instead of silently collapsing the cover.
    content.push({
      canvas: [{ type: 'rect', x: 0, y: 0, w: bandWidth, h: PAGE.coverImageHeight, color: COLORS.sand }],
      margin: [0, 0, 0, SPACE.xl] as [number, number, number, number],
    });
  }

  content.push({ text: `${destination} Itinerary`, style: 'coverTitle', margin: [0, 0, 0, SPACE.sm] as [number, number, number, number] });

  if (dateRange) {
    content.push({ text: dateRange, style: 'coverSubtitle', margin: [0, 0, 0, SPACE.md] as [number, number, number, number] });
  }

  content.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: bandWidth, y2: 0, lineWidth: 0.75, lineColor: COLORS.earthLight }],
    margin: [0, 0, 0, SPACE.lg] as [number, number, number, number],
  });

  const totalFlights = transports.filter((t) => t.type.toLowerCase().includes('flight')).length;
  const { totalActivities, busyDays, moderateDays, lightDays } = computeDayStats(days);

  const leftColumn: Content[] = [
    { text: 'Trip Details', style: 'sectionHeading', margin: [0, 0, 0, SPACE.sm] as [number, number, number, number] },
    { text: `Duration: ${days.length} days`, style: 'body', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] },
  ];

  if (stays.length > 0) {
    leftColumn.push({ text: 'Accommodations', style: 'sectionHeading', margin: [0, SPACE.md, 0, SPACE.sm] as [number, number, number, number] });
    leftColumn.push({
      table: {
        widths: ['*', 'auto', 'auto'],
        dontBreakRows: true,
        body: [
          [
            { text: 'Hotel', style: 'tableCellStrong' },
            { text: 'Check In', style: 'tableCellStrong' },
            { text: 'Check Out', style: 'tableCellStrong' },
          ],
          ...stays.map((s) => [
            { text: s.hotel, style: 'tableCell' },
            { text: s.checkIn, style: 'tableCell' },
            { text: s.checkOut, style: 'tableCell' },
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
    });
  }

  const rightColumn: Content[] = [
    { text: 'Quick Stats', style: 'sectionHeading', margin: [0, 0, 0, SPACE.sm] as [number, number, number, number] },
    { text: `${totalFlights} flight${totalFlights !== 1 ? 's' : ''}`, style: 'body', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] },
    { text: `${totalActivities} activit${totalActivities !== 1 ? 'ies' : 'y'}`, style: 'body', margin: [0, 0, 0, SPACE.sm] as [number, number, number, number] },
    { text: 'Activity Level', style: 'sectionHeading', margin: [0, SPACE.sm, 0, SPACE.sm] as [number, number, number, number] },
    ...buildActivityLevelEntries(busyDays, moderateDays, lightDays),
  ];

  content.push({
    columns: [{ stack: leftColumn, width: '*' }, { stack: rightColumn, width: '*' }],
    columnGap: SPACE.xl + SPACE.sm,
  });

  content.push({ text: '', pageBreak: 'after' });
  return content;
}
```

Update `buildActivityLevelEntries` (drop the `baseFontSize` param):

```ts
function buildActivityLevelEntries(busyDays: number, moderateDays: number, lightDays: number): Content[] {
  const entries: Content[] = [];
  const levels: Array<{ count: number; label: string; color: string }> = [
    { count: busyDays, label: 'Busy (4+ activities)', color: COLORS.earth },
    { count: moderateDays, label: 'Moderate (2-3 activities)', color: COLORS.earthLight },
    { count: lightDays, label: 'Light (0-1 activities)', color: COLORS.earthMid },
  ];
  for (const { count, label, color } of levels) {
    if (count > 0) {
      entries.push({
        text: `• ${label}: ${count} day${count !== 1 ? 's' : ''}`,
        style: 'tableCell',
        color,
        margin: [0, 0, 0, SPACE.xs] as [number, number, number, number],
      });
    }
  }
  return entries;
}
```

Update the call site in `exportItineraryPdf`:

```ts
content.push(
  ...renderCombinedCoverPage(
    trip.destination ?? 'Trip',
    dateRange,
    stays,
    transports,
    days,
    coverDataUrl,
    Boolean(o.showImages && trip.cover_image_url),
    contentWidth
  )
);
```

- [ ] **Step 5: Replace `renderReferenceSection`**

```ts
function renderReferenceSection(
  stays: AccommodationSummary[],
  transports: TransportSegment[],
  diningRefs: DiningRef[]
): Content[] {
  const content: Content[] = [];

  content.push({ text: '', pageBreak: 'before' });
  content.push({ text: 'Reference Information', style: 'pageHeading', headlineLevel: 1, margin: [0, 0, 0, SPACE.lg] as [number, number, number, number] });

  if (stays.length > 0) {
    content.push({ text: 'Accommodation Details', style: 'sectionHeading', headlineLevel: 1, margin: [0, SPACE.md, 0, SPACE.md] as [number, number, number, number] });

    stays.forEach((stay, idx) => {
      const details: Content[] = [
        { text: stay.hotel, style: 'itemTitle', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] },
        { text: `Check-in: ${stay.checkIn}`, style: 'body', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] },
        { text: `Check-out: ${stay.checkOut}`, style: 'body', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] },
      ];
      if (stay.address) details.push({ text: stay.address, style: 'metaText', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] });
      if (stay.phone) details.push({ text: `Phone: ${stay.phone}`, style: 'metaText', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] });
      if (stay.website) details.push({ text: `Website: ${stay.website}`, style: 'metaText', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] });

      content.push({
        stack: details,
        unbreakable: true,
        margin: [0, 0, 0, idx < stays.length - 1 ? SPACE.lg : 0] as [number, number, number, number],
      });
    });
  }

  const transWithConf = transports.filter((t) => t.confirmationNumber);
  if (transWithConf.length > 0) {
    content.push({ text: 'Transportation Confirmations', style: 'sectionHeading', headlineLevel: 1, margin: [0, SPACE.xl, 0, SPACE.md] as [number, number, number, number] });
    content.push({
      table: {
        widths: ['auto', '*', 'auto'],
        dontBreakRows: true,
        body: [
          [
            { text: 'Transport', style: 'tableHeader' },
            { text: 'Route', style: 'tableHeader' },
            { text: 'Confirmation #', style: 'tableHeader' },
          ],
          ...transWithConf.map((t) => [
            { text: `${t.type} (${t.date})`, style: 'tableCell' },
            { text: `${t.from} to ${t.to}`, style: 'tableCell' },
            { text: t.confirmationNumber!, style: 'tableCell', bold: true },
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
    });
  }

  if (diningRefs.length > 0) {
    content.push({ text: 'Dining Confirmations', style: 'sectionHeading', headlineLevel: 1, margin: [0, SPACE.xl, 0, SPACE.md] as [number, number, number, number] });
    content.push({
      table: {
        widths: ['*', 'auto'],
        dontBreakRows: true,
        body: [
          [
            { text: 'Restaurant', style: 'tableHeader' },
            { text: 'Confirmation #', style: 'tableHeader' },
          ],
          ...diningRefs.map((r) => [
            { text: r.restaurant, style: 'tableCell' },
            { text: r.confirmationNumber!, style: 'tableCell', bold: true },
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
    });
  }

  const staysWithContact = stays.filter((s) => s.phone || s.website);
  if (staysWithContact.length > 0) {
    content.push({ text: 'Hotel Contact Information', style: 'sectionHeading', headlineLevel: 1, margin: [0, SPACE.xl, 0, SPACE.md] as [number, number, number, number] });
    staysWithContact.forEach((stay, idx) => {
      const lines: Content[] = [{ text: stay.hotel, style: 'itemTitle', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] }];
      if (stay.phone) lines.push({ text: `Phone: ${stay.phone}`, style: 'body', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] });
      if (stay.website) lines.push({ text: `Website: ${stay.website}`, style: 'metaText', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] });
      content.push({
        stack: lines,
        unbreakable: true,
        margin: [0, 0, 0, idx < staysWithContact.length - 1 ? SPACE.md : 0] as [number, number, number, number],
      });
    });
  }

  return content;
}
```

Call site becomes `content.push(...renderReferenceSection(stays, transports, diningRefs));`

- [ ] **Step 6: Replace `renderBudgetSummary`**

```ts
function renderBudgetSummary(budgetData: BudgetData): Content[] {
  if (budgetData.categories.length === 0) return [];

  const content: Content[] = [];

  content.push({ text: 'Budget Summary', style: 'sectionHeading', headlineLevel: 1, margin: [0, SPACE.xl, 0, SPACE.md] as [number, number, number, number] });

  // Budget categories sum raw amounts across currencies and have always been
  // labeled USD. Honest multi-currency totals need exchange-rate conversion —
  // out of scope here (see plan: Out of scope).
  const tableBody: TableCell[][] = [
    [
      { text: 'Category', style: 'tableHeader' },
      { text: 'Amount', style: 'tableHeader', alignment: 'right' },
    ],
    ...budgetData.categories.map((c) => [
      { text: c.category, style: 'tableCell' },
      { text: fmtMoney(c.amount, 'USD'), style: 'tableCell', alignment: 'right' },
    ]),
    [
      { text: 'Total', style: 'tableCellStrong', fillColor: COLORS.totalFill },
      { text: fmtMoney(budgetData.total, 'USD'), style: 'tableCellStrong', alignment: 'right', fillColor: COLORS.totalFill },
    ],
  ];

  content.push({
    table: { widths: ['*', 'auto'], body: tableBody, dontBreakRows: true },
    layout: 'lightHorizontalLines',
  });

  if (budgetData.budget != null && budgetData.budget > 0) {
    const remaining = budgetData.budget - budgetData.total;
    const overBudget = remaining < 0;
    content.push({
      columns: [
        { text: `Budget: ${fmtMoney(budgetData.budget, 'USD')}`, style: 'body', width: 'auto' },
        { text: '  |  ', style: 'metaText', width: 'auto' },
        {
          text: overBudget
            ? `Over budget by ${fmtMoney(Math.abs(remaining), 'USD')}`
            : `Remaining: ${fmtMoney(remaining, 'USD')}`,
          style: 'body',
          color: overBudget ? COLORS.sunset : COLORS.earth,
          bold: true,
          width: 'auto',
        },
      ],
      margin: [0, SPACE.sm + 2, 0, 0] as [number, number, number, number],
    });
  }

  return content;
}
```

Call site becomes `content.push(...renderBudgetSummary(budgetData));`

- [ ] **Step 7: Remove the temporary shims and verify the sweep is total**

Delete all five Task 9 shims: `const BRAND = COLORS;`, `const baseFontSize = 9;`, `const isMobile = false;`, `const headerFont = 9;`, `const footerFont = 8;`. Fix any remaining `BRAND.` references to `COLORS.` — after Steps 1–6 nothing references the other four anymore (the rewritten styles/header/footer use theme tokens).

Run: `grep -n "BRAND\|baseFontSize\|fontSize: [0-9]\|fontSize: base" src/services/pdfmake-export.ts`
Expected: no matches — every size comes from a named style or `TYPE`, every color from `COLORS`. (The only `fontSize:` left is the `TYPE.caption` run inside the TRAVEL DAY tag.)

Run: `npx tsc --noEmit && npx vitest run src/services/pdf`
Expected: clean / passing.

- [ ] **Step 8: Commit**

```bash
git add src/services/pdfmake-export.ts
git commit -m "feat(pdf-export): apply theme type scale, spacing, and named styles across the document

Body text moves from 8-9pt to 10pt, all 30 ad-hoc fontSize computations
collapse into the 6-step scale, margins widen to printer-safe 40/48pt,
section headings get orphan protection, and a failed cover image renders
a deterministic sand band instead of vanishing.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 11: Page-size control in the export dialog

**Files:**
- Modify: `src/components/trip/PdfExportDialog.tsx`

- [ ] **Step 1: Add the control**

Update the imports and state in `PdfExportDialog.tsx`:

```tsx
import { FileDown, Loader2, Image, DollarSign, FileText } from 'lucide-react';
import { defaultPageSize, type PdfPageSize } from '@/services/pdf/theme';
```

```tsx
const [options, setOptions] = useState<PdfExportOptions>({
  showImages: true,
  showCosts: true,
  pageSize: defaultPageSize(),
});
```

Insert this row inside the `<div className="divide-y divide-border">` block, after the "Include Prices" row:

```tsx
<div className="flex items-center justify-between gap-4 py-4">
  <div className="flex items-center gap-3">
    <FileText className="h-5 w-5 text-muted-foreground" />
    <div>
      <Label className="text-sm font-medium">Paper Size</Label>
      <p className="text-xs text-muted-foreground">Letter (US) or A4</p>
    </div>
  </div>
  <div className="flex gap-1">
    {(['LETTER', 'A4'] as PdfPageSize[]).map((size) => (
      <Button
        key={size}
        type="button"
        size="sm"
        variant={options.pageSize === size ? 'default' : 'outline'}
        onClick={() => setOptions(prev => ({ ...prev, pageSize: size }))}
      >
        {size === 'LETTER' ? 'Letter' : 'A4'}
      </Button>
    ))}
  </div>
</div>
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx eslint src/components/trip/PdfExportDialog.tsx`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/trip/PdfExportDialog.tsx
git commit -m "feat(pdf-export): explicit Letter/A4 choice in export dialog (locale sets default)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 12: Stage 2 checkpoint (manual QA)

- [ ] **Step 1: Static checks**

Run: `npx tsc --noEmit && npx eslint src/services/pdf src/services/pdfmake-export.ts src/components/trip/PdfExportDialog.tsx && npx vitest run src/services/pdf`
Expected: all clean/passing.

- [ ] **Step 2: Manual export QA**

Export the same trip twice — once in a desktop browser, once with devtools mobile emulation (iPhone viewport + UA). Verify:

- Both PDFs are **byte-comparable in layout**: same page count, same font sizes, same margins (the only allowed difference is the export timestamp in the footer).
- Body text is visibly larger than before (10pt); print one page and confirm comfortable reading and no clipped header/footer.
- Letter and A4 options both produce correct page dimensions (check Cmd+I / file properties in Preview).
- Costs render like `$1,240.00` / `€780.00` consistently in items *and* budget table.

---

# Stage 3 — Pure builder + regression safety

Ships: `buildDocDefinition(data, options)` testable without browser or network, snapshot + invariant tests, a render smoke test that produces a previewable PDF.

### Task 13: Shared types + consolidate formatters

**Files:**
- Create: `src/services/pdf/types.ts`
- Modify: `src/services/pdf/format.ts`
- Test: extend `src/services/pdf/format.test.ts`
- Modify: `src/services/pdfmake-export.ts`, `src/components/trip/PdfExportDialog.tsx`

- [ ] **Step 1: Create `src/services/pdf/types.ts`**

Move these type definitions verbatim from `pdfmake-export.ts` (currently lines ~70–107, 306–312) and add the two new contract types:

```ts
// src/services/pdf/types.ts
import type { PdfPageSize } from './theme';

export type Item = {
  type: 'accommodation' | 'transportation' | 'activity' | 'dining';
  title: string;
  time: string; // may be "08:00 AM – 11:45 AM"
  details?: string;
  location?: string;
  cost?: string;
  thumb?: string; // dataURL after conversion (not remote URL)
  sortKey: number; // minutes from midnight (start time) for sorting
};

export type Day = {
  date: string;
  title?: string;
  description?: string;
  items: Item[];
  activityCount?: number;
  hasTransport?: boolean;
};

export type AccommodationSummary = {
  hotel: string;
  checkIn: string;
  checkOut: string;
  address?: string;
  phone?: string;
  website?: string;
  checkInDate: string;
  checkOutDate: string;
};

export type TransportSegment = {
  from: string;
  to: string;
  date: string;
  type: string;
  confirmationNumber?: string;
};

export type DiningRef = { restaurant: string; confirmationNumber?: string };

export type BudgetData = {
  budget: number | null;
  categories: { category: string; amount: number }[];
  total: number;
};

/** User-facing export options (dialog state). */
export interface PdfExportOptions {
  showImages: boolean;
  showCosts: boolean;
  /** Paper size; defaults to locale-appropriate size when omitted. */
  pageSize?: PdfPageSize;
}

/** Options with all defaults applied — what the pure builder consumes. */
export interface ResolvedPdfOptions {
  showImages: boolean;
  showCosts: boolean;
  pageSize: PdfPageSize;
  exportedAt: Date;
}

/** Everything the pure builder needs. No Supabase rows, no remote URLs. */
export interface PdfTripData {
  destination: string;
  dateRange: string;
  /** '' when no cover available or fetch failed. */
  coverImageDataUri: string;
  /** True when the user wanted images and the trip has a cover URL (drives the placeholder band). */
  coverImageRequested: boolean;
  days: Day[];
  stays: AccommodationSummary[];
  transports: TransportSegment[];
  diningRefs: DiningRef[];
  budgetData: BudgetData;
}
```

In `PdfExportDialog.tsx`, delete the local `PdfExportOptions` interface and replace with a re-export (keeps `ExportPdfButton`'s existing import working):

```ts
import type { PdfExportOptions } from '@/services/pdf/types';
export type { PdfExportOptions };
```

In `pdfmake-export.ts`, change the type imports to come from `./pdf/types` and delete the now-duplicated local type definitions.

- [ ] **Step 2: Write failing tests for the formatters that will move**

Append to `src/services/pdf/format.test.ts`:

```ts
import { fmtTime, minsFromTime, sanitizeFilename, formatType, fmtShort, fmtDate } from './format';

describe('fmtTime', () => {
  it('formats HH:mm to 12-hour', () => {
    expect(fmtTime('14:30')).toBe('2:30 PM');
    expect(fmtTime('08:05')).toBe('8:05 AM');
  });
  it('formats ISO datetimes', () => {
    expect(fmtTime('2026-06-12T08:00:00')).toBe('8:00 AM');
  });
  it('returns empty string for missing/garbage input', () => {
    expect(fmtTime(null)).toBe('');
    expect(fmtTime(undefined)).toBe('');
    expect(fmtTime('abc')).toBe('');
  });
});

describe('minsFromTime', () => {
  it('parses 12-hour strings to minutes from midnight', () => {
    expect(minsFromTime('8:05 am')).toBe(485);
    expect(minsFromTime('12:15 pm')).toBe(735);
  });
  it('returns 9999 sentinel for unparseable input (sorts last)', () => {
    expect(minsFromTime('All-day')).toBe(9999);
  });
});

describe('sanitizeFilename', () => {
  it('lowercases and collapses non-alphanumerics to single underscores', () => {
    expect(sanitizeFilename('Rome, Italy!')).toBe('rome_italy');
  });
  it('falls back to itinerary', () => {
    expect(sanitizeFilename(null)).toBe('itinerary');
  });
});

describe('formatType', () => {
  it('title-cases snake_case transport types', () => {
    expect(formatType('car_service')).toBe('Car Service');
    expect(formatType(null)).toBe('Transport');
  });
});

describe('date formatting', () => {
  it('formats short and long dates', () => {
    expect(fmtShort('2026-06-12')).toBe('Jun 12');
    expect(fmtDate('2026-06-12')).toBe('Friday, June 12, 2026');
  });
});
```

Run: `npx vitest run src/services/pdf/format.test.ts`
Expected: FAIL — `fmtTime` etc. not exported.

- [ ] **Step 3: Move the formatters**

Move verbatim from `pdfmake-export.ts` into `src/services/pdf/format.ts`, exporting each: `TIME_RE` (keep private), `formatType` (~62–65), `asDate`/`sameDay` (~164–165), `fmtDate`/`fmtShort` (~167–168), `fmtTime` (~170–187), `minsFromTime` (~189–197), `sanitizeFilename` (~199–223). Add at top of `format.ts`:

```ts
import { parseISO, format as fnsFormat, isSameDay } from 'date-fns';
```

In `pdfmake-export.ts`, delete the moved code and import instead:

```ts
import { fmtMoney, fmtDate, fmtShort, fmtTime, minsFromTime, sanitizeFilename, formatType, sameDay } from './pdf/format';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/pdf && npx tsc --noEmit`
Expected: PASS / clean.

- [ ] **Step 5: Commit**

```bash
git add src/services/pdf/types.ts src/services/pdf/format.ts src/services/pdf/format.test.ts src/services/pdfmake-export.ts src/components/trip/PdfExportDialog.tsx
git commit -m "refactor(pdf-export): extract shared types and consolidate formatters with tests

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 14: Data layer extraction

**Files:**
- Create: `src/services/pdf/data.ts`
- Modify: `src/services/pdfmake-export.ts`

- [ ] **Step 1: Create `src/services/pdf/data.ts`**

Move `TABLES`, the Supabase row type aliases (`TripRow` … `OtherExpenseRow`), and the entire `buildDays` function (lines ~314–548) verbatim into `data.ts`, then add the top-level fetch function that also resolves the cover image and date range:

```ts
// src/services/pdf/data.ts — Supabase fetching + image resolution.
// Everything network/DOM-dependent lives here; builder.ts stays pure.
import { supabase } from '@/integrations/supabase/client';
import { parseISO, isSameDay } from 'date-fns';
import { fmtDate, fmtShort, fmtTime, minsFromTime, formatType, sameDay } from './format';
import { imageToCoverDataURI } from './images';
import { PAGE } from './theme';
import type { Tables } from '@/integrations/supabase/types';
import type {
  PdfExportOptions, PdfTripData, Item, Day,
  AccommodationSummary, TransportSegment, DiningRef, BudgetData,
} from './types';

// … TABLES const and row type aliases moved verbatim here …
// … buildDays(tripId, o) moved verbatim here (not exported) …

export async function fetchPdfTripData(
  tripId: string,
  o: PdfExportOptions,
  contentWidth: number
): Promise<PdfTripData> {
  const { data: trip, error } = await supabase
    .from(TABLES.trip)
    .select('destination,arrival_date,departure_date,cover_image_url,budget')
    .eq('trip_id', tripId)
    .single();

  if (error || !trip) {
    throw error ?? new Error('Trip not found');
  }

  const sameTripDay =
    trip.arrival_date && trip.departure_date
      ? isSameDay(parseISO(trip.arrival_date), parseISO(trip.departure_date))
      : false;

  const dateRange =
    trip.arrival_date && trip.departure_date
      ? sameTripDay
        ? fmtDate(trip.arrival_date)
        : `${fmtShort(trip.arrival_date)} – ${fmtShort(trip.departure_date)}`
      : '';

  const { days, stays, transports, diningRefs, budgetData } = await buildDays(tripId, o);

  const coverImageRequested = Boolean(o.showImages && trip.cover_image_url);
  const coverImageDataUri = coverImageRequested
    ? await imageToCoverDataURI(
        trip.cover_image_url!,
        Math.round(contentWidth),
        PAGE.coverImageHeight,
        PAGE.coverScale
      )
    : '';

  return {
    destination: trip.destination ?? 'Trip',
    dateRange,
    coverImageDataUri,
    coverImageRequested,
    days,
    stays,
    transports,
    diningRefs,
    budgetData,
  };
}
```

(The moved `buildDays` keeps using `imageToCoverDataURI(url, PAGE.thumbSize, PAGE.thumbSize, PAGE.thumbScale)` for thumbnails, exactly as after Task 4.)

- [ ] **Step 2: Use it from `pdfmake-export.ts`**

Delete the moved code (`TABLES`, row aliases, `buildDays`, the trip fetch + `dateRange` computation + cover fetch inside `exportItineraryPdf`) and replace with:

```ts
import { fetchPdfTripData } from './pdf/data';
```

```ts
const data = await fetchPdfTripData(tripId, o, contentWidth);
```

Adjust the body of `exportItineraryPdf` to read from `data.*` (`data.destination`, `data.dateRange`, `data.days`, `data.stays`, `data.transports`, `data.diningRefs`, `data.budgetData`, `data.coverImageDataUri`, `data.coverImageRequested`) — including the filename: `${sanitizeFilename(data.destination)}-itinerary.pdf` and the header text (`data.destination` / `data.dateRange`).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npx vitest run src/services/pdf`
Expected: clean / passing.

Run: `grep -n "supabase" src/services/pdfmake-export.ts`
Expected: no matches — the orchestrator no longer talks to the database directly.

- [ ] **Step 4: Commit**

```bash
git add src/services/pdf/data.ts src/services/pdfmake-export.ts
git commit -m "refactor(pdf-export): extract Supabase fetch + image resolution into pdf/data

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 15: Pure builder extraction

**Files:**
- Create: `src/services/pdf/builder.ts`
- Test: `src/services/pdf/builder.test.ts` (first assertion only; full suite in Task 16)
- Modify: `src/services/pdfmake-export.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/services/pdf/builder.test.ts
import { describe, it, expect } from 'vitest';
import { buildDocDefinition } from './builder';
import type { PdfTripData, ResolvedPdfOptions } from './types';

const EMPTY_DATA: PdfTripData = {
  destination: 'Nowhere',
  dateRange: '',
  coverImageDataUri: '',
  coverImageRequested: false,
  days: [],
  stays: [],
  transports: [],
  diningRefs: [],
  budgetData: { budget: null, categories: [], total: 0 },
};

const OPTS: ResolvedPdfOptions = {
  showImages: true,
  showCosts: true,
  pageSize: 'LETTER',
  exportedAt: new Date('2026-06-10T09:14:00'),
};

describe('buildDocDefinition', () => {
  it('builds a LETTER doc with theme margins for empty data', () => {
    const doc = buildDocDefinition(EMPTY_DATA, OPTS);
    expect(doc.pageSize).toBe('LETTER');
    expect(doc.pageMargins).toEqual([40, 48, 40, 48]);
    expect(Array.isArray(doc.content)).toBe(true);
  });
});
```

Run: `npx vitest run src/services/pdf/builder.test.ts`
Expected: FAIL — cannot resolve `./builder`.

- [ ] **Step 2: Create `src/services/pdf/builder.ts`**

Move verbatim from `pdfmake-export.ts`: `renderTable`, `renderCompactDayHeader`, `renderCombinedCoverPage`, `renderReferenceSection`, `renderBudgetSummary`, `buildActivityLevelEntries`, `computeDayStats`, plus the doc-definition assembly. The module must import **only** `./theme`, `./format`, `./pagination`, `./types`, `date-fns`, and `pdfmake/interfaces` types — no supabase, no DOM:

```ts
// src/services/pdf/builder.ts — pure document builder. Data in, docDefinition out.
import { format as fnsFormat } from 'date-fns';
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import { PAGE, TYPE, SPACE, COLORS, FONTS, innerPageWidth } from './theme';
import { fmtMoney, fmtShort } from './format';
import { isOrphanedHeading } from './pagination';
import type { PdfTripData, ResolvedPdfOptions, Item, Day, AccommodationSummary, TransportSegment, DiningRef, BudgetData } from './types';

// … the seven moved functions, verbatim from their post-Task-10 form,
//   with `o: PdfExportOptions` parameters retyped to `o: ResolvedPdfOptions` …

export function buildDocDefinition(data: PdfTripData, opts: ResolvedPdfOptions): TDocumentDefinitions {
  const contentWidth = innerPageWidth(opts.pageSize, PAGE.margins);
  const content: Content[] = [];

  content.push(
    ...renderCombinedCoverPage(
      data.destination,
      data.dateRange,
      data.stays,
      data.transports,
      data.days,
      data.coverImageDataUri,
      data.coverImageRequested,
      contentWidth
    )
  );

  data.days.forEach((d, idx) => {
    content.push(renderCompactDayHeader(d, idx === 0, contentWidth));
    content.push(renderTable(d.items, opts, PAGE.timeColWidth));
  });

  if (opts.showCosts) {
    content.push(...renderBudgetSummary(data.budgetData));
  }

  content.push(...renderReferenceSection(data.stays, data.transports, data.diningRefs));

  return {
    pageSize: opts.pageSize,
    pageMargins: PAGE.margins,
    defaultStyle: { fontSize: TYPE.body, lineHeight: 1.3, font: FONTS.sans, color: COLORS.accent },
    header: () => ({
      text: data.dateRange ? `${data.destination} • ${data.dateRange}` : data.destination,
      alignment: 'center' as const,
      style: 'pageChrome',
      margin: [0, PAGE.headerOffsetY, 0, 0] as [number, number, number, number],
    }),
    footer: (p: number, c: number) => ({
      text: `Page ${p} of ${c} • exported ${fnsFormat(opts.exportedAt, 'PP p')}`,
      alignment: 'center' as const,
      style: 'pageChrome',
      margin: [0, PAGE.footerOffsetY, 0, 0] as [number, number, number, number],
    }),
    content,
    styles: {
      // … the styles object exactly as written in Task 10 Step 1 …
    },
    pageBreakBefore: (currentNode, followingNodesOnPage) =>
      isOrphanedHeading(currentNode, followingNodesOnPage),
  };
}
```

- [ ] **Step 3: Slim `pdfmake-export.ts` to the orchestrator**

The whole file becomes:

```ts
/* src/services/pdfmake-export.ts
   Orchestrates the itinerary PDF export:
   fonts → fetch data (pdf/data) → build document (pdf/builder) → download.
   All layout decisions live in pdf/theme.ts and pdf/builder.ts. */

import pdfMake from 'pdfmake/build/pdfmake';
import { loadPdfFonts } from './pdf-fonts';
import { fetchPdfTripData } from './pdf/data';
import { buildDocDefinition } from './pdf/builder';
import { sanitizeFilename } from './pdf/format';
import { PAGE, innerPageWidth, defaultPageSize } from './pdf/theme';
import type { PdfExportOptions, ResolvedPdfOptions } from './pdf/types';

export async function exportItineraryPdf(tripId: string, o: PdfExportOptions): Promise<void> {
  await loadPdfFonts();

  const opts: ResolvedPdfOptions = {
    showImages: o.showImages,
    showCosts: o.showCosts,
    pageSize: o.pageSize ?? defaultPageSize(),
    exportedAt: new Date(),
  };

  // Upstream main-agent added this analytics event after the audit snapshot —
  // preserve it (page_size replaces the old always-'auto' page_preset prop).
  track('pdf_exported', { trip_id: tripId, page_size: opts.pageSize });

  const contentWidth = innerPageWidth(opts.pageSize, PAGE.margins);
  const data = await fetchPdfTripData(tripId, o, contentWidth);
  const doc = buildDocDefinition(data, opts);

  const fileName = `${sanitizeFilename(data.destination)}-itinerary.pdf`;
  const pdf = pdfMake.createPdf(doc);

  return new Promise<void>((resolve, reject) => {
    pdf.getBlob((blob: Blob) => {
      try {
        if (!blob) {
          reject(new Error('Failed to generate PDF blob'));
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => {
          URL.revokeObjectURL(url);
          resolve();
        }, 100);
      } catch (err) {
        reject(err);
      }
    });
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/pdf && npx tsc --noEmit`
Expected: PASS / clean.

Run: `grep -n "supabase\|document\.\|window\." src/services/pdf/builder.ts`
Expected: no matches — the builder is pure.

- [ ] **Step 5: Commit**

```bash
git add src/services/pdf/builder.ts src/services/pdf/builder.test.ts src/services/pdfmake-export.ts
git commit -m "refactor(pdf-export): extract pure buildDocDefinition; orchestrator slims to 60 lines

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 16: Fixture + snapshot + invariant tests

**Files:**
- Create: `src/services/pdf/fixtures.ts`
- Modify: `src/services/pdf/builder.test.ts`

- [ ] **Step 1: Create the deterministic fixture**

```ts
// src/services/pdf/fixtures.ts
// Deterministic trip data for builder/render tests. No network, no Date.now().
import type { PdfTripData, ResolvedPdfOptions, Item } from './types';

/** Valid 1x1 black JPEG — exercises pdfmake image nodes without network. */
export const TINY_JPEG =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

const item = (partial: Partial<Item> & Pick<Item, 'type' | 'title' | 'time' | 'sortKey'>): Item => ({ ...partial }) as Item;

export const FIXTURE_OPTS: ResolvedPdfOptions = {
  showImages: true,
  showCosts: true,
  pageSize: 'LETTER',
  exportedAt: new Date('2026-06-10T09:14:00'),
};

export function romeTrip(): PdfTripData {
  return {
    destination: 'Rome',
    dateRange: 'Jun 12 – Jun 17',
    coverImageDataUri: TINY_JPEG,
    coverImageRequested: true,
    days: [
      {
        date: '2026-06-12',
        title: 'Arrival in Rome',
        description: 'Long travel day — keep the evening flexible.',
        hasTransport: true,
        activityCount: 3,
        items: [
          item({ type: 'accommodation', title: 'Check-in: Hotel Il Pellicano', time: '8:00 AM', details: 'Sea-view suite', location: 'Sbarcatello, Porto Ercole', cost: '€780.00', thumb: TINY_JPEG, sortKey: 480 }),
          item({ type: 'transportation', title: 'Flight: ITA Airways', time: '9:30 AM – 5:45 PM', details: 'AZ611 JFK–FCO', location: 'From: New York JFK to Rome FCO', cost: '$1,240.00', sortKey: 570 }),
          item({ type: 'activity', title: 'Colosseum Underground Tour', time: '11:00 AM', details: 'Meet at Arco di Costantino', cost: '€110.00', sortKey: 660 }),
          item({ type: 'dining', title: 'Dining: Roscioli', time: '1:00 PM', details: 'Ask for cellar table', location: '4 people • Via dei Giubbonari 21', cost: '€160.00', sortKey: 780 }),
        ],
      },
      {
        date: '2026-06-13',
        title: 'Classical Rome',
        hasTransport: false,
        activityCount: 2,
        items: [
          item({ type: 'activity', title: 'Vatican Museums', time: '10:00 AM', details: 'Pre-booked, group lane', cost: '€68.00', sortKey: 600 }),
          item({ type: 'dining', title: 'Dining: Pierluigi', time: '7:30 PM', location: '4 people • Piazza de’ Ricci 144', cost: '€190.00', sortKey: 1170 }),
        ],
      },
      { date: '2026-06-14', title: 'Quiet Day', hasTransport: false, activityCount: 0, items: [] },
    ],
    stays: [
      { hotel: 'Hotel Il Pellicano', checkIn: 'Jun 12', checkOut: 'Jun 15', address: 'Sbarcatello 1, Porto Ercole', phone: '+39 0564 858111', website: 'https://hotelilpellicano.com', checkInDate: '2026-06-12', checkOutDate: '2026-06-15' },
      { hotel: 'Hotel de Russie', checkIn: 'Jun 15', checkOut: 'Jun 17', checkInDate: '2026-06-15', checkOutDate: '2026-06-17' },
    ],
    transports: [
      { from: 'New York JFK', to: 'Rome FCO', date: 'Jun 12', type: 'Flight', confirmationNumber: 'AZ6XK2' },
      { from: 'Rome', to: 'Porto Ercole', date: 'Jun 12', type: 'Car Service' },
    ],
    diningRefs: [
      { restaurant: 'Roscioli', confirmationNumber: 'RSC-4421' },
    ],
    budgetData: {
      budget: 6000,
      categories: [
        { category: 'Accommodations', amount: 3120 },
        { category: 'Transportation', amount: 2480 },
        { category: 'Dining', amount: 890 },
      ],
      total: 6490,
    },
  };
}
```

- [ ] **Step 2: Add snapshot + invariant tests**

Append to `src/services/pdf/builder.test.ts`:

```ts
import { romeTrip, FIXTURE_OPTS } from './fixtures';
import { TYPE, COLORS } from './theme';

/** Recursively collect every value stored under `key`, skipping functions. */
function collect(node: unknown, key: string, out: unknown[]): void {
  if (Array.isArray(node)) {
    node.forEach((n) => collect(n, key, out));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === key) out.push(v);
      collect(v, key, out);
    }
  }
}

// pdfmake DynamicContent takes (currentPage, pageCount, pageSize)
const PAGE_CTX = { width: 612, height: 792, orientation: 'portrait' as const };

function docWithChrome(doc: ReturnType<typeof buildDocDefinition>) {
  const header = typeof doc.header === 'function' ? doc.header(1, 5, PAGE_CTX) : doc.header;
  const footer = typeof doc.footer === 'function' ? doc.footer(1, 5, PAGE_CTX) : doc.footer;
  return [doc.content, doc.styles, doc.defaultStyle, header, footer];
}

describe('buildDocDefinition snapshots', () => {
  it('matches snapshot: images + costs, LETTER', () => {
    expect(buildDocDefinition(romeTrip(), FIXTURE_OPTS)).toMatchSnapshot();
  });

  it('matches snapshot: no images, no costs, A4', () => {
    expect(
      buildDocDefinition(romeTrip(), { ...FIXTURE_OPTS, showImages: false, showCosts: false, pageSize: 'A4' })
    ).toMatchSnapshot();
  });
});

describe('consistency invariants', () => {
  const allowedSizes = new Set<number>(Object.values(TYPE));
  const allowedColors = new Set<string>(Object.values(COLORS));

  it('every fontSize in the document comes from the type scale', () => {
    const sizes: unknown[] = [];
    collect(docWithChrome(buildDocDefinition(romeTrip(), FIXTURE_OPTS)), 'fontSize', sizes);
    expect(sizes.length).toBeGreaterThan(0);
    for (const s of sizes) expect(allowedSizes).toContain(s as number);
  });

  it('every color and fillColor comes from the palette', () => {
    const doc = buildDocDefinition(romeTrip(), FIXTURE_OPTS);
    const colors: unknown[] = [];
    collect(docWithChrome(doc), 'color', colors);
    collect(docWithChrome(doc), 'fillColor', colors);
    collect(docWithChrome(doc), 'lineColor', colors);
    expect(colors.length).toBeGreaterThan(0);
    for (const c of colors) expect(allowedColors).toContain(c as string);
  });

  it('contains no airplane glyph or other non-font characters', () => {
    const json = JSON.stringify(buildDocDefinition(romeTrip(), FIXTURE_OPTS).content);
    expect(json).not.toContain('✈');
  });

  it('footer pins the export timestamp from options', () => {
    const doc = buildDocDefinition(romeTrip(), FIXTURE_OPTS);
    const footer = typeof doc.footer === 'function' ? doc.footer(2, 7, PAGE_CTX) : doc.footer;
    expect(JSON.stringify(footer)).toMatch(/Page 2 of 7/);
    expect(JSON.stringify(footer)).toMatch(/Jun 10, 2026/);
  });

  it('day headings carry orphan protection', () => {
    const doc = buildDocDefinition(romeTrip(), FIXTURE_OPTS);
    const levels: unknown[] = [];
    collect(doc.content, 'headlineLevel', levels);
    // 3 day headers + section headings in budget/reference sections
    expect(levels.filter((l) => l === 1).length).toBeGreaterThanOrEqual(3);
  });
});
```

Note: if the `color`/`fillColor` invariant fails, the failure output names the offending literal — fix the *builder* to use a `COLORS` token (that's the test doing its job), not the test.

- [ ] **Step 3: Run, inspect, commit snapshots**

Run: `npx vitest run src/services/pdf/builder.test.ts`
Expected: PASS; first run writes `src/services/pdf/__snapshots__/builder.test.ts.snap`. Open the snap file and skim it once — confirm it contains the cover, three day tables, budget, and reference sections.

- [ ] **Step 4: Commit**

```bash
git add src/services/pdf/fixtures.ts src/services/pdf/builder.test.ts src/services/pdf/__snapshots__
git commit -m "test(pdf-export): snapshot + type/palette invariant tests on pure builder

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 17: Render smoke test (Node printer)

**Files:**
- Create: `src/services/pdf/render.test.ts`

- [ ] **Step 1: Write the test**

The Node printer works under Vitest's jsdom environment (Node builtins remain available). The same TTFs the browser embeds are read from disk.

```ts
// src/services/pdf/render.test.ts
// Smoke test: the doc definition actually renders to a real PDF via the
// pdfmake Node printer, using the same TTFs the browser embeds.
// (@types/pdfmake types the root 'pdfmake' import as the Node printer.)
// Run with PDF_PREVIEW=1 to write /tmp/wanderluxe-pdf-preview.pdf for eyeballing.
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { buildDocDefinition } from './builder';
import { romeTrip, FIXTURE_OPTS } from './fixtures';

const fontsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/fonts/pdf');

function renderToBuffer(doc: TDocumentDefinitions): Promise<Buffer> {
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

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const pdfDoc = printer.createPdfKitDocument(doc);
    pdfDoc.on('data', (c: Buffer) => chunks.push(c));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
}

describe('render smoke test', () => {
  it('renders the fixture to a valid multi-KB PDF', async () => {
    const buf = await renderToBuffer(buildDocDefinition(romeTrip(), FIXTURE_OPTS));
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(5000);
    if (process.env.PDF_PREVIEW) {
      fs.writeFileSync('/tmp/wanderluxe-pdf-preview.pdf', buf);
    }
  }, 20000);

  it('renders without images and costs', async () => {
    const buf = await renderToBuffer(
      buildDocDefinition(romeTrip(), { ...FIXTURE_OPTS, showImages: false, showCosts: false })
    );
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  }, 20000);
});
```

- [ ] **Step 2: Run and eyeball the preview**

Run: `npx vitest run src/services/pdf/render.test.ts`
Expected: PASS (2 tests).

Run: `PDF_PREVIEW=1 npx vitest run src/services/pdf/render.test.ts && open /tmp/wanderluxe-pdf-preview.pdf`
Expected: a Rome itinerary PDF — cover band, no tofu, no orphaned headers, 10pt body text.

- [ ] **Step 3: Commit**

```bash
git add src/services/pdf/render.test.ts
git commit -m "test(pdf-export): Node-printer render smoke test with PDF_PREVIEW artifact

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 18: Documentation + final acceptance

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Fix the stale PDF section in CLAUDE.md**

Replace section `#### 7. **PDF Export**` with:

```markdown
#### 7. **PDF Export**
- **Fully client-side** via pdfmake (no server endpoint; the old `/api/export-pdf` note was stale)
- **Modules**: `src/services/pdf/` — `theme.ts` (type scale/spacing/colors/page tokens — all sizes and colors MUST come from here), `images.ts` (cover-crop + supersampled data URIs), `builder.ts` (pure `buildDocDefinition(data, opts)`), `data.ts` (Supabase fetch), `format.ts` (locale-pinned formatters), `pagination.ts` (orphan-heading rule)
- **Orchestrator**: `src/services/pdfmake-export.ts` (fonts → fetch → build → download)
- **Fonts**: DM Sans + DM Serif Display TTFs lazy-loaded by `src/services/pdf-fonts.ts`; these fonts have no glyph for emoji/dingbats (e.g. ✈) — never put such characters in doc content
- **Layout is device-independent**: same output on mobile/desktop; Letter/A4 is a user option
- **Tests**: `npx vitest run src/services/pdf` (snapshots + theme invariants); `PDF_PREVIEW=1 npx vitest run src/services/pdf/render.test.ts` writes `/tmp/wanderluxe-pdf-preview.pdf`
```

In the `## Important Files & Patterns` table, update the `services/pdfmake-export.ts` row's purpose to `PDF export orchestrator (see src/services/pdf/ for builder/theme)`.

- [ ] **Step 2: Full-suite acceptance**

Run: `npx tsc --noEmit && npx eslint src/services/pdf src/services/pdfmake-export.ts src/components/trip/PdfExportDialog.tsx && npx vitest run && npm run build`
Expected: everything passes; production build succeeds.

- [ ] **Step 3: Final manual QA matrix**

Export one real trip (images + costs on) in each cell and check:

| Check | Desktop Chrome | Mobile emulation | Letter | A4 |
|---|---|---|---|---|
| Same page count + sizes as desktop | — | ☐ | ☐ | ☐ |
| Cover sharp + undistorted | ☐ | ☐ | ☐ | ☐ |
| No tofu, no orphan headers, no half-empty pages | ☐ | ☐ | ☐ | ☐ |
| Money formatted consistently | ☐ | ☐ | ☐ | ☐ |

- [ ] **Step 4: Commit + finish**

```bash
git add CLAUDE.md
git commit -m "docs: correct PDF export architecture in CLAUDE.md

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Then use the superpowers:finishing-a-development-branch skill to merge or open a PR against `main-agent`.

---

## Out of scope (deliberate)

- **Multi-currency budget conversion** — budget totals keep the existing USD-labeled raw sum; honest conversion needs the `exchange_rates` table and a product decision on the base currency.
- **Server-side rendering** — staying client-side; the Node printer is used only in tests.
- **New PDF features** (maps, QR codes, weather) — consistency first.
- **`PdfExportDialog` visual redesign** — only the paper-size row is added.

## Risks & rollback

- All changes are client-side; no migrations, no API changes. Rollback = revert the branch.
- Biggest intentional behavior change: phone exports now match desktop exports (larger type, wider margins → slightly higher page counts for dense trips).
- Snapshot tests will churn whenever the theme changes — that is the point; review snapshot diffs like UI diffs.
