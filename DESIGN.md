---
name: WanderLuxe
description: Warm editorial design system for AI-powered group travel planning
colors:
  cream-paper: "#FDFCF8"
  vellum-page: "#FAF8F5"
  raw-linen: "#EEE7DA"
  aged-paper: "#EDE8DD"
  tea-stained: "#EDDDC8"
  stitched-edge: "#DDD4C8"
  espresso-ink: "#211F1B"
  smoked-walnut: "#5C544A"
  wet-sand: "#8A7F6C"
  roasted-bronze: "#603D2E"
  citrus-peel: "#F97316"
  burnt-orange: "#EA580C"
  chili-red: "#EC4032"
typography:
  display:
    fontFamily: "DM Serif Display, Georgia, serif"
    fontSize: "clamp(1.875rem, 5vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "DM Serif Display, Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  title:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "normal"
  label:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  card: "0.75rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.roasted-bronze}"
    textColor: "{colors.cream-paper}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
    height: "2.5rem"
    typography: "{typography.label}"
  button-sunset:
    backgroundColor: "{colors.citrus-peel}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
    height: "2.5rem"
    typography: "{typography.label}"
  button-secondary:
    backgroundColor: "{colors.raw-linen}"
    textColor: "{colors.espresso-ink}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
    height: "2.5rem"
    typography: "{typography.label}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.espresso-ink}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
    height: "2.5rem"
    typography: "{typography.label}"
  button-outline:
    backgroundColor: "{colors.cream-paper}"
    textColor: "{colors.espresso-ink}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
    height: "2.5rem"
    typography: "{typography.label}"
  card:
    backgroundColor: "{colors.vellum-page}"
    textColor: "{colors.espresso-ink}"
    rounded: "{rounded.card}"
    padding: "1.5rem"
  input:
    backgroundColor: "{colors.cream-paper}"
    textColor: "{colors.espresso-ink}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 0.75rem"
    height: "2.5rem"
    typography: "{typography.body}"
  dialog:
    backgroundColor: "{colors.cream-paper}"
    textColor: "{colors.espresso-ink}"
    rounded: "{rounded.md}"
    padding: "1.5rem"
---

# Design System: WanderLuxe

## 1. Overview

**Creative North Star: "The Concierge's Notebook"**

WanderLuxe is what you'd find on the desk of someone who has planned this
trip a hundred times before — a leather-cornered notebook full of
penciled-in restaurants, train times, the name of the right hotel
manager. Warm cream paper, espresso ink, the patina of intentional use.
The system inherits that confidence: every surface looks considered,
nothing looks templated, and the warmth is the credential.

The aesthetic descends directly from 1980s–90s editorial travel
magazines — Condé Nast Traveler, Cereal, Kinfolk — translated into a
working software product. DM Serif Display carries the headlines; DM
Sans does the legible work. Photography is treated generously, never
cropped into thumbnails. Color is restrained: tinted neutrals everywhere
and a single warm bronze accent doing 90% of the chromatic work, with
the citrus-peel sunset orange held in reserve for the moments that
matter (primary CTAs, conversion edges).

This system **explicitly rejects**: the transactional banner-clutter
of Booking.com / Expedia / Kayak / TripAdvisor; the cold-blue,
identical-card-grid lifelessness of generic SaaS dashboards; and every
shade of loud "luxury" cliché — gold-on-black, marble textures,
"Premium" badges, champagne emojis. Real luxury whispers.

**Key Characteristics:**
- Cream paper, never white. Bronze ink, never black.
- Editorial type hierarchy carries the design — serif headlines do the heavy lifting.
- Shadows are bronze-tinted, not gray. Black drop-shadows are forbidden.
- Flat-by-default surfaces; lift only on interaction.
- Photography is generous and warmed (`saturate(1.05) contrast(1.02) brightness(1.01)`).
- Generous whitespace; the air is part of the brand.
- Restrained motion — y-axis fades and slides only, exponential ease-out, no bounce.

## 2. Colors: The Warm Travel Notebook Palette

A hand-sorted set of warm earth tones in OKLCH-adjacent HSL, all keyed off
hue 25–40°. There are no cool grays in this system. Every neutral has at
least 10–18% warm chroma; every shadow is tinted bronze. The whole palette
behaves like paper aged in soft afternoon light.

### Primary
- **Roasted Bronze** (`#603D2E`, `hsl(25 35% 28%)`): The voice of the
  brand. Used on primary buttons, headings on neutral backgrounds,
  active sidebar items, the iOS theme-color meta. This is the bronze
  ink in the concierge's pen — confident, warm, never harsh. If a
  surface needs to feel authored, it's painted with this.

### Secondary
- **Citrus Peel** (`#F97316`, sunset-500) → **Burnt Orange** (`#EA580C`,
  sunset-600): The conversion accent. Lives on a `from-sunset-500
  to-sunset-600` gradient and only appears on the **highest-stakes
  CTA on a screen** (Sign Up, Create Trip, primary submit). Not on
  secondary actions, not on hover states for non-CTAs, not as decoration.
  The rarity is the point.

### Tertiary
- **Tea-Stained** (`#EDDCC8`, `hsl(28 40% 90%)`): The warm highlight.
  Hover backgrounds for ghost buttons, selected list items, soft chips,
  active calendar dates. Pairs with Espresso Ink for legible
  micro-interactions.

### Neutral
- **Cream Paper** (`#FDFCF8`, `hsl(40 33% 99%)`): The page itself.
  Background of every surface, base color of inputs and outline buttons.
  Never replaced by `#FFFFFF`.
- **Vellum Page** (`#FAF8F5`, `hsl(36 33% 97%)`): Card background —
  one warm step warmer than the page. The lift is tonal, not
  shadow-driven.
- **Raw Linen** (`#EEE7DA`, `hsl(33 25% 93%)`): Secondary buttons,
  unselected chips, sidebar hover states. The fabric tone.
- **Aged Paper** (`#EDE8DD`, `hsl(33 15% 93%)`): Muted surfaces —
  disabled states, subtle dividers between content blocks.
- **Stitched Edge** (`#DDD4C8`, `hsl(30 18% 87%)`): Borders. Always
  this; never a cool gray.
- **Wet Sand** (`#8A7F6C`, sand-500): Mid-neutrals — calendar
  selection, secondary text on warm backgrounds, divider hairlines on
  dark surfaces.
- **Smoked Walnut** (`#5C544A`, earth-600): The deep-neutral text tone
  for muted-foreground content.
- **Espresso Ink** (`#211F1B`, `hsl(30 10% 12%)`): Primary text. Warm
  near-black with a residual brown cast — never `#000`.

### Status (used sparingly)
- **Chili Red** (`#EC4032`, `hsl(4 80% 58%)`): Destructive actions and
  errors only. Warm-shifted to belong to the family.

### Named Rules

**The Cream Paper Rule.** `#FFFFFF` is forbidden as a surface color.
Every "white" in this system is Cream Paper or Vellum Page. If a design
sample reads as bright-white on screen, it's wrong — re-tint it.

**The Bronze Ink Rule.** `#000000` is forbidden as a text or shadow
color. Body text is Espresso Ink. Shadows are `rgba(139, 119, 93, ·)`.
Black on cream looks photocopied; bronze on cream looks letterpressed.

**The One Citrus Peel Rule.** Sunset orange appears on **at most one
element per screen**, and only on the highest-stakes CTA. Two sunset
buttons on the same screen is a bug. Three is a marketing email.

## 3. Typography

**Display Font:** DM Serif Display (with Georgia, serif fallback)
**Body Font:** DM Sans (with system-ui, sans-serif fallback)
**Mono Font:** ui-monospace, SFMono-Regular, Menlo, Consolas

**Character:** A high-contrast magazine pairing. DM Serif Display is the
editorial voice — slim, slightly literary, with confident terminals; it
sets headlines like a feature article, not a marketing banner. DM Sans
does the working life — body, labels, dense UI — at a generous 1.75
line-height that gives every block of copy the airiness of a
well-typeset page.

### Hierarchy
- **Display** (DM Serif Display, 400, `clamp(1.875rem, 5vw, 3rem)`,
  line-height 1.1, tracking -0.02em): Hero headlines, marketing surface
  H1s, the trip name on the trip-detail hero.
- **Headline** (DM Serif Display, 400, 1.875rem / 30px, line-height
  1.15): Section headings inside the app — page titles, dialog titles
  when feature-significant.
- **Title** (DM Sans, 600, 1.25rem / 20px, line-height 1.25): H4s and
  card titles — the workhorse heading for dense UI surfaces.
- **Body** (DM Sans, 400, 1rem / 16px, line-height 1.75): Paragraph
  text. Cap line length at **65–75ch**. The 1.75 line-height is
  load-bearing — do not tighten it.
- **Label** (DM Sans, 500, 0.875rem / 14px, line-height 1.4):
  Buttons, form labels, metadata, timeline timestamps.

### Named Rules

**The Serif-Earns-Its-Place Rule.** DM Serif Display is reserved for
H1–H3 and trip names. Do not set buttons, labels, body copy, or UI
chrome in serif. The serif's job is to anchor narrative — its dilution
costs more than its decoration adds.

**The No-Gradient-Text Rule.** `background-clip: text` on a gradient is
forbidden. Emphasis comes from weight, size, or color — never from
chromatic noise on letterforms.

## 4. Elevation

WanderLuxe is **flat by default**. Surfaces sit at the same plane as
the page until interaction or focus invites them to lift. Hierarchy is
carried by tonal contrast — Cream Paper (page) → Vellum Page (card) →
Raw Linen (secondary chips) — not by stacked shadows. When shadows do
appear, they are **bronze**, not black: every drop-shadow uses
`rgba(139, 119, 93, ·)`, the warm rgba that gives surfaces the
appearance of paper resting on warm wood instead of plastic on glass.

### Shadow Vocabulary
- **`shadow-warm-sm`** (`0 1px 3px 0 rgba(139,119,93,0.08), 0 1px 2px -1px rgba(139,119,93,0.08)`):
  The default ambient texture for resting cards and surface boundaries.
  The lightest possible lift — present, but felt rather than seen.
- **`shadow-warm`** (`0 4px 12px -2px rgba(139,119,93,0.10), 0 2px 6px -2px rgba(139,119,93,0.06)`):
  Hover state for cards, raised dropdowns, popovers. The "I'm
  interactive" signal.
- **`shadow-warm-lg`** (`0 10px 30px -4px rgba(139,119,93,0.12), 0 4px 12px -4px rgba(139,119,93,0.06)`):
  Dialogs and modals. The plate-on-table feel.
- **`shadow-warm-xl`** (`0 20px 50px -8px rgba(139,119,93,0.15), 0 8px 20px -6px rgba(139,119,93,0.08)`):
  Sheets, command palettes, anything that wants to feel like it
  detached from the page.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear
only as a response to state — hover, elevation, focus, modality. A
shadow on an idle surface is decoration, and decoration is forbidden.

**The Bronze-Shadow Rule.** Black drop-shadows (`rgba(0,0,0,·)`) are
forbidden. Every shadow in this system is built from
`rgba(139, 119, 93, ·)`. If you write `shadow-md` from base Tailwind,
it's a bug — use `shadow-warm` / `shadow-warm-sm` / etc.

**The Tonal-Layering Rule.** When in doubt, raise the surface by one
tone instead of adding a shadow. Cream Paper → Vellum Page → Raw Linen
is a depth axis. Use it before reaching for elevation.

## 5. Components

Every component should feel **warm, generous, confident** — paper-like
surfaces, restrained motion, the quiet authority of a tool that knows
what it's for. Buttons are not eager; cards do not shout; inputs do not
hum. The interface is a notebook, not a dashboard.

### Buttons
- **Shape:** Gently rounded (6px radius via `rounded-md`). Pill shapes
  are forbidden; sharp 0px corners are forbidden.
- **Heights:** `sm` (36px / `h-9`), `default` (40px / `h-10`), `lg`
  (44px / `h-11`), `icon` (40×40px square).
- **Primary** (`variant="default"`): Roasted Bronze background, Cream
  Paper text, `shadow-warm-sm` at rest. Hover drops to 90% opacity —
  the bronze deepens slightly. The default-default for any "do the
  thing" affordance that isn't conversion-critical.
- **Sunset** (`variant="sunset"`): The conversion-only variant. A
  Citrus Peel → Burnt Orange linear gradient (left to right), white
  text, `shadow-warm-sm`. Hover deepens to `from-sunset-600
  to-sunset-700`. **One per screen, max.** This is the only component
  in the system permitted to use a gradient.
- **Secondary** (`variant="secondary"`): Raw Linen background,
  Espresso Ink text, no shadow. The "and also this" affordance.
- **Outline** (`variant="outline"`): Cream Paper background, Stitched
  Edge border, Espresso Ink text. Hover swaps to Tea-Stained
  background. Used when a primary already exists nearby.
- **Ghost** (`variant="ghost"`): Transparent at rest, Tea-Stained on
  hover. Inline actions in dense UI — table row controls, menu items,
  toolbar buttons.
- **Focus:** 2px Roasted Bronze ring with 2px offset against the
  background. Always visible; never `outline: none` without a
  replacement.

### Cards / Containers
- **Corner Style:** `rounded-card` (12px / `0.75rem`). This is one
  notch larger than the button radius, deliberately — cards are content
  containers and want a softer geometry.
- **Background:** Vellum Page (`#FAF8F5`) — one tonal step above the
  Cream Paper page.
- **Border:** 1px Stitched Edge (`#DDD4C8`). Always present.
- **Shadow Strategy:** `shadow-warm-sm` at rest is the default ambient
  texture. On hover (only if the card is interactive), step up to
  `shadow-warm`.
- **Internal Padding:** `p-6` (24px) for header/content/footer regions.
  Don't tighten this — the air is part of the brand.
- **Nested cards are forbidden.** A card inside a card is always a
  refactor. Use tonal contrast (Raw Linen on Vellum) or a divider
  instead.

### Inputs / Fields
- **Style:** 40px height, Cream Paper background, 1px Stitched Edge
  border, 6px radius, body typography. Placeholder text in
  Smoked Walnut.
- **Focus:** 2px Roasted Bronze ring with 2px offset. The border itself
  doesn't shift hue — the ring carries the focus signal.
- **Disabled:** 50% opacity, `cursor-not-allowed`. Don't grey out into
  cool tones — the warm cast must persist.
- **Error:** 2px Chili Red ring, error message in Chili Red sized as
  Label. Don't paint the input background red.

### Dialogs / Modals
- **Shape:** `rounded-lg` (8px) on `sm` and up. Mobile: edge-to-edge,
  `95vw` wide, no rounding (the dialog *is* the screen).
- **Background:** Cream Paper. Border: 1px Stitched Edge.
- **Shadow:** `shadow-warm-lg`. The plate-on-table elevation.
- **Overlay:** `bg-black/80` over the page. The only place full black
  appears in the system; it earns its place by being the absence of
  page rather than a surface itself.
- **Animation:** Fade + 95% zoom-in + slide-from-top, 200ms ease-out.
  Never bounce, never swing.

### Navigation
- **Sidebar (desktop):** Sidebar Background (`hsl(36 30% 97%)`), 1px
  Stitched Edge right border, fixed. Active item: Roasted Bronze
  background, Cream Paper text, the same 6px button radius.
- **Top nav (mobile):** Cream Paper background, sticky, `safe-pt`
  applied for iOS notch / Dynamic Island. Single-line, label-driven,
  no hamburger sandwich on home unless the route demands it.
- **Mobile drawer:** Slide-in from the side with the same Sidebar
  Background panel; overlay matches dialog overlay.

### Calendar (date-picker)
- **Selected day:** Wet Sand background, Cream Paper text.
- **Range middle:** Stitched Edge background, Smoked Walnut text.
- **Hover (unselected):** Aged Paper background.
- **The default react-day-picker blue is forbidden.** The system
  overrides it via `.rdp-day_selected` rules in `index.css`.

### Named Rules

**The No-Side-Stripe Rule.** Colored left- or right-borders greater
than 1px on cards, list items, callouts, or alerts are forbidden.
Hierarchy comes from full borders, tonal backgrounds, leading icons,
or numeric prefixes — never a colored vertical bar.

**The No-Glassmorphism Rule.** `backdrop-blur` and translucent glass
panels are not part of this system. The single permitted exception is
the dialog overlay (`bg-black/80`), and that's because it's an
absence, not a surface. Anywhere else, glass is forbidden.

## 6. Responsive & Mobile Patterns

The product is used in two contexts: focused planning sessions at a
desk and quick on-the-go phone edits in transit. The system treats
mobile not as a scaled-down desktop but as the primary surface for many
of its interactions. These patterns codify the reusable decisions.

### Breakpoints

Tailwind defaults — `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`.
The `container` utility tops out at `1400px` (set in `tailwind.config.ts`),
so even at 4K viewports the editorial composition is preserved and never
stretches to a billboard.

### Touch Targets

- **Mobile (under `sm`): 44×44 px minimum** on any interactive element.
  This is the floor — buttons, chips, icon controls, dismiss buttons,
  list-row taps. Below 44, the interaction is broken on a phone in
  transit, even if it works in DevTools.
- **Desktop (`sm` and up):** density can tighten to 36 px (`h-9`) where
  surrounding affordances justify it. Use the responsive pattern
  `h-11 sm:h-9` / `min-h-[44px] sm:min-h-0` rather than picking one
  height globally.
- **Spacing between adjacent targets:** at least 8 px so the wrong one
  doesn't get hit on a thumb tap.

### Mobile Chip Rails

For filter rows, tabs, and any short list of inline choices:

- **Under `sm`:** horizontally scrollable rail, full-bleed (`-mx-4`),
  hidden scrollbar, `scroll-snap-type: x proximity`, with edge fades
  on both sides so the user knows there's more off-screen.
- **`sm` and up:** the row wraps. No scroll needed when the container
  is wide enough.
- **Chips themselves:** `[scroll-snap-align: start]`, `shrink-0` so they
  don't get crushed into the rail. The native iOS scroll feel is the
  expected pattern; resist the urge to invent a custom carousel.

### Responsive Grid Scale

For card grids (trip cards, accommodation cards, anything similar):

- **Default:** `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4`
- **Dense-vertical variants** (current / hero-adjacent rows where each
  card is taller and more important): drop to `grid-cols-1 lg:grid-cols-2`.
- **Gap:** `gap-6` throughout. The air is part of the brand; don't
  tighten this for density.

### iOS / PWA Safe Areas

The app is installable. Phones with home indicators and notches need
their inset respected:

- Page containers that own the bottom of the viewport get `safe-pb`.
- Sticky bottom bars (if introduced later) get `safe-pb` *in addition
  to* their own padding, not instead of.
- Top navigation already handles `env(safe-area-inset-top)` — don't
  re-add it on page wrappers.

### Photography-Backed Surfaces

When chrome sits on top of imagery (hero cards, photo overlays):

- **Tonal contrast over translucency.** Opaque chips on photography
  read in bright outdoor light; glass chips don't. Use
  `bg-background/95` (cream paper) for light chips with foreground
  text, or `bg-foreground/75` (espresso ink) for dark chips with
  white text — both carry `shadow-warm` / `shadow-warm-sm`.
- **Photo gradient overlays** stay as gradient-to-foreground (warm
  near-black) at 60–80% bottom, fading to transparent. Pure black at
  100% is acceptable here only because it reads as absence-of-page,
  same logic as the dialog overlay.
- **CTA buttons on photography:** `bg-background` (cream) with
  `text-foreground`, never `bg-white`. The warm cast must survive on
  top of a colored image.

### Motion Caveats

- Framer Motion respects `prefers-reduced-motion` by default for
  opacity/transform on `motion.*` elements; don't fight it.
- Don't animate layout properties (`width`, `height`, `top`, `padding`,
  `margin`) — animate `transform` and `opacity` only. This rule applies
  doubly on mobile, where the GPU is doing more for less.

## 7. Do's and Don'ts

### Do:
- **Do** use Cream Paper (`#FDFCF8`) for every page background and
  Vellum Page (`#FAF8F5`) for every card. Tonal layering carries depth.
- **Do** use Roasted Bronze (`#603D2E`) as the dominant action color.
  Sunset orange is the *exception*, not the rule.
- **Do** set every drop-shadow with `rgba(139, 119, 93, ·)` via the
  `shadow-warm-*` family. Black drop-shadows break the warmth contract.
- **Do** lead with DM Serif Display for H1–H3 and trip names. Sans-serif
  H1s are forbidden in editorial surfaces.
- **Do** cap body line length at 65–75ch.
- **Do** keep `prefers-reduced-motion` honored — fades and slides
  shorten or disable, never become bouncy substitutes.
- **Do** treat photography generously. Use `img-warm`
  (`saturate(1.05) contrast(1.02) brightness(1.01)`) on destination
  images so they sit in the palette.
- **Do** reach for tonal contrast (Cream Paper → Vellum Page → Raw
  Linen) before reaching for a shadow.

### Don't:
- **Don't** use `#FFFFFF` or `#000000` anywhere. Cream Paper and
  Espresso Ink replace them. The Bronze Ink Rule and Cream Paper Rule
  are absolute.
- **Don't** use cool gray (`gray-*`, `slate-*`, `zinc-*` from base
  Tailwind) for borders, text, or backgrounds. Every neutral in this
  system is warm.
- **Don't** ship more than one Sunset gradient button per screen. The
  One Citrus Peel Rule is enforced.
- **Don't** apply `background-clip: text` on a gradient. Gradient text
  is forbidden everywhere.
- **Don't** use `border-left` or `border-right` greater than 1px as a
  colored accent stripe on cards, alerts, list items, or callouts. The
  No-Side-Stripe Rule is absolute.
- **Don't** add a `shadow-*` from base Tailwind. Replace with
  `shadow-warm` / `shadow-warm-sm` / `shadow-warm-lg` / `shadow-warm-xl`.
  Black drop-shadows break the system.
- **Don't** stack identical icon-plus-heading card grids — the generic
  SaaS hero-features template is explicitly anti-referenced. Vary card
  shapes, anchor with photography, break the grid.
- **Don't** ship a hero-metric template (huge number, small label,
  supporting stats, accent gradient). It's the SaaS dashboard cliché
  PRODUCT.md explicitly rejects.
- **Don't** use marble, gold-on-black, "Premium" badges, champagne
  emojis, or any "luxe" tropes. Real luxury whispers — the warm
  palette and editorial type *are* the luxury signal.
- **Don't** wrap modals around things that could happen inline. The
  group organizer is editing fast on a phone in transit; a modal is a
  tax. Sheets, popovers, and inline edits beat modals as a default.
- **Don't** use glassmorphism (backdrop-blur translucent panels) as
  decoration. The dialog overlay is the only permitted blur-adjacent
  effect.
- **Don't** transition `width`, `height`, `top`, `left`, `margin`, or
  `padding`. Animate `transform` and `opacity` only.
- **Don't** nest cards inside cards. Use tonal layering or a divider.
