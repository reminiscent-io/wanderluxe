# Print Studio Consolidation & Landing Showcase

**Date:** 2026-09-14
**Status:** Approved (design), spec pending review
**Branch:** claude/print-studio-landing-page-ee2863

## Problem

The Print Studio is the one thing Pro buys, but the product presents it as a
separate, unexplained feature:

- The trip toolbar has two unrelated buttons, `PDF` and `Studio`, opening two
  unrelated dialogs (`PdfExportDialog`, `PrintStudioDialog`). Nothing tells a
  traveler that the Studio is a richer version of the PDF they already use.
- The landing page mentions the Studio in one pricing sentence and one bullet.
  A visitor never sees what an edition looks like, that it is built from their
  own timeline, or that the AI's words are theirs to rewrite.

## Decisions (user-confirmed)

1. **Positioning.** The PDF is the simple, free version of the Studio. The
   Studio takes the same itinerary and designs it.
2. **One door, two renderers.** One toolbar button opens one dialog with a
   free *Simple PDF* section and a Pro *Studio edition* section. The pdfmake
   export stays as it is (a real `.pdf` file, offline on a phone); the Studio
   stays HTML + `window.print()`. pdfmake is not retired.
3. **Free users see their own trip in a sample style.** The Studio section
   shows a preview of the free user's actual itinerary drawn by the real
   Studio renderer in one fixed sample style, with no AI call and no invented
   prose.
4. **The button is named `Print`.** The dialog is titled "Print Studio".
5. **The landing showcase includes a Simple PDF step**: timeline, then Simple
   PDF, then Studio edition, then your words, then print.
6. **Sharing copy describes what exists.** An edition opens for anyone with
   access to the trip. There is no public share link, and no copy may imply
   one ("everyone on the trip can open it", never "share with anyone").

## Design

### 1. The merged Print dialog

#### Toolbar (`src/components/trip/TimelineView.tsx`)

- Desktop row: `ExportPdfButton` and the `Studio` button are replaced by one
  outline `Print` button (`Printer` icon, title "Print this trip: a simple PDF
  or a designed edition").
- Mobile row: the `PDF` and `Studio` buttons are replaced by one `Print`
  button. The row goes from up to four buttons to up to three.
- `isPdfExportOpen` state is removed. `isPrintStudioOpen` stays and now backs
  the single dialog.

#### Deep links

The effect that consumes `?sync`, `?export`, `?print` keeps all three params.

- `?export=pdf` opens the dialog with `initialSection="pdf"`.
- `?print=1` opens the dialog with `initialSection="studio"`.
- Params are still stripped after opening, as today.

`PrintStudioDialog` gains `initialSection?: 'pdf' | 'studio'` (default
`'pdf'`). When `'studio'`, the Studio section is scrolled into view inside
the dialog's scroll region on open.

#### Dialog structure (`src/components/trip/print-studio/PrintStudioDialog.tsx`)

The existing layout contract holds: fixed header, fixed footer, one scrolling
middle region. `DialogContent` keeps `mobileSheet` and `sm:max-w-md`.

Header description (all tiers): one sentence stating the two tiers, e.g.
"Download a simple PDF, or have the Studio design an edition of this trip."
Final wording goes through the house voice.

Body, top to bottom, identical order for every tier:

**Section A: Simple PDF (label: "Simple PDF · Free")**

- New component `src/components/trip/print-studio/SimplePdfSection.tsx`.
- One line of description: a clean, typeset itinerary you can print or keep
  offline.
- One compact options row: `Photos` switch, `Prices` switch, `Letter | A4`
  segmented buttons. Same defaults as today's `PdfExportDialog`
  (`defaultPageSize()` for paper).
- Inline `Download PDF` button, `variant="default"` (bronze). Calls the
  unchanged `exportItineraryPdf(tripId, options)`. Loading shows a spinner and
  "Preparing…"; failure keeps today's handling (console error + toast).
- Section A stays visible and usable while a Studio edition is generating.

**Section B: Studio edition (label: "Studio edition · Pro")**

Separated from A by a hairline. Quiet text label only; no badge, no gold, no
"Premium" (DESIGN.md).

- **Pro:** today's theme field + suggestion chips, unchanged. While
  generating, the existing progress panel replaces the theme field and the
  editions list, as today.
- **Free (including anonymous viewers of public trips):** the preview
  (`StudioTeaser`, below), then the editions list.
- **All tiers:** "Earlier editions" list, unchanged, so a free traveler can
  open an edition a Pro tripmate made.

Footer, unchanged in shape:

- Pro: sunset `Design my edition`.
- Free: ghost `Not now` + sunset `Unlock the Print Studio`.
- Generating: `Cancel`.

The dialog therefore still has exactly one sunset button.

#### The free preview (`src/components/trip/print-studio/StudioTeaser.tsx`)

- Layout: a scaled page thumbnail on the left (10rem wide at every
  breakpoint), copy on the right: "Your trip, in a sample style. Pro designs one around it, with
  words you can rewrite." (draft; house voice applies).
- Renderer: the real `PrintDocument`, given the user's live trip data and a
  fixed sample design, `SAMPLE_TEASER_DESIGN`.
- `SAMPLE_TEASER_DESIGN` lives in new `src/lib/printDesign/sample.ts`
  (dependency-free, like `spec.ts`). It is a `PrintDesignSpec` with:
  - a fixed palette that passes `sanitizePrintDesign` unchanged (asserted in a
    test),
  - the `editorial` font pairing (Playfair Display & Source Sans 3), so it
    reads as different from the DM Serif/DM Sans Simple PDF; loaded with the
    shared `useGoogleFonts` hook,
  - the `waves` motif,
  - `themeName: 'Sample'` so the cover plate reads "The Sample Edition",
  - `cover.subtitle`, `cover.tagline`, `themeRationale`, `intro` empty and
    `dayCaptions` empty, so no invented prose appears.
  At render time `cover.title` is set to the trip's destination.
- Thumbnail frame: new `src/components/trip/print-studio/PageThumbnail.tsx`.
  Renders its child at the document's natural width (46rem) and scales it with
  `transform: scale()` computed from the frame's width (ResizeObserver),
  clipped to a fixed aspect ratio so it shows the cover and the start of day
  one. `pointer-events: none`. Reused by the landing showcase.
- Accessibility: the frame is `aria-hidden`; a visually hidden sentence
  describes it ("Preview of this trip in a sample Print Studio style").
- Data: `useQuery` with the same key and options the edition page uses for a
  live edition, so the cache is shared and an edition opened after upgrading
  renders immediately. Enabled only when the dialog is open and the user is
  not Pro.
- Loading: a skeleton in the thumbnail's shape.
- Error: fall back to today's feature-list card (`PRO_FEATURES`), never an
  error message. The upsell must not look broken because a fetch failed.

#### Shared print-data module

New `src/components/trip/print-studio/printTripData.ts` holds what
`PrintItinerary.tsx` currently keeps private:

- `PRINT_OPTS` (`{ showImages: true, showCosts: true }`)
- `CONTENT_WIDTH` (`800`)
- `printTripDataKey(tripId, finalizedAt)` returning
  `['print-trip-data', tripId, finalizedAt ?? 'live']`

`useGoogleFonts` moves from `PrintItinerary.tsx` to
`src/components/trip/print-studio/useGoogleFonts.ts`. `PrintItinerary.tsx`
imports both; its behavior does not change.

#### Removed

- `src/components/trip/ExportPdfButton.tsx`
- `src/components/trip/PdfExportDialog.tsx`

`PdfExportOptions` remains exported from `src/services/pdf/types.ts`.

#### Analytics

- Existing `pdf_exported`, `print_studio_generate`, and edition-page events
  are unchanged.
- Add `print_studio_upgrade_click` with `{ trip_id, source: 'print_dialog' }`
  in `handleUpgrade`, so the preview's effect on upgrades is measurable. No
  other new events (PostHog is on a cost-sensitive trial).

### 2. Landing page showcase

#### Placement

`src/components/landing/WhySignUp.tsx`: new `PrintStudioShowcase` section
between `ValueProps` and `PricingClarity`, with `id="print-studio"`. The
pricing section's "$3.99 buys the Print Studio" then lands directly after the
demonstration.

#### Structure

- `src/components/landing/sections/PrintStudioShowcase.tsx`: the static shell.
  Eyebrow, heading, one short paragraph, the step control, and a reserved
  stage area with a fixed aspect ratio (no layout shift). This shell is in the
  prerendered HTML.
- `src/components/landing/print-showcase/ShowcaseStage.tsx`: the interactive
  stage, loaded with `React.lazy` when the section comes within ~600px of the
  viewport (IntersectionObserver). `PrintDocument`, `printDocument.css`,
  motifs, and edition fonts load only with this chunk.

Draft copy (final wording goes through the house voice before merge):

- Eyebrow: "Print Studio"
- Heading: "The plan you made, set as something to keep"
- Paragraph: the free PDF is a clean copy of the itinerary; Pro's Studio
  designs the same itinerary with its own palette, type and a line for every
  day, and every line is yours to rewrite.

#### Steps

The step control is a `role="tablist"` (arrow-key navigation); the stage is
its `tabpanel`. Desktop: steps sit beside the stage. Mobile: a horizontal
chip rail with scroll-snap above the stage.

| # | Step | Stage shows |
|---|------|-------------|
| 1 | Your timeline | Static JSX rows for one Tokyo day in app timeline styling: flight in, hotel check-in, an activity, a dinner reservation. Not the real `TimelineRow` (it needs trip context). |
| 2 | Simple PDF · Free | The committed image of page one of the real pdfmake output for the Tokyo fixture. |
| 3 | Studio edition · Pro | `PrintDocument` in `PageThumbnail` on the Tokyo fixture. Three edition chips (`aria-pressed`) swap palette, fonts, motif and captions; the itinerary items do not change. |
| 4 | Your words | Same document with cover title, tagline and the day-one caption wrapped in the real `EditableCopy`. Local state only, per-field revert, and one small line: nothing here is saved; on your trip, edits save to the edition. |
| 5 | Print | The current edition with a quiet "Finalized" mark (fade in, no bounce), the line "Finalize when the plan is set. Print copies, and everyone on the trip can open it.", and a bronze `Try it on your trip` button to `/auth?mode=signup`. |

The section uses no sunset button (`FinalCTA` holds the page's one).

#### Autoplay

- On first intersection (≥40% visible): step 1 → 2 after ~1.8s, 2 → 3 after
  ~2.2s, then stop. Total well under 5s.
- Any pointer or keyboard interaction inside the section cancels autoplay for
  good.
- `useReducedMotion()` true: no autoplay; start on step 1. (Step changes are
  JS-driven, which the root `MotionConfig` cannot see; DESIGN.md's motion
  caveat applies.)
- Transitions between stage states: opacity and y-translate only.

#### Showcase assets and fixtures

Everything the stage renders is committed; the landing page makes no API
calls and no Supabase requests.

- `src/components/landing/print-showcase/tokyoRows.ts`: a typed `PdfTripRows`
  fixture for a 3-day Tokyo trip (matching the `AppShowcase` screenshots).
  This is the single source for every showcase asset.
- `scripts/build-print-showcase.ts` (run by hand, never in CI or the build):
  1. Projects `tokyoRows` through `buildPdfTripData` and writes
     `src/components/landing/print-showcase/tokyoTrip.json` (`PdfTripData`).
     The cover uses a local image path rather than a data URI.
  2. Builds the pdfmake document with `buildDocDefinition`, renders it with the
     Node printer (as `render.test.ts` does), and converts page one to
     `public/images/print-showcase-simple-pdf.png` with macOS `sips`. The
     script states that this step is macOS-only.
  3. Maps `tokyoRows` to `PrintTripRows` (`trans → transportation`,
     `acts → activities`, `dine → reservations`), calls
     `generatePrintDesign(OPENAI_API_KEY, rows, theme)` for three theme
     prompts, and writes the sanitized specs to
     `src/components/landing/print-showcase/tokyoEditions.json`.
- Cover photo: a Tokyo photo following the project's existing Unsplash usage;
  if none is suitable, the cover omits the photo (`PrintDocument` already
  handles an empty cover image).

### 3. Copy updates (same PR)

- `src/components/landing/sections/PricingClarity.tsx`
  - Free: "PDF export and calendar sync" → "Simple PDF itinerary and calendar
    sync".
  - Pro: "Print Studio: keepsake itineraries designed by AI" → "Print Studio:
    your itinerary as a designed edition"; add "Every line of copy is yours to
    rewrite".
  - Intro paragraph names the Simple PDF as free and the Studio as the
    designed version.
  - Pro card gets a text link to `#print-studio`.
- `src/pages/Guide.tsx`: the "Print or save a PDF" and "Make a keepsake
  edition (Pro)" cards become one card (Printer icon) describing both tiers,
  linking to `?print=1`.
- `src/pages/Profile.tsx` (line ~176) and
  `src/components/trip/ai-assistant/PaywallModal.tsx` (line ~190): align the
  Studio bullet with the pricing wording.
- `src/pages/LLMTraining.tsx` (lines ~23, ~255): describe the free Simple PDF
  and the Pro Studio as two versions of the same itinerary.
- `PRO_FEATURES` in `PrintStudioDialog.tsx` (the preview's error fallback):
  align with the pricing wording.
- `CLAUDE.md`: §6 (deep-link params now both open the Print dialog), §7 (PDF
  export is reached through the Print dialog's Simple PDF section), §23 (single
  entry point, free preview, landing showcase and its build script).

## Files

| File | Change |
|------|--------|
| `src/components/trip/TimelineView.tsx` | One `Print` button; deep links set `initialSection` |
| `src/components/trip/print-studio/PrintStudioDialog.tsx` | Two sections, `initialSection` prop, upgrade event |
| `src/components/trip/print-studio/SimplePdfSection.tsx` | New |
| `src/components/trip/print-studio/StudioTeaser.tsx` | New |
| `src/components/trip/print-studio/PageThumbnail.tsx` | New |
| `src/components/trip/print-studio/printTripData.ts` | New (moved constants + key) |
| `src/components/trip/print-studio/useGoogleFonts.ts` | New (moved hook) |
| `src/lib/printDesign/sample.ts` | New |
| `src/pages/PrintItinerary.tsx` | Import moved constants and hook |
| `src/components/trip/ExportPdfButton.tsx` | Deleted |
| `src/components/trip/PdfExportDialog.tsx` | Deleted |
| `src/components/landing/WhySignUp.tsx` | Mount showcase |
| `src/components/landing/sections/PrintStudioShowcase.tsx` | New |
| `src/components/landing/print-showcase/ShowcaseStage.tsx` | New |
| `src/components/landing/print-showcase/tokyoRows.ts` | New |
| `src/components/landing/print-showcase/tokyoTrip.json` | New (generated) |
| `src/components/landing/print-showcase/tokyoEditions.json` | New (generated) |
| `public/images/print-showcase-simple-pdf.png` | New (generated) |
| `scripts/build-print-showcase.ts` | New |
| `src/components/landing/sections/PricingClarity.tsx` | Copy + anchor link |
| `src/pages/Guide.tsx`, `src/pages/Profile.tsx`, `src/pages/LLMTraining.tsx`, `src/components/trip/ai-assistant/PaywallModal.tsx` | Copy |
| `CLAUDE.md` | Docs |

## Testing

- `PrintStudioDialog.test.tsx`
  - Free tier: renders the Simple PDF section and the preview (trip data
    mocked); footer shows `Unlock the Print Studio`.
  - Pro tier: renders the Simple PDF section and the theme field; no preview.
  - `Download PDF` calls `exportItineraryPdf` with the chosen options.
  - Preview fetch failure renders the feature-list fallback.
  - `initialSection="studio"` scrolls the Studio section into view.
  - Existing generating-state tests still pass; the Simple PDF section stays
    rendered while generating.
- `TimelineView.test.tsx`: one `Print` button (desktop and mobile);
  `?export=pdf` and `?print=1` both open the dialog; the
  `vi.mock('./ExportPdfButton')` line is removed.
- `src/lib/printDesign/sample.test.ts`: `SAMPLE_TEASER_DESIGN` passes through
  `sanitizePrintDesign` unchanged.
- `src/components/landing/print-showcase/showcase.test.ts`: every edition in
  `tokyoEditions.json` passes through `sanitizePrintDesign` unchanged, has no
  `findSlop` findings, and keys captions only to dates in `tokyoTrip.json`.
- `ShowcaseStage.test.tsx`: step switching via click and arrow keys; switching
  editions leaves the rendered itinerary items identical; editing a field and
  reverting restores the edition's line; with reduced motion there is no
  autoplay.
- Unchanged and still green: `npx vitest run src/services/pdf`.
- Manual: landing page at 375px and desktop, light and dark; the Print dialog
  as a free and a Pro user; a Guide deep link.

## Out of scope

- Public share links for editions.
- Changes to the pdfmake layout or retiring pdfmake.
- Changes to Studio generation, editing, or finalizing.

## Risks

- **Preview cost.** The preview fetch uses the edition page's options, which
  include images, so a large trip can take a moment. Mitigated by fetching
  only on dialog open for non-Pro users, a skeleton, and the fallback card.
- **Showcase generation.** Needs `OPENAI_API_KEY` and three model calls; run
  once, results committed. The image step needs macOS. CI never runs the
  script, and the committed-asset test catches a hand-edited edition that
  breaks the house voice.
- **Font load on the landing page.** Edition pairings load only inside the
  lazy stage, and only for the selected chip plus the first edition.
