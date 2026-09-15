# Print Studio expressive palettes — design

Date: 2026-09-15
Status: approved in chat, pending spec review

## Goal

A Print Studio edition should look like what the traveler asked for, whether
that is a quiet editorial keepsake or a bright, poppy party invitation, while
every printed word stays legible. Editions are the paid feature, and they are
explicitly not bound by the site's own design system. Most editions will be
adult and restrained; the pipeline must not assume that.

## What is wrong today

Measured on 2026-09-15 with raw (pre-sanitize) gpt-4.1 responses on the Tokyo
fixture. Full write-up: https://claude.ai/artifact/9oeoxAmAq2pPxgzNZKrtSx

- `sanitizePrintDesign` replaces a text colour that misses its contrast floor
  with another role's colour (accent → secondary → primary → ink) or with the
  house fallback. 9 of 9 generations from the current prompt lost at least one
  of primary, secondary and accent. A "bright, poppy, rainbow" birthday brief
  shipped with pink, turquoise and lime replaced by near-black in 2 of 3 runs.
- The page background must have luminance ≥ 0.5 and the surface ≥ 0.4, so a
  saturated or dark page is impossible.
- The prompt says the background is "near-white paper" and "Never use neon".
- The renderer uses colour only as type and 1px hairlines (often mixed down to
  25–35%). The one fill is a mat behind the cover photo.
- The font and motif registries are editorial only.
- `primary` is held to 3:1 as "display only", but it sets 11.5px section
  labels and 23.2px / 20.8px regular text, which WCAG does not count as large.
- Nothing logs a palette change.

## Non-goals

- The model does not write CSS or pick per-element colours.
- Itinerary content rules are unchanged: every item comes from the database,
  and no prices appear unless the traveler opts into the Ledger.
- The house voice gate on copy is unchanged.
- Stored editions are not migrated or re-sanitized.
- No layout toggle in the dialog. The model picks the layout; regenerating
  with a different theme request changes it.

## Principle: sanitize for legibility, not taste

The sanitizer keeps these invariants and no others:

1. Every colour is a normalized `#rrggbb`.
2. Every text role clears its floor against the page background:
   `ink`, `muted`, `secondary`, `primary` ≥ 4.5:1; `accent` ≥ 3:1 (it draws the
   item-type icon rings, which are meaningful graphics).
3. Text sits only on the page background or on a fill. Text on a fill uses
   that fill's computed text colour, which clears 4.5:1 against the fill.
   `surface` never carries text.
4. Registry ids are known, copy is clamped, captions only use real trip dates
   (unchanged).

Everything else passes through as the model sent it: any page colour (light,
saturated or dark), any surface, neon, fills of any brightness.

When a text colour misses its floor, only its lightness moves, away from the
page colour, with hue and chroma held. It is never swapped for another role's
colour or the house colour.

## Data contract — `src/lib/printDesign/spec.ts`

```ts
export const PRINT_LAYOUTS = ['editorial', 'bold'] as const;
export type PrintLayout = (typeof PRINT_LAYOUTS)[number];

/** A solid shape colour plus the text colour the sanitizer chose for it. */
export interface PrintFill {
  color: string;
  text: string;
}

export interface PrintPalette {
  primary: string; secondary: string; background: string; surface: string;
  ink: string; muted: string; accent: string;
  /** 0–4 solid shape colours. Absent on editions stored before 2026-09-15. */
  fills?: PrintFill[];
}

export interface PrintDesignSpec {
  // ...existing fields unchanged
  /** Absent on stored editions; absent means 'editorial'. */
  layout?: PrintLayout;
}
```

All new fields are optional so every stored edition and the landing branch's
`sample.ts` stay valid. The model sends `palette.fills` as `string[]`; the
sanitizer turns it into `PrintFill[]`, which is what is stored.

Shared helpers, used by both sanitizer and renderer so they cannot disagree:

- `resolveFills(palette: PrintPalette): PrintFill[]` — returns `palette.fills`
  when non-empty, otherwise derives fills from `primary`, `accent`,
  `secondary` (deduped), each with a computed text colour.
- `textOnFill(fill, ink, background): string` — the first of the resolved
  `ink` and `background` that clears 4.5:1 on the fill; otherwise whichever of `#000000`
  and `#ffffff` contrasts more (always ≥ 4.58:1, so always passes).

## Palette resolution

`resolvePalette(rawPalette: unknown): { palette: PrintPalette; adjustments: PaletteAdjustment[] }`
is the single code path for both `sanitizePrintDesign` and `auditPrintPalette`.

```ts
export const PALETTE_FLOORS = { ink: 4.5, muted: 4.5, secondary: 4.5, primary: 4.5, accent: 3 } as const;
```

1. `background` = the model's value if it is a valid hex, else
   `FALLBACK_PALETTE.background`. No luminance gate.
2. `surface` = the model's value if valid, else `background`. No gate.
3. For each text role: start from the model's value if valid, else
   `FALLBACK_PALETTE[role]`, then `ensureContrast(start, background, floor)`.
4. `fills`: accept each entry as a hex string (model output) or a `{ color }`
   object (a stored `PrintFill`, so sanitizing twice returns the same
   palette). Keep valid colours, normalize, dedupe, cap at 4, and attach
   `textOnFill` using the resolved `ink` and `background`. No contrast gate
   against the page: fills are shapes.
5. `layout` (handled in `sanitizePrintDesign`): a known id or `'editorial'`.
   A bold layout with no valid fills keeps `fills` empty; the renderer's
   `resolveFills` derives them.

`ensureContrast(hex, ground, floor)`:

- Return `hex` unchanged if it already clears `floor`.
- Pick the pole (black or white) that contrasts more with `ground`. The better
  pole always reaches ≥ 4.58:1, so a solution always exists.
- Convert to OKLCH. Binary-search lightness between the colour's own L and the
  pole's L, holding hue and chroma. Chroma is reduced only when needed to stay
  inside sRGB; hue never changes. Return the colour nearest the original that
  clears `floor`.
- The predicate is monotone along that path: a colour on the "wrong side" of
  the ground first loses contrast until it crosses the ground's luminance, then
  gains it, and it is below the floor the whole way to the crossing.
- After 8-bit rounding, step further toward the pole if needed. If that still
  fails, return the pole itself.

Each role whose value changed, or came from the fallback, adds a
`PaletteAdjustment { role, from, to, ratio, floor, kind }` where `kind` is
`'adjusted' | 'replaced' | 'dropped'`. Each invalid fill adds
`{ role: 'fills', from, kind: 'dropped' }`.

## Registries

`FONT_PAIRINGS` gains five pairings (all verified to resolve on Google Fonts
on 2026-09-15). Single-weight display faces are set at 400, as today.

| id | display | body | Google Fonts query |
|---|---|---|---|
| `playful` | Fredoka | Nunito | `family=Fredoka:wght@400;600&family=Nunito:wght@400;600;700` |
| `poster` | Lilita One | Poppins | `family=Lilita+One&family=Poppins:wght@400;500;600` |
| `retro` | Shrikhand | Karla | `family=Shrikhand&family=Karla:wght@400;500;700` |
| `grotesque` | Archivo Black | Archivo | `family=Archivo+Black&family=Archivo:wght@400;500;600` |
| `expanded` | Unbounded | Work Sans | `family=Unbounded:wght@400;600&family=Work+Sans:wght@400;500;600` |

`MOTIFS` gains `confetti`, `dots` and `sunburst`, drawn in `motifs.tsx` the same
way as the existing tiles (`currentColor` strokes, small filled circles where
the existing `stars` and `geometric` tiles already use them).

All existing `FontPairingId` and `MotifId` values stay valid.

## Rendering — `PrintDocument.tsx` + `printDocument.css`

### Both layouts

- `.print-doc` gets `data-layout={design.layout ?? 'editorial'}`.
- Style vars `--pd-fill-1`…`--pd-fill-4` and `--pd-on-fill-1`…`--pd-on-fill-4`
  come from `resolveFills(palette)`, cycling when there are fewer than four.
- Each day sets `--pd-day-fill` / `--pd-day-on-fill` inline from fill
  `i % n`.
- The cover's eyebrow, title, tagline, route and dates are wrapped in a
  `div.pd-cover-panel`. In editorial it is `display: contents`, so editorial
  layout does not change by a pixel.
- Editorial CSS is otherwise untouched. It already draws everything from the
  palette vars, so it works on saturated and dark pages as the sanitizer now
  allows.

### Bold (`.print-doc[data-layout="bold"]`)

Colour moves from hairlines into shapes. All text inside a shape uses that
shape's on-fill colour.

- Cover: `.pd-cover-panel` is a fill-1 panel; everything in it is on-fill-1.
  The motif band above it draws in fill-2. The photo mat and theme plate stay
  on the page.
- Section labels: the label is a fill-2 band in on-fill-2; the trailing rule
  is fill-2 at full strength, 2px.
- Day header: the day number is a solid badge in the day fill with day
  on-fill text; the header's top rule is 3px in the day fill.
- Item icons: a solid circle in the day fill, icon in day on-fill.
- Particulars tables: header cells are fill-3 with on-fill-3 text.
- Closing: `.pd-closing` is a fill-1 panel; closing line, mark and credit are
  on-fill-1.
- Intro drop cap and fact values stay `primary`: they are text on the page,
  and fills carry no floor against the page.
- Editing: inside a panel the edit underline and hover tint use
  `currentColor` rather than accent, so they stay visible on any fill.
- Print: fills rely on the existing `print-color-adjust: exact`. Panels and
  badges get `break-inside: avoid`. The narrow-screen block adjusts panel
  padding.

## Prompt and schema — `server/lib/printDesign.ts`

The palette brief is rewritten to say:

- The background may be any colour. Light paper is the classic keepsake and
  the default; go saturated or dark when the theme asks for it.
- `ink`, `muted`, `secondary` and `primary` are text on that page and need
  4.5:1; `accent` draws icons and needs 3:1. Pastel text roles cannot pass. A
  miss is moved lighter or darker at the same hue.
- `fills` are 2–4 colours for solid shapes (panels, badges, bands), at any
  brightness. Neon is welcome when the theme calls for it.
- Give primary, secondary, accent and the fills clearly different hues or
  depths. Muted is a toned colour from the theme, not plain grey.
- `layout`: `editorial` (type and hairlines, quiet, suits most trips) or
  `bold` (colour panels and badges, for parties, pop, poster, playful, or
  anything loud).
- Follow the traveler's theme request; do not tone it down.

It contains no hex examples: the model copies them verbatim. "Never use neon"
and "near-white paper" are removed. The theme-request injection guard is
unchanged.

`PRINT_DESIGN_SCHEMA` adds `layout: { type: 'string', enum: PRINT_LAYOUTS }`
and `palette.fills: { type: 'array', items: { type: 'string' } }`, both in
their object's `required` list (strict mode).

## Observability

- `auditPrintPalette(raw)` returns `resolvePalette(raw.palette).adjustments`.
- `generatePrintDesign` warns once per edition when there are adjustments,
  next to the copy audit:
  `print-design palette adjusted: primary #f654a6 (2.96:1 < 4.5) → #d02d86 | …`

## Dialog

`PaletteSwatch` in `PrintStudioDialog.tsx` shows the first three fills when an
edition has them, otherwise primary / accent / secondary as today. No other
dialog change. The landing branch also edits this file; expect a small merge.

## Compatibility

- Stored editions have no `layout` or `fills`: they render as editorial,
  unchanged, from their stored palette.
- `sample.ts` on `claude/print-studio-landing-page-ee2863` compiles unchanged.
- The PDF export does not read the design spec and is unaffected.

## Testing

`src/lib/printDesign/spec.test.ts`

- Replace the three demotion tests: a low-contrast primary, secondary or
  accent keeps its OKLCH hue within 2° and clears its floor.
- Dark background accepted, and text roles are lightened to their floors.
- Saturated background (e.g. `#ff00aa`) and any surface pass through.
- Fills: valid values pass through regardless of page contrast; invalid ones
  are dropped; duplicates removed; capped at 4; every fill's text clears 4.5:1
  on it; `ink` is preferred, then `background`.
- Unknown layout → `editorial`.
- Property test over several thousand random palettes, dark grounds
  included: every floor holds, every fill text holds, and sanitizing twice
  returns the same palette.
- The fallback palette and `VALID_RAW` pass through unchanged, and the
  fallback gate test checks primary at 4.5.
- `auditPrintPalette` reports what changed.

`server/lib/printDesign.test.ts`

- The strict-schema test covers the new properties.
- The prompt no longer contains "Never use neon" or "near-white"; it
  describes fills and layout; the font and motif menus include the new ids.

`src/components/trip/print-studio/PrintDocument.test.tsx`

- Bold renders every item title editorial renders (content parity).
- `data-layout` is set, and a design with no `layout` renders editorial.
- Every motif renders through `MotifBand` and `MotifMark`.

Visual check (not committed): regenerate the kid's-party and Tokyo themes,
sanitize, render both layouts through `PrintDocument` in a scratch harness,
and screenshot desktop, 375px and print emulation.

## Docs

- `CLAUDE.md` §23: the shared-contract bullet (sanitizer description) and the
  output-page bullet (hairlines-not-fills) describe layouts, fills and the
  legibility-only sanitizer.
- `spec.ts` header and `sanitizePrintDesign` guarantees; `printDocument.css`
  header comment.

## Risks

- The model may reach for `bold` on sober trips. The prompt makes editorial
  the default; the adjustment log and stored designs make drift visible.
- Saturated and dark pages use a lot of ink on home printers. Accepted as a
  product decision on 2026-09-15 in favour of flexibility.
- `ensureContrast` on dark grounds is new ground; covered by the property test.
