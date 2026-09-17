# Print Studio

The paid (Pro) feature: an AI-art-directed printable keepsake itinerary. CLAUDE.md §23 carries the short version; this is the full contract. Read it before changing anything under `src/lib/printDesign/`, `src/components/trip/print-studio/`, `src/components/landing/print-showcase/`, `server/routes/print-design.ts` or `server/lib/print*.ts`.

## File map

| Path | Role |
|---|---|
| `src/lib/printDesign/spec.ts` | Design-spec contract, registries, `sanitizePrintDesign`, `auditPrintPalette`, `auditPrintCopy` (shared client/server, dependency-free) |
| `src/lib/printDesign/color.ts` / `palette.ts` | WCAG contrast + OKLCH; `resolvePalette`, `PALETTE_FLOORS`, `resolveFills` |
| `src/lib/printDesign/voice.ts` | House voice: `VOICE_RULES` (prompt half), `findSlop` / `repairCopy` (gate half) |
| `src/lib/printDesign/edits.ts` | Editable-copy contract: override layer, human-copy sanitizer (no slop gate) |
| `src/lib/printDesign/sample.ts` | `SAMPLE_TEASER_DESIGN` for the free Studio preview (no AI call, no prose) |
| `src/components/trip/print-studio/` | `PrintStudioDialog`, `SimplePdfSection`, `PrintDocument` + `printDocument.css`, `motifs.tsx`, `EditableCopy.tsx`, `ledger.ts` |
| `src/pages/PrintItinerary.tsx` | Output page, `/trip/:tripId/print/:designId` |
| `server/routes/print-design.ts` | Generate + finalize endpoints |
| `server/lib/printDesign.ts` | Trip payload + OpenAI call (raw `fetch` to chat completions; no `openai` package) |
| `server/lib/printSnapshot.ts` | Frozen-itinerary snapshot for a finalized edition (raw rows, service role) |
| `src/components/landing/print-showcase/` | Landing-page demo: fixture, generated editions, interactive stage |

## Entry and tiers

One **Print** button in the TimelineView toolbar opens `PrintStudioDialog`, which holds both halves: a free **Simple PDF** section (`SimplePdfSection.tsx`, the pdfmake export of CLAUDE.md §7) above a **Studio edition** section. Pro members get the theme field. Free members see their own trip rendered by `PrintDocument` in the fixed `SAMPLE_TEASER_DESIGN`, with no AI call and no invented prose, and the upgrade button beneath. Anyone with trip access can open existing editions.

## Division of labor (the design invariant)

The model is creative director only. It returns a `PrintDesignSpec` (palette, font-pairing id, motif id, layout, editorial copy including per-day captions) through a strict json_schema. The renderer draws **every itinerary item from the DB** via the same `fetchPdfTripData` module the PDF export uses, so model output can degrade style, never content.

## Sanitizer: legibility, not taste

`spec.ts` holds the registries (`FONT_PAIRINGS` → Google Fonts pairs, `MOTIFS`, `PRINT_LAYOUTS`) and `sanitizePrintDesign`.

- Any page colour, surface and fill passes through (saturated, dark, neon). Only the text roles are adjusted, in OKLCH lightness with hue and chroma held, until they clear `PALETTE_FLOORS` (ink/muted/secondary/primary 4.5:1, accent 3:1).
- A text colour is never swapped for another role's. Each fill gets a text colour that clears 4.5:1 on it.
- Also: registry-id fallbacks, copy length clamps, captions restricted to real trip dates.
- `auditPrintPalette` reports every colour change for the server log.

## House voice

`voice.ts` holds both halves of the anti-slop rule so they cannot drift: `VOICE_RULES` is injected into the generation prompt, and `findSlop` gates what comes back.

- Prose fields that break it (banned words, travel clichés, binary contrasts, puffery, recap endings) are **dropped to their fallback rather than printed**. Em dashes are repaired to commas first.
- `cover.subtitle` is exempt: it is the traveler's own place names, not the model's prose.
- `auditPrintCopy` logs every drop with its reason, so voice drift is visible instead of silent.

## Editing the words

An edition's AI prose is the traveler's to rewrite. `edits.ts` holds the contract: `EDITABLE_FIELDS` (cover title/tagline/route, edition name + note, intro, sign-off, plus one caption per day), `sanitizeCopyOverrides`, `applyCopyOverrides`, `pruneCopyOverrides`.

- Edits are stored in `copy_overrides` as a **layer over** `design`, never replacing it, so per-field revert is free and the model's version stays auditable.
- **The house-voice gate deliberately does NOT apply to human writing.** `cleanUserCopy` collapses whitespace, strips control characters and clamps length, but never runs `findSlop`.
- Blanking a required slot (cover title, edition name, sign-off) falls back to the AI's line; blanking an optional one deletes it.
- Editing happens *in place on the document* (`EditableCopy.tsx` + the `renderCopy` prop on `PrintDocument`), because the only way to judge a line is to see it set in the face and colour it will print in.

## Live vs. finalized

An edition renders from **current** trip data until someone finalizes it, so a design made mid-planning keeps up with the plan.

- `POST /api/trips/:tripId/print-design/:designId/finalize` (`{ finalize: bool }`, edit permission, no Pro check) freezes the itinerary into `content_snapshot`; the page then renders from that.
- The snapshot holds **raw rows** (`server/lib/printSnapshot.ts`), not a rendered file, and is replayed through the same `buildPdfTripData` projection a live edition uses. `src/services/pdf/data.ts` is split into `fetchTripRows` (the only Supabase round trip) + `buildPdfTripData` (projection) for exactly this. `src/services/pdf/snapshot.test.ts` holds the shape contract between server and renderer.
- Finalizing runs server-side under the service role so the record stays truthful. The RLS UPDATE policy stops accepting copy edits once `finalized_at` is set, so reopening runs through the route.

## Server

`POST /api/trips/:tripId/print-design`: JWT auth + trip access + `subscription_tier === 'pro'` + 10 generations/user/day (counted from `trip_print_designs`), plus a per-IP limiter (12 per 10 min). Both routes 503 without `OPENAI_API_KEY`; `OPENAI_MODEL` overrides the default `gpt-4.1`.

`server/lib/printDesign.ts` serializes the full trip server-side (clamped: ≤40 days, ≤20 activities/day), calls OpenAI chat completions with `response_format: json_schema (strict)`, sanitizes, and stores the row. User theme text is quoted and pinned as "styling preference only", so the prompt-injection blast radius is copy text, which is length-clamped.

## Output page

`/trip/:tripId/print/:designId` (lazy) loads the design row (RLS: `can_access_trip`) + trip data, injects the pairing's Google Fonts, and renders `PrintDocument` (stroke-based SVG motifs). Printing is the native browser dialog (`window.print()`). **AppLayout deliberately renders no nav/footer on `/trip/*/print/*`** so app chrome never reaches the printed page.

Two layouts, chosen by the model per edition (`design.layout`; absent = editorial):

- **editorial** carries structure in type + hairline rules.
- **bold** (`[data-layout='bold']` in `printDocument.css`) paints the palette's fills into the cover and closing panels, section bands, day-number badges, item icons and table heads. Every piece of text inside a shape uses that fill's sanitizer-chosen text colour.

`print-color-adjust: exact` makes both print their colour.

## Money stays off the page

An edition never prints per-item prices. The Ledger (spend by category against the trip budget) is opt-in per print via the toolbar's **Budget** toggle (`?budget=1`, deliberately not stored on the edition). The generation payload omits costs, the budget and other expenses entirely, so the AI's copy has no prices to quote.

## Storage and deletion

Designs are stored, so an edition stays openable even if generation is later disabled. Deleting is creator-only (RLS). Column rules for `trip_print_designs` are in CLAUDE.md §8.

## Landing-page showcase

`components/landing/sections/PrintStudioShowcase.tsx` + `components/landing/print-showcase/`: a five-step demo (timeline → simple PDF → edition → rewritten words → print) that runs the real `PrintDocument` and `EditableCopy` over committed fixtures. It cannot drift from the product and makes no API or Supabase calls at runtime (only the edition's Google Fonts load).

- The stage is a lazy chunk mounted near the viewport and keeps one height across its steps.
- A short autoplay (01 → 03) starts when the stage is 40% visible and ends at the first interaction.
- Regenerate the fixtures with `npm run build:print-showcase`. It needs `OPENAI_API_KEY` and makes three model calls. The PDF-page image step renders page 2 at 2x via `scripts/pdf-page-to-png.swift` (CoreGraphics), which needs macOS with the Xcode command line tools.
- `print-showcase/showcase.test.ts` holds the committed editions to the sanitizer and the house voice.
