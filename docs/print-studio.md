# Print Studio

The paid (Pro) feature: an AI-art-directed printable edition of a trip, laid out on Letter pages. CLAUDE.md §23 carries the short version; this is the full contract. Read it before changing anything under `src/lib/printDesign/`, `src/components/trip/print-studio/`, `src/components/landing/print-showcase/`, `server/routes/print-design.ts` or `server/lib/print*.ts`.

## File map

| Path | Role |
|---|---|
| `src/lib/printDesign/trip.ts` | `buildPrintTrip`: raw rows → the edition's model of the trip. Shared by the browser and the server (relative imports only) |
| `src/lib/printDesign/dates.ts` | ISO dates read in UTC, weekdays, date ranges, wall-clock time formatting |
| `src/lib/printDesign/plan.ts` | The page planner: trip analysis (density, length, legs) and `planEdition` (which page holds what) |
| `src/lib/printDesign/spec.ts` | Design-spec contract, registries (`FONT_PAIRINGS`, `MOTIFS`, `MOTIF_NOTES`), `sanitizePrintDesign`, the weekday guard, `auditPrintPalette`, `auditPrintCopy` (shared client/server, dependency-free) |
| `src/lib/printDesign/color.ts` / `palette.ts` | WCAG contrast + OKLCH; `resolvePalette`, `PALETTE_FLOORS`, `resolveFills` |
| `src/lib/printDesign/voice.ts` | House voice: `VOICE_RULES` (prompt half), `findSlop` / `repairCopy` (gate half) |
| `src/lib/printDesign/edits.ts` | Editable-copy contract: override layer, human-copy sanitizer (no slop gate), `withDayTitles` |
| `src/lib/printDesign/sample.ts` | `SAMPLE_TEASER_DESIGN` for the free Studio preview (no AI call, no prose) |
| `src/components/trip/print-studio/PrintDocument.tsx` | Plans the pages, draws them, runs the fit loop |
| `src/components/trip/print-studio/pages.tsx` | One component per page kind (cover, overview, chapter, day, pair, details, ledger, back) |
| `src/components/trip/print-studio/fit.ts` | Measures each page for overflow and returns remedies for the planner |
| `src/components/trip/print-studio/art.tsx` | Filled SVG illustration: primitives per motif, compositions, hue-matched inks |
| `src/components/trip/print-studio/printDocument.css` | Letter sheets, print-size type, the edit-in-place styles |
| `src/components/trip/print-studio/SheetStack.tsx` | Scales the 816px sheets to the screen with a transform |
| `src/components/trip/print-studio/printTripData.ts` | Fetch rows, project, measure photos; the shared React Query key |
| `src/components/trip/print-studio/` (rest) | `PrintStudioDialog`, `SimplePdfSection`, `StudioTeaser`, `PageThumbnail`, `EditableCopy`, `useGoogleFonts` |
| `src/pages/PrintItinerary.tsx` | Output page, `/trip/:tripId/print/:designId` |
| `server/routes/print-design.ts` | Generate + finalize endpoints |
| `server/lib/printDesign.ts` | Trip payload + OpenAI call (raw `fetch` to chat completions; no `openai` package) |
| `server/lib/printSnapshot.ts` | The trip's raw rows (service role): generation reads them, finalizing freezes them |
| `src/components/landing/print-showcase/` | Landing-page demo: fixture, generated editions, interactive stage |

## Entry and tiers

One **Print** button in the TimelineView toolbar opens `PrintStudioDialog`, which holds both halves: a free **Simple PDF** section (`SimplePdfSection.tsx`, the pdfmake export of CLAUDE.md §7) above a **Studio edition** section. Pro members get the theme field. Free members see the first day page of their own trip rendered by `PrintDocument` in the fixed `SAMPLE_TEASER_DESIGN`, with no AI call and no invented prose, and the upgrade button beneath. Anyone with trip access can open existing editions.

## Division of labor (the design invariant)

The model is creative director only. It returns a `PrintDesignSpec` (palette, font-pairing id, motif id, layout, cover copy, intro, and per day a headline, a caption, the place the traveler is based, and a feature flag) through a strict json_schema. The layout engine, not the model, decides the pages. Every itinerary item is drawn from the trip's rows through `buildPrintTrip`, so model output can degrade style, never content.

## Reading the trip

`buildPrintTrip` (`src/lib/printDesign/trip.ts`) reads every field a traveler can fill in, because the edition is the record they hand to the people they travel with:

- Activities: times, address, phone, website, notes. Reservations: placed by `day_id` (the time column carries no date), party size, confirmation, phone, address. Stays: check-in and check-out items, and "Tonight: …" on every night they cover. Journeys: flight number, provider, confirmation, both times with zone labels, an arrival item on the day an overnight leg lands, and a rental car as two moments (pickup, return), the same split as the timeline.
- Links in notes are lifted out: the page prints "Tickets: christmaslandny.com/tickets" and the shared PDF keeps the real link. The lead-in that only announced the link ("Link for tickets:") goes with it; every other word stays.
- Airport names with a code are shortened ("Raleigh-Durham International Airport (RDU)" → "Raleigh-Durham (RDU)"); anything else prints as entered.
- Photos keep the traveler's `cover_image_position` / `image_position`, and the browser measures each photo's natural size (`resolvePrintImages`) before the page draws, because a photo is laid out at its own proportions. **Photos are never cropped.**

The Simple PDF keeps its own projection (`src/services/pdf/data.ts`). The two share only the row reads: `fetchTripRows` and `fetchTripSnapshot` select the same columns, including `trips.cover_image_position` and `trip_days.image_url` / `image_position`.

## Planning the pages

Every page is a fixed Letter sheet, portrait: 816 × 1056 CSS px at 96 per inch, the same box on screen and on paper. `planEdition` (`src/lib/printDesign/plan.ts`) reads the trip the way a designer would:

- **Length.** One day: cover, the day, back. Two to three days: a page per day however light, since room is the point. Four days and up: light neighbours share a sheet.
- **Density.** Each day is weighed by an estimate of what it holds (`estimateItem`): `open`, `light` (fits half a sheet), `full`, `packed`. Two adjacent light days in the same place pair up. Feature days, days with the traveler's own photo (on trips up to 8 days), and days the fit loop marked `solo` never pair.
- **Locations.** Consecutive days with the same `dayPlaces` value make a leg; a gap takes its neighbour's place, so a missing answer never invents a chapter. With 2 to 8 legs, a leg of 3+ days on a trip of 8+ days opens with a chapter page; shorter legs get a banner on their first day. One place, or a different town every day, gets no signposts.
- The page order: cover, the trip at a glance (with the bookings box when there are at most six rows on a trip of at most eight days), per leg a chapter and its days, a bookings page when the box did not fit, the opt-in Ledger, the back page.
- Bookings earn a place only with something to quote at a desk: a stay, a confirmation code, a flight number or a phone number.

Estimates only choose layouts. **They never split a day.** That is the fit loop's job.

## The fit loop

`PrintDocument` measures every page after each render, before paint (`useLayoutEffect` → `measureOverflow` in `fit.ts`). Each page that can run long marks its flowing region `data-pd-flow` and each unit inside it `data-pd-block`. The first unit whose bottom passes the region's bottom returns a remedy token, the plan is rebuilt with it, and the loop repeats until nothing overflows:

| Overflow on | First remedy | Then |
|---|---|---|
| a shared sheet | `solo:<date>` for both days | |
| the overview's bookings box | `details:own` (bookings get their own page) | |
| the overview's day list | `compact:overview` (one line of summary per day) | `break:overview:<row>` |
| a day | `tight:<date>` (closer spacing) | `break:day:<date>:<item>` |
| the bookings page | `break:details:<row>` | |

A page is tightened before it is split, so running a few pixels long never costs a sheet, and a day breaks only between two items, exactly where it ran out of paper. Tokens only add constraints, so the loop converges. `layoutKey` (fonts landing, an edit saved) restarts it from the estimates; while editing, the fit only adds breaks, so typing never reshuffles pages that already fit. `onSettled(plan)` reports the result; the edition page gates Print on it and states it in the toolbar via `describePlan` ("7 pages · 4 days · …").

## Art

`art.tsx` draws each motif as filled, multi-colour illustration in SVG content (it prints whatever the browser's background-graphics setting says): holly with berries, snowflakes, decorated pines, baubles on a swag, stars, maple and almond leaves, blossoms, citrus, seigaiha waves, palms, mountains, deco fans, botanical sprigs, Bauhaus shapes, confetti, dots, sunbursts.

- Compositions: `ArtField` (a jittered field across a cover, chapter or back page), `ArtFrieze` (along an edge: things that stand stand on the bottom, baubles hang from a swag, holly runs as a garland, snow drifts), `ArtCorner` (two rings out from a corner), `ArtMark` (one piece). A paper cover gives standing motifs its top corners instead of hanging them upside down.
- `inksFor` picks each part's colour from the edition's own fills by hue (holly leaves near green, berries near red), so the art reads right whatever order the model listed its fills in, and swaps a colour that would vanish into the ground it sits on. Snow and stars turn white on a coloured ground.
- Art never sits behind words. It takes corners, edges, painted covers behind a paper card, and the space a page leaves under its last item (`ArtFill`, which measures that gap with `clientHeight` and composes for exactly its height). Everything is seeded from the edition, so a page draws the same picture every time.

## Sanitizer: legibility and facts, not taste

`spec.ts` holds the registries and `sanitizePrintDesign`.

- Any page colour, surface and fill passes through (saturated, dark, neon). Only the text roles are adjusted, in OKLCH lightness with hue and chroma held, until they clear `PALETTE_FLOORS` (ink/muted/secondary/primary 4.5:1, accent 3:1). Each fill gets a text colour that clears 4.5:1 on it. On the page, text sits only on the paper or on a fill with its own on-fill colour, never on a tint; a day's numeral uses its fill only when that clears 3:1 against the paper.
- Per-day copy arrives as the model's `days` array, the older `dayCaptions` array, or the stored records (`dayCaptions`, `dayHeadlines`, `dayPlaces`, `featureDays`). Only real trip dates survive; at most `MAX_FEATURE_DAYS` (2) features. The new records are omitted when empty, so an older edition sanitizes to exactly what it was.
- **The weekday guard.** A headline or caption that names a weekday its date does not fall on is dropped ("Saturday brings Christmas Land" on a Sunday). Trip-level copy on a trip shorter than a week may only name weekdays the trip contains. "Sundays 5–10 pm" (opening hours) is not a day reference.
- Headlines over `DAY_HEADLINE_MAX` (60) are dropped rather than cut: display type cannot end in an ellipsis.
- `auditPrintPalette` and `auditPrintCopy` report every change (including `wrong weekday`) for the server log.
- **The edition page re-sanitizes the stored model output on read**, so an edition made before a rule existed still meets it. Only the model's words are touched: the traveler's edits live in `copy_overrides` and are layered on afterwards.

## House voice

`voice.ts` holds both halves of the anti-slop rule so they cannot drift: `VOICE_RULES` is injected into the generation prompt, and `findSlop` gates what comes back.

- Prose fields that break it (banned words, travel clichés, the holiday-card register such as "winter wonderland" and "sparkle of the season", binary contrasts, puffery, recap endings) are **dropped to their fallback rather than printed**.
- Em dashes are repaired before judging: a pair becomes commas, a lone dash before a new clause becomes a full stop (never a comma splice), a lone dash before a phrase becomes a comma.
- `cover.subtitle` and the per-day places are exempt: they are the traveler's own place names. A capitalized word mid-sentence counts as a name, which is why headlines are asked for in sentence case.

## Writing brief

`server/lib/printDesign.ts` builds the payload from `buildPrintTrip`, so the model captions exactly the days and items the page prints: every day carries its weekday, a reservation sits on its own day, and the trip carries `timing` (`upcoming`, `underway`, `past`) so an upcoming trip is never written as a memory. The prompt asks for captions that add something the schedule does not print, drawn only from the traveler's notes; never a repeated time. `THEME_CUES` say what a named occasion must look like (Christmas: deep red, evergreen and gold; holly, pines, ornaments or snowflakes; no unrelated novelty colour).

## Editing the words

An edition's AI prose is the traveler's to rewrite. `edits.ts` holds the contract: `EDITABLE_FIELDS` (cover title/tagline/route, edition name + note, intro, sign-off), plus per day a caption (`day.<date>`) and a headline (`headline.<date>`), `sanitizeCopyOverrides`, `applyCopyOverrides`, `pruneCopyOverrides`.

- Edits are stored in `copy_overrides` as a **layer over** `design`, never replacing it, so per-field revert is free and the model's version stays auditable.
- **The house-voice gate deliberately does NOT apply to human writing.** `cleanUserCopy` collapses whitespace, strips control characters and clamps length, but never runs `findSlop`.
- The traveler's own day titles outrank the model's headlines (`withDayTitles`, applied to the base before the overrides). A blanked headline is kept as `''`, so it beats the day title too.
- Blanking a required slot (cover title, edition name, sign-off) falls back to the AI's line; blanking an optional one deletes it.
- Editing happens *in place on the page* (`EditableCopy.tsx` + the `renderCopy` prop), because the only way to judge a line is to see it set in the face and colour it will print in.

## Live vs. finalized

An edition renders from **current** trip data until someone finalizes it, so a design made mid-planning keeps up with the plan.

- `POST /api/trips/:tripId/print-design/:designId/finalize` (`{ finalize: bool }`, edit permission, no Pro check) freezes the trip's raw rows into `content_snapshot`; the page then replays them through `buildPrintTrip`.
- `fetchTripSnapshot` (server) and `fetchTripRows` (browser) read the same columns. `src/services/pdf/snapshot.test.ts` holds the shape contract with the Simple PDF's projection.
- Finalizing runs server-side under the service role so the record stays truthful. The RLS UPDATE policy stops accepting copy edits once `finalized_at` is set, so reopening runs through the route.

## Server

`POST /api/trips/:tripId/print-design`: JWT auth + trip access + `subscription_tier === 'pro'` + 10 generations/user/day (counted from `trip_print_designs`), plus a per-IP limiter (12 per 10 min). Both routes 503 without `OPENAI_API_KEY`; `OPENAI_MODEL` overrides the default `gpt-4.1`.

Generation reads the trip with `fetchTripSnapshot` (the same reads finalizing uses), serializes it (clamped: ≤40 days, ≤20 items/day), calls OpenAI chat completions with `response_format: json_schema (strict)`, sanitizes, and stores the row. User theme text is quoted and pinned as "styling preference only", so the prompt-injection blast radius is copy text, which is length-clamped.

## Output page

`/trip/:tripId/print/:designId` (lazy) loads the design row (RLS: `can_access_trip`) + trip data, injects the pairing's Google Fonts, and renders the sheets in a `SheetStack`. Printing is the native browser dialog (`window.print()`). **AppLayout deliberately renders no nav/footer on `/trip/*/print/*`** so app chrome never reaches the printed page.

Two layouts, chosen by the model per edition (`design.layout`; absent = editorial):

- **editorial**: paper pages; art along the cover's edges and in each page's corners and leftover space.
- **bold**: painted covers and back page (a field of the motif behind a paper card) and a band of the day's fill across the top of every day page. Feature days get the band in either layout.

`print-color-adjust: exact` makes both print their colour.

Getting a clean print out of the browser:

- **Letter, no margins.** While the page is open it injects `@page { size: 8.5in 11in; margin: 0 }` (a `<style>` element, so the rule never reaches a print of any other page). Each sheet fills one sheet of paper and Chrome has no room for its date/title/URL header and footer. `.pd-sheet + .pd-sheet { break-before: page }` keeps a trailing blank page from appearing.
- **Type first.** The pages were measured in the pairing's faces, so `useGoogleFonts` reports when they have loaded, `layoutKey` re-runs the fit, and the Print button waits for both (fonts capped at `FONT_WAIT_MS`). Cmd+P can't be gated.
- **The screen shows the paper.** `SheetStack` scales the 816px sheets to the screen with a transform rather than reflowing them, so a phone shows the page that will print, line for line. Print drops the transform.
- **No overlays on paper.** A fixed element prints on every page, so the toaster, cookie banner and install card carry `print:hidden`.
- **Check it for real.** `page.pdf()` in Puppeteer (`puppeteer-core` + `/opt/pw-browsers/chromium` in a cloud session) runs Chrome's print pipeline; a correct edition gives one PDF page per sheet at 612 × 792 pt.

## Money stays off the page

An edition never prints per-item prices: `PrintItem` carries no cost at all. The Ledger (spend by category against the trip budget) is a page of its own, opt-in per print via the toolbar's **Budget** toggle (`?budget=1`, deliberately not stored on the edition). The generation payload omits costs and the budget, strips amounts of money from the traveler's notes, and leaves out confirmation codes and phone numbers, so the AI's copy has no prices to quote.

## Storage and deletion

Designs are stored, so an edition stays openable even if generation is later disabled. Deleting is creator-only (RLS). Column rules for `trip_print_designs` are in CLAUDE.md §8.

## Landing-page showcase

`components/landing/sections/PrintStudioShowcase.tsx` + `components/landing/print-showcase/`: a five-step demo (timeline → simple PDF → edition → rewritten words → print) that runs the real `PrintDocument` and `EditableCopy` over committed fixtures. The timeline step reads `tokyoTrip.json` (the Simple PDF's projection); the edition steps project `TOKYO_ROWS` through `buildPrintTrip`. It cannot drift from the product and makes no API or Supabase calls at runtime (only the edition's Google Fonts load).

- The stage is a lazy chunk mounted near the viewport and keeps one height across its steps. The edition step draws every page so an edition swap provably keeps every item; the frame shows the cover.
- A short autoplay (01 → 03) starts when the stage is 40% visible and ends at the first interaction.
- Regenerate the fixtures with `npm run build:print-showcase`. It needs `OPENAI_API_KEY` and makes three model calls. The PDF-page image step renders page 2 at 2x via `scripts/pdf-page-to-png.swift` (CoreGraphics), which needs macOS with the Xcode command line tools.
- `print-showcase/showcase.test.ts` holds the committed editions to the sanitizer and the house voice.
