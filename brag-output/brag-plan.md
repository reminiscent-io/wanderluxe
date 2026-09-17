# Brag Plan: WanderLuxe

## What is this app?
WanderLuxe is a free, collaborative trip planner: flights, hotels, dinners and days sit on one itinerary the whole group can see and edit, AI reads a pasted booking confirmation onto the right day, and the $3.99/mo Print Studio designs the finished plan as a printable keepsake.

## The angle
**From spreadsheet to keepsake.** The video follows one real trip (Tokyo, Oct 3 to 5, the fixture trip the landing page already uses) from the organizer's cluttered spreadsheet to a printed edition. It is shot like a travel-magazine feature: cream paper, bronze ink, serif headlines, generous air. It isn't a joke. The brag is the transformation itself, delivered calmly: a messy grid becomes one clear day, a confirmation lands where it belongs, the group sees it, and the plan ends up as an edition someone would keep. Every line on screen is the site's own copy.

## Hook (first 2-3 seconds)
A cramped spreadsheet fills in fast with half-finished Tokyo plans ("flight?? ANA 175", "hotel (conf # in email)", "Sushi Sho, who booked??"). Over it, in large DM Serif Display, the landing page's own hook line: **"Your journey deserves more than a spreadsheet."** Every group organizer has built that spreadsheet, so the line explains itself.

## Key moments (the middle)
- The spreadsheet cells lift off the grid and settle as the rows of one clean day card: "Landing, and a first walk".
- A booking confirmation dropped into the Trip Assistant comes back as a "Flight: ANA 175" card. One click on Import and the flight lands at 11:05 AM as the first row of Oct 3, pushing the evening down.
- Three real app screens (Timeline, Calendar, Map) rise in as a tilted fan, captioned "Plan together, in real time."
- The free PDF page sits on the table, then a Print Studio edition slides over it and flips through three AI-designed editions of the *same* trip: Edo Blue October, Tokyo Deco Evenings, Autumn Greens.

## Outro / punchline
The page turns to the site's closing band (earth-500, grain). "WanderLuxe" lands in cream serif, then "Plan the trip together." and the one sunset button, "Start planning, free". A beat of quiet, then out.

## User flow worth showing
1. **Entry:** attach a booking confirmation in the Trip Assistant ("ANA 175 confirmation.pdf").
2. **Key action:** the assistant reads it into an itinerary card: "Flight: ANA 175 · San Francisco (SFO) → Tokyo (HND) · Oct 3 · 11:05". Click **Import**.
3. **Result:** the flight appears at 11:05 AM on Saturday, October 3, the right day, on the itinerary the whole group shares. (Coda: the same plan in Timeline / Calendar / Map, then set as a Print Studio edition.)

## Tone
- Preset: `polished`
- Creative direction: a travel-magazine feature set in motion ("The Concierge's Notebook" from DESIGN.md)
- Interpretation: calm confidence. Motion stays on the y-axis with exponential ease-out and no bounce (the product's own motion rule), transitions are soft slides and crossfades, and each moment holds long enough to read. The energy comes from things settling into place, not from speed or loud type.

## Format: landscape — 1920x1080
## Duration: 21.6s

## Visual identity (from the project)
- Background: Cream Paper `#FDFCF8` (page) · Sand-50 `#FAF9F7` (hook band, with `bg-grain`) · Vellum Page `#FAF8F5` (cards) · Earth-500 `#6B6354` (closing band)
- Accent: Roasted Bronze `#603D2E` (primary buttons, active states). Kiln Rust `#C2410C` → Fired Clay `#9A3412` gradient for **one** conversion button only (the One Citrus Peel Rule)
- Text: Espresso Ink `#211F1B` (body) · Earth-600 `#5C544A` (landing headlines) · Earth-500 `#6B6354` (secondary) · Cream on the closing band
- Borders / hairlines: Stitched Edge `#DDD4C8`; shadows are bronze `rgba(139,119,93,·)`, never black
- Display font: DM Serif Display (400; fallback Georgia)
- Body font: DM Sans (400/500/600; fallback Arial / system-ui)
- Strongest visual element: the Print Studio sheet changing palette, typeface and motif while the itinerary stays put, plus the real phone captures of the Tokyo trip
- Rules to honor: no `#FFFFFF` surfaces, no `#000` text or shadows, no gradient text, no glassmorphism, no colored side stripes, no bounce

## Share copy (draft)
WanderLuxe puts flights, hotels, dinners and days on one itinerary your whole group can edit. Paste a confirmation and it lands on the right day. Free, with no limit on trips.

## Audio direction
- Role: warm bed with sparse, motion-matched accents
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` ("steady and clean", the polished pick)
- Music treatment: starts under the hook at a gentle level (~0.3); its lighter intro carries the spreadsheet, and the full groove (from ~8.7s) arrives as the flight lands. Fade out over the final ~1.2s under the wordmark hold.
- Music cue guidance: preset read (`assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.{md,json}`), 109.96 BPM, beat ≈ 0.545s.
  - Energy shape: beats before 8.74s are lighter with dips (1.09, 3.27, 7.64). From 8.74s the groove is full (intensity 0.9+). A dip at 16.38–16.93 resolves into a strong 17.47 hit, which is a natural phrase boundary.
  - Strong-cue locks (1-3): **8.74s** flight row lands on Oct 3 · **17.47s** wordmark lands · optional **13.11s** Print Studio scene entry.
  - Beat-grid windows: Scene 1 cell fill 0.56–1.09 (accents, not reads) · Scene 3 phones on 9.83 / 10.93 / 12.02 (every other beat) · Scene 4 edition swaps on 14.20 / 15.29 / 16.38 (every other beat).
  - Restraint: polished. Only the payoffs lock to the music; everything else keeps natural timing.
- Audio-reactive treatment: subtle. Music RMS/bass may warm the paper light or vignette and give the closing wordmark's soft bronze shadow a little presence. No waveforms, bars, notes, particles or pulsing type.
- SFX posture: sparse and quiet (about 5-6 cues at low volume), each tied to a visible action
- Audio-coupled moments: cell fill ticks (thin, not per character), file drop on attach, click on Import, soft landing when the flight row slots in, paper slides on the edition swaps, one soft bell/bong on the wordmark
- Restraint rule: no stacked hits, no bright or glassy repeats, nothing louder than the music at the payoffs, no whooshes on every transition

## Storyboard

### Scene 1 — The spreadsheet — 4.2s (0.00–4.20)
Sand-50 paper with grain. A cramped spreadsheet (column letters A–D, row numbers, Stitched Edge gridlines, one active-cell outline hopping around) fills in with the Tokyo trip, typed in a hurry:
"flight?? ANA 175" · "SFO to HND 11:05" · "hotel (conf # in email)" · "Ryumeikan, Kanda" · "Sushi Sho, who booked??" · "teamLab 10am, barefoot". The cells read as clutter; they are not the read.
Then, over a cream panel, the hook line in large DM Serif Display, Earth-600: **"Your journey deserves more than a spreadsheet."** (verbatim, landing HookSection). Enters by ~1.1s, settled ≥2.4s before the transition.
Sequential/interaction: yes. Cells fill fast, row by row, with the active-cell outline jumping as if someone is typing. These are texture, so fast is fine; the headline holds.
Audio intent: a quiet, slightly busy start that sounds like typing.
Audio-coupled idea: a few thin key ticks during the fill (not per character).
Music: vol-12 intro, gentle.
Transition mood: soft. The cells lift off the grid and slide into place as the rows of the day card (a morph, not a cut) → Scene 2.

### Scene 2 — Paste a confirmation — 5.4s (4.20–9.60)
Left: the **Trip Assistant** panel (recreated from `AIAssistantPanel`: serif "Trip Assistant", subline "Private to you, not shared with co-travelers", cream bubbles). A file chip **"ANA 175 confirmation.pdf"** drops in as the user's message. The assistant replies with the real extraction card: plane icon, **"Flight: ANA 175"**, "San Francisco (SFO) → Tokyo (HND) • Oct 3 • 11:05", and a bronze **Import** button. A cursor clicks Import; it flips to "Imported" with a check.
Right: the day card in timeline style: "Saturday · October 3" / **"Landing, and a first walk"**, rows "6:00 PM · Check-in: Hotel Ryumeikan Ochanomizu" and "7:30 PM · Walk the Kanda river to Akihabara". After the click, the flight card travels across and lands as the first row, **"11:05 AM · Flight: ANA 175"**, pushing the evening down.
Caption (serif): **"Paste a confirmation and it lands on the right day."** (verbatim, landing hero lede), settled ≥3s.
Sequential/interaction: yes. Attach, then extraction card, then simulated click on Import, then the card flies to the correct day and slots in.
Audio intent: the small "oh, nice" moment: crisp and satisfying.
Audio-coupled idea: drop on attach; soft click on Import; soft landing as the row slots in (beat-locked 8.74s).
Transition mood: clean slide → Scene 3.

### Scene 3 — Plan together — 3.5s (9.60–13.10)
The day card recedes. Three **real app captures** (`public/images/app-timeline.jpg`, `app-calendar.jpg`, `app-map.jpg`) rise in one by one as tilted phone cards (the landing AppShowcase fan, a few degrees each way), each with a one-word label: "Timeline", "Calendar", "Map".
Headline (verbatim, landing ValueProps): **"Plan together, in real time."** settled ≥1.5s (in practice ~3s).
Optional: a small cluster of three traveler avatars with a live dot beside the headline (presence). No names.
Sequential/interaction: yes. Phones arrive on every other beat (~1.1s apart); labels hold to scene end (the last label ≥0.9s).
Audio intent: light and rhythmic, like cards being laid on a table.
Audio-coupled idea: a soft card/paper slide on the first and last phone.
Transition mood: soft crossfade → Scene 4.

### Scene 4 — Print Studio — 4.3s (13.10–17.40)
Eyebrow **"Print Studio"** + serif headline **"The plan you made, set as something to keep"** (verbatim, landing PrintStudioShowcase), settled ≥2.7s.
The free simple PDF page (`public/images/print-showcase-simple-pdf.png`) lies on the table. A Studio edition sheet slides over it, then swaps through the **three committed AI editions of the same Tokyo trip**, rendered by the real `PrintDocument` from `tokyoEditions.json`: **Edo Blue October → Tokyo Deco Evenings → Autumn Greens**. Each swap shows a chip with the edition's swatch dot and name, as the real showcase does, held ≥0.9s.
Sequential/interaction: yes. Three edition swaps on every other beat; the chip labels are short.
Audio intent: tactile, like paper sliding over paper.
Audio-coupled idea: paper/card slide on each swap, quiet.
Transition mood: soft. The last edition lifts slightly and the scene dissolves into the closing band → Scene 5.

### Scene 5 — Outro — 4.2s (17.40–21.60)
The site's FinalCTA band: Earth-500 with grain. **"WanderLuxe"** wordmark in cream DM Serif Display lands (beat-locked 17.47s). Then **"Plan the trip together."** (verbatim H1) and the single sunset button **"Start planning, free"** (verbatim CTA), with a small "wanderluxe.io".
Sequential/interaction: wordmark first, then line, then button (natural timing, each held ≥2s).
Audio intent: warm resolution; the music fades under the hold.
Audio-coupled idea: one soft bell/bong on the wordmark, left to ring.
Music: fade out over the last ~1.2s.

**Music mood for this video:** steady, warm, quietly upbeat (polished)
**Audio summary:** a gentle intro under the spreadsheet opens into a full, steady groove as the flight lands, paper-soft accents carry the views and editions, and a single bell on the wordmark rings out as the bed fades.

## Inspection rubric (Step 1)
1. **App:** a free collaborative itinerary builder with AI import and a paid designed-keepsake export (Print Studio).
2. **Strongest claim:** "Paste a confirmation and it lands on the right day." Runner-up: one itinerary, three AI-designed editions.
3. **Visual hook:** the warm editorial system (cream, espresso, bronze, DM Serif Display) and the edition sheet re-dressing itself while the plan stays the same.
4. **UI to show:** Trip Assistant extraction card + Import, the day card, real Timeline/Calendar/Map phone captures, the free PDF page, the three real editions.
5. **Shortest satisfying video:** ~21-22s (hook, flow, group glance, edition payoff, name).
6. **Tone:** `polished`; "a travel-magazine feature set in motion".
7. **Audio:** warm steady bed (vol-12), groove arrives on the payoff, sparse quiet SFX, one bell on the wordmark, subtle audio-reactive warmth.
8. **Share caption:** see Share copy above.
9. **User flow:** attach confirmation → card extracted → Import → lands on Oct 3 at 11:05 on the shared itinerary.

## Source material
- Copy: `src/components/Hero.tsx`, `src/components/landing/sections/{HookSection,ValueProps,PrintStudioShowcase,FinalCTA}.tsx`
- Flow: `src/components/trip/ai-assistant/{AIAssistantPanel,ExtractedItemCard,ExtractionResultMessage}.tsx`
- Trip data: `src/components/landing/print-showcase/{tokyoRows.ts,tokyoTrip.json,tokyoEditions.json}`
- Renderer: `src/components/trip/print-studio/PrintDocument.tsx` + `printDocument.css`
- Real captures: `public/images/app-{timeline,calendar,map,trip}.jpg`, `public/images/print-showcase-simple-pdf.png`
- Design system: `DESIGN.md`, `PRODUCT.md`, `tailwind.config.ts`, `src/index.css`
