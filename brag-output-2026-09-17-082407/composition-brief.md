# Hyperframes Composition Brief: WanderLuxe (vertical cut)

## Objective
Create the 9:16 social cut of the WanderLuxe brag video: the same story, copy, music and beat locks as the landscape cut in `brag-output/`, re-laid out for a phone held upright.

## Output
- Composition directory: `brag-output-2026-09-17-082407/composition/`
- Rendered video: `brag-output-2026-09-17-082407/brag.mp4`
- Format: vertical — 1080x1920
- Duration: 21.6 seconds

## Source Material
- Project root: `/Users/reminiscent/wanderluxe/.claude/worktrees/great-diffie-33dd38`
- Reference implementation: `brag-output/composition/index.html` (landscape). Keep its timeline, copy, assets and audio. Change layout only.
- Same files read as the landscape brief (Hero, landing sections, print-showcase fixtures, AIAssistantPanel / ExtractionResultMessage / ExtractedItemCard, PrintDocument, DESIGN.md, PRODUCT.md).
- Product name: WanderLuxe
- Tagline / strongest claim: "Paste a confirmation and it lands on the right day."
- Key UI to recreate: Trip Assistant extraction message (Found / Added 1 item, Flight: ANA 175 card, Import → Imported, Review & edit) and the Saturday, October 3 day card ("Landing, and a first walk").
- Real product imagery: `app-timeline.jpg`, `app-calendar.jpg`, `app-map.jpg`, `print-showcase-simple-pdf.png`, and the six edition crops rendered by the real `PrintDocument` (reused from the landscape composition).
- Copy that must appear verbatim: "Your journey deserves more than a spreadsheet." · "Paste a confirmation and it lands on the right day." · "Plan together, in real time." · "Print Studio" · "The plan you made, set as something to keep" · "Plan the trip together." · "Start planning, free" · edition names · "Simple PDF" / "Studio edition".

## Creative Direction
- Tone preset: `polished`
- Creative direction: a travel-magazine feature set in motion, read on a phone
- Interpretation: calm confidence, mostly vertical motion with exponential ease-out, no bounce, holds long enough to read at feed size
- Angle: from spreadsheet to keepsake, flowing top to bottom (the confirmation is read above, and the flight drops into its day below)
- Hook: chat bubble + spreadsheet on top, the site's hook line in large serif below
- Outro / punchline: centered lockup on the closing band with the one sunset button
- Avoid: generic SaaS language, abstract filler, side-by-side panels that shrink type, critical text in the platform-UI zones

## Layout (1080x1920)
- Margins: 72px left/right. Critical text within about y 220–1520.
- Scene 1: chat y≈250–460 · spreadsheet 936×548 at y 500 (three data columns: what / when / notes) · hook 108px, three lines at y 1110
- Scene 2: caption 84px, three lines at y 236 · Trip Assistant 936×452 at y 528 (no composer) · day card 936×500 at y 1012 (rows 108px apart)
- Scene 3: headline 124px, two lines at y 250 · Live row at y 540 · 340×658 phone fan centered at x 280 / 540 / 800 (center on top) · labels at y 1420
- Scene 4: eyebrow y 236 · headline 84px, two lines at y 282 · chips at y 494 · step label y 648 · PDF behind · cover print 600w at (72, 730) · Day 01 print 580w at (428, 990)
- Scene 5: centered stack at y≈640–1160: wordmark 164px, rule, line 66px, CTA, URL

## Visual Identity
Same tokens as the landscape brief: Cream `#FDFCF8`, Vellum `#FAF8F5`, Raw Linen `#EEE7DA`, Tea-Stained `#EDDCC8`, Stitched Edge `#DDD4C8`, Espresso Ink `#211F1B`, Earth-600 `#5C544A`, Earth-500 `#6B6354`, Earth-100 `#E6E2DE`, Roasted Bronze `#603D2E`, Kiln Rust → Fired Clay button, destructive ink `#A93E32`, category inks (slate/clay/sage). DM Serif Display + DM Sans embedded locally. Bronze shadows only; no pure white surfaces, no black text, no gradient text, no glass, no bounce.

## Storyboard
Contract: `brag-output-2026-09-17-082407/brag-plan.md`.
1. The spreadsheet — 4.2s — chat, grid, hook (≥2.4s settled)
2. Paste a confirmation — 5.4s — caption (≥3s), assistant, click, the flight drops into Oct 3 (8.74s lock)
3. Plan together — 3.5s — headline, Live, phone fan dealt 9.83 / 10.37 / 10.93 then held
4. Print Studio — 4.3s — headline (≥2.7s), chips, PDF, editions at 14.20 / 15.29 / 16.38
5. Outro — 4.2s — lockup (17.47s lock), CTA, URL

## Audio
Identical to the landscape brief: music bed `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` with a volume automation lane (0 → 0.3 by 0.4s, 0.3 → 0 over 20.4–21.6s); SFX `keyboard/keypress-004/011/019`, `interface/drop_002`, `ui/click2`, `impact/impactSoft_medium_001`, `casino/card-slide-1` ×2, `impact/impactBell_heavy_000` at the same timestamps and levels; subtle RMS-driven warmth (pre-extracted data reused); master to about −16 LUFS on delivery.

## Hyperframes Instructions
Use the Hyperframes domain skills (`hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli`), not the `hyperframes` entry-point interview. Single paused GSAP timeline, seek-safe `fromTo` / baselined `to` tweens, local assets, `hyperframes check` as the gate before render.
