# Hyperframes Composition Brief: WanderLuxe

## Objective
Create a short launch-style brag video for WanderLuxe: one Tokyo trip goes from a cluttered spreadsheet to a shared itinerary to a designed Print Studio edition.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 21.6 seconds

## Source Material
- Project root: `/Users/reminiscent/wanderluxe/.claude/worktrees/great-diffie-33dd38`
- Primary files read: `index.html`, `src/components/Hero.tsx`, `src/components/landing/sections/*`, `src/components/landing/print-showcase/*`, `src/components/trip/ai-assistant/{AIAssistantPanel,ChatMessage,ExtractionResultMessage,ExtractedItemCard,PromptChips}.tsx`, `src/components/trip/print-studio/{PrintDocument.tsx,printDocument.css,PageThumbnail.tsx}`, `DESIGN.md`, `PRODUCT.md`, `tailwind.config.ts`, `src/index.css`
- Product name: WanderLuxe
- Tagline / strongest claim: "Paste a confirmation and it lands on the right day."
- Key UI to recreate: the Trip Assistant extraction message (header "Found 1 item", "From ANA 175 confirmation.pdf · 1 transport", item card "Flight: ANA 175" / "San Francisco (SFO) → Tokyo (HND) • Oct 3 • 11:05", buttons "Import" + "Review & edit", Import becomes "Imported") and the timeline day card for Saturday, October 3, "Landing, and a first walk".
- Real product imagery used as-is:
  - `public/images/app-timeline.jpg`, `app-calendar.jpg`, `app-map.jpg` (phone captures of the Tokyo trip)
  - `public/images/print-showcase-simple-pdf.png` (the free simple PDF page)
  - Print Studio editions rendered for this video by the real `PrintDocument` component from the committed `tokyoEditions.json` + `tokyoTrip.json` fixtures (server-rendered, screenshotted at 2x): `edition-{0,1,2}-cover.png` (cover band through dates) and `edition-{0,1,2}-day1.png` (Day 01 block, which contains the same Flight: ANA 175 row the video imports)
- Copy that must appear verbatim:
  - "Your journey deserves more than a spreadsheet." (HookSection)
  - "Paste a confirmation and it lands on the right day." (Hero lede)
  - "Plan together, in real time." (ValueProps; trailing period added as a caption)
  - "Print Studio" / "The plan you made, set as something to keep" (PrintStudioShowcase)
  - "Plan the trip together." (Hero H1)
  - "Start planning, free" (primary CTA)
  - Edition names: "Edo Blue October", "Tokyo Deco Evenings", "Autumn Greens: Tokyo in October"
  - Showcase step labels: "Simple PDF", "Studio edition"

## Creative Direction
- Tone preset: `polished`
- Creative direction: a travel-magazine feature set in motion ("The Concierge's Notebook")
- Interpretation: calm confidence. Y-axis fades and slides, exponential ease-out, no bounce, soft crossfades. Energy comes from things settling into place. Every read holds long enough.
- Angle: from spreadsheet to keepsake. One real trip (Tokyo, Oct 3 to 5) goes from the organizer's cluttered spreadsheet to one clear day, a confirmation lands where it belongs, the group sees it in three views, and the plan ends up as an edition someone would keep.
- Hook: a cramped spreadsheet ("tokyo trip FINAL (2).xlsx") fills with half-finished plans while the site's own line lands in large serif: "Your journey deserves more than a spreadsheet."
- Outro / punchline: closing band (earth-500 + grain): "WanderLuxe", "Plan the trip together.", sunset button "Start planning, free", "wanderluxe.io".
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals (no blobs, particles, waveforms)
  - Unrelated visual redesign; the product's own palette and type only
  - Em dashes in on-screen copy (house voice)

## Visual Identity
- Background: Cream Paper `#FDFCF8`; closing band Earth-500 `#6B6354`; grain overlay (the app's `bg-grain` SVG noise, scaled up for video)
- Surfaces: Vellum Page `#FAF8F5` (cards), Sand-50 `#FAF9F7`, Raw Linen `#EEE7DA` (chips, spreadsheet headers), Tea-Stained `#EDDDC8` (highlights, warm light)
- Text: Espresso Ink `#211F1B`, Earth-600 `#5C544A` (headlines), Earth-500 `#6B6354` (secondary), Earth-100 `#E6E2DE` and Cream on the closing band, Destructive ink `#A93E32` for the spreadsheet's "??" marks
- Accent: Roasted Bronze `#603D2E` (Import button, active outline, cursor). Kiln Rust `#C2410C` → Fired Clay `#9A3412` gradient on the one conversion button only
- Borders: Stitched Edge `#DDD4C8` (2px at video scale); shadows are bronze `rgba(139,119,93,·)`
- Timeline category inks: slate `#535B6C` (transport), clay `#7E4D36`, sage `#476348` (activity), ocean `#366172`
- Display font: DM Serif Display 400 (+ italic), embedded from `src/assets/fonts/pdf/`
- Body font: DM Sans 400/500, embedded from `src/assets/fonts/pdf/`
- Visual references from the project: the landing AppShowcase phone fan (tilted cards, bronze shadows, one-word captions), the Print Studio showcase (numbered step labels, edition chips with a swatch dot), the timeline day card (time column, rail, category icons)
- Rules: no `#FFFFFF` surfaces, no `#000` text or shadows, no gradient text, no glassmorphism, no colored side stripes, no bounce

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. The spreadsheet — 4.2s (0.00–4.20) — cluttered Tokyo spreadsheet fills in; "Your journey deserves more than a spreadsheet." holds ≥2.4s
2. Paste a confirmation — 5.4s (4.20–9.60) — spreadsheet rows become day-card rows; Trip Assistant reads "ANA 175 confirmation.pdf"; click Import; the flight lands at 11:05 AM on Oct 3 (beat-locked 8.74s); caption "Paste a confirmation and it lands on the right day." holds ≥3s
3. Plan together — 3.5s (9.60–13.10) — three real phone captures fan in on the beat grid with labels; "Plan together, in real time."
4. Print Studio — 4.3s (13.10–17.40) — "Print Studio" / "The plan you made, set as something to keep"; the free PDF page, then the three editions swap in on the beat grid with an edition chip row showing the active one
5. Outro — 4.2s (17.40–21.60) — closing band; wordmark beat-locked 17.47s; "Plan the trip together."; "Start planning, free"; "wanderluxe.io"

## Audio
- Audio role: warm bed with sparse, motion-matched accents
- Audio arc: gentle intro under the spreadsheet; the full groove arrives as the flight lands; paper-soft accents on the edition swaps; one bell on the wordmark rings out while the bed fades
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`
- Music treatment: volume ≈0.30 from the start (short 0.4s fade-in), fade to 0 over 20.4–21.6s via a volume automation lane
- Music cue guidance: bundled preset `assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json` (109.96 BPM). Strong-cue locks: 8.74s (flight lands), 17.47s (wordmark), 13.11s (Print Studio entry). Beat-grid: phones at 9.83 / 10.93 / 12.02; edition swaps at 14.20 / 15.29 / 16.38 (every other beat, so text-bearing reveals stay readable)
- Audio-reactive treatment: subtle. Pre-extracted RMS/bass (hyperframes-creative `extract-audio-data.py`) drives the warm paper light and the glow behind the closing wordmark, baked into seekable keyframes. No visualizer graphics
- Audio-coupled moments:
  - Scene 1 — a few very quiet keypress ticks while cells fill
  - Scene 2 — soft drop on attach; click on Import; soft warm impact when the flight row lands (8.74s)
  - Scene 4 — paper slides on the first and last edition swap
  - Scene 5 — one warm bell on the wordmark, left to ring
- SFX selection guidance: match the visible gesture; warm and low-brightness files for anything repeated; nothing on plain crossfades
- SFX analysis guidance: `skills/brag/assets/sfx/sfx-analysis.md` / `.json` (chosen: `interface/drop_002`, `interface/click_003`, `impact/impactSoft_medium_001`, `casino/card-slide-1`, `impact/impactBell_heavy_000`, `keyboard/keypress-*`)
- Exact SFX choice: chosen against the implemented animation, volumes 0.25–0.6 (polished)
- Audio files: copied into `brag-output/composition/assets/`

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, and `hyperframes-cli`. /brag is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo / launch-video workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show real UI, copy, and visuals from the source project (above).
- Keep all text readable in the final render.
- Keep the video within 15-25 seconds.
- Include the planned music/SFX layer.
- Treat music cue metadata as optional timing hints; readability first.
- Major reveals may move toward nearby strong cues within ~0.15s; smaller entrances toward beats within ~0.10s; 1-3 strong locks.
- Subtle audio-reactive warmth only.
- Local assets for audio, fonts and images.
- Run `hyperframes check` before render — it is brag's single gate.
