# WanderLuxe Visual Reskin — Claude Code Execution Prompt

## Context

I'm reskinning WanderLuxe from its current "modern SaaS" aesthetic to a warmer, editorial travel-inspired design influenced by 1980s–1990s airline marketing: confident typography, sunset-warm palettes, rich depth, and aspirational travel energy — while keeping the UI fully modern and functional.

This is a **surface-layer reskin only**. No changes to routing, data flow, state management, business logic, or component structure. We're changing how things look, not how they work.

**Tech stack:** Vite 6, React 19, TypeScript, Tailwind CSS 3.4, shadcn/ui + Radix, Framer Motion 12, Supabase. Client-side only (no SSR).

---

## Phase 1: Design Tokens & Typography Foundation

### 1A. Install and configure fonts

Add **two Google Fonts** to `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap" rel="stylesheet">
```

**Font rationale:**
- **DM Serif Display** — warm, editorial serif for headings. Evokes the confident luxury of '80s airline advertising without being kitschy. Has italic for emphasis moments.
- **DM Sans** — geometric sans that pairs perfectly. Clean and modern for body text, UI elements, and data. Replaces the system font stack.

Update `tailwind.config.ts` → `theme.extend`:

```ts
fontFamily: {
  display: ['"DM Serif Display"', 'Georgia', 'serif'],
  sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
},
```

### 1B. Update the color palette

**Replace the CSS variables in `src/index.css` `:root`** with this warmer palette. Keep the existing `sand-*` and `earth-*` Tailwind tokens — they already work. The problem is the semantic colors are default shadcn/ui slate, which feels cold and generic.

```css
:root {
  /* Warm white backgrounds */
  --background: 40 33% 99%;          /* #FDFCFA — warm cream instead of pure white */
  --foreground: 30 10% 12%;          /* #221F1B — warm near-black instead of blue-black */

  /* Cards: slightly warmer than background */
  --card: 36 33% 97%;                /* #FAF8F4 */
  --card-foreground: 30 10% 12%;     /* #221F1B */

  /* Popovers */
  --popover: 40 33% 99%;             /* matches background */
  --popover-foreground: 30 10% 12%;

  /* Primary: deep warm bronze (replaces the muddy olive #5D5545) */
  --primary: 25 35% 28%;             /* #603D2E — rich bronze, feels like leather and mahogany */
  --primary-foreground: 40 33% 97%;  /* warm white */

  /* Secondary: warm sand instead of cold slate */
  --secondary: 33 25% 93%;           /* #F2EDE5 — light sand */
  --secondary-foreground: 30 15% 18%;/* #2B2520 */

  /* Muted: warm gray instead of slate */
  --muted: 33 15% 93%;               /* #F0ECE6 */
  --muted-foreground: 25 8% 45%;     /* #7A7068 — warm gray text */

  /* Accent: a subtle warm highlight */
  --accent: 28 40% 90%;              /* #F2E4D4 — light peach/sand */
  --accent-foreground: 25 35% 22%;   /* dark bronze */

  /* Destructive: keep red but warm it slightly */
  --destructive: 4 80% 58%;          /* #E04838 — warmer red */
  --destructive-foreground: 40 33% 97%;

  /* Borders: warm instead of blue-gray */
  --border: 30 18% 87%;              /* #E2DBD1 — warm border */
  --input: 30 18% 87%;
  --ring: 25 35% 28%;                /* matches primary */

  --radius: 0.5rem;
}
```

**Also update the sidebar variables** to use the warm palette:

```css
  --sidebar-background: 36 30% 97%;
  --sidebar-foreground: 30 10% 18%;
  --sidebar-primary: 25 35% 28%;
  --sidebar-primary-foreground: 40 33% 97%;
  --sidebar-accent: 33 25% 93%;
  --sidebar-accent-foreground: 30 15% 18%;
  --sidebar-border: 30 18% 90%;
  --sidebar-ring: 25 35% 28%;
```

### 1C. Add new design tokens to `tailwind.config.ts`

Add these to `theme.extend`:

```ts
borderRadius: {
  'card': '0.75rem',    /* 12px — slightly more generous than default */
},
boxShadow: {
  'warm-sm': '0 1px 3px 0 rgba(139, 119, 93, 0.08), 0 1px 2px -1px rgba(139, 119, 93, 0.08)',
  'warm': '0 4px 12px -2px rgba(139, 119, 93, 0.1), 0 2px 6px -2px rgba(139, 119, 93, 0.06)',
  'warm-lg': '0 10px 30px -4px rgba(139, 119, 93, 0.12), 0 4px 12px -4px rgba(139, 119, 93, 0.06)',
  'warm-xl': '0 20px 50px -8px rgba(139, 119, 93, 0.15), 0 8px 20px -6px rgba(139, 119, 93, 0.08)',
},
colors: {
  /* Add a sunset accent palette for CTAs and highlights */
  sunset: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: '#EA580C',
  },
  /* Deep navy for contrast moments */
  navy: {
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
},
```

### 1D. Update base typography in `src/index.css`

Replace the existing `h1`–`h4` and `p` styles in the `@layer base` section:

```css
@layer base {
  body {
    @apply font-sans antialiased;
  }

  h1 {
    @apply font-display text-4xl lg:text-5xl font-normal tracking-tight;
    /* DM Serif Display is already bold-feeling at normal weight */
  }

  h2 {
    @apply font-display text-3xl font-normal tracking-tight;
  }

  h3 {
    @apply font-display text-2xl font-normal tracking-tight;
  }

  h4 {
    @apply font-sans text-xl font-semibold tracking-tight;
    /* h4 and below use the sans-serif for UI hierarchy */
  }

  p {
    @apply leading-7;
  }
}
```

### Phase 1 deliverable
After making all Phase 1 changes, provide a status report listing every file modified and confirming that the app compiles and renders without errors. Do NOT proceed to Phase 2 yet.

---

## Phase 2: Component-Level Reskin

### 2A. Navigation (`src/components/layout/Navigation.tsx` and sub-components)

Update the header styling:
- Change `bg-white/95` to `bg-[hsl(var(--background))]/95` so it uses the warm cream
- Change `border-sand-200` to `border-[hsl(var(--border))]`
- Navigation links: ensure text uses `font-sans` (it should inherit, but verify)
- The frosted glass effect (`backdrop-blur-sm`) should stay — it works well

### 2B. Cards — global update

In `src/components/ui/card.tsx`:
- Update the base Card class from `rounded-lg border bg-card text-card-foreground shadow-sm` to `rounded-card border bg-card text-card-foreground shadow-warm-sm`

Then do a **project-wide search** for card-like patterns that are styled inline and update them:
- Replace `shadow-sm` → `shadow-warm-sm` on card-like containers
- Replace `shadow-lg` → `shadow-warm-lg`
- Replace `shadow-xl` → `shadow-warm-xl`
- Replace `shadow-2xl` → `shadow-warm-xl` (consolidate)
- Leave `drop-shadow-*` on text elements unchanged

### 2C. Buttons — update the base component

In `src/components/ui/button.tsx`, update the variant styles. The key change: the `default` variant should use the new warm primary, and we're adding a `sunset` variant for high-energy CTAs:

```ts
default: "bg-primary text-primary-foreground shadow-warm-sm hover:bg-primary/90",
// Add new variant:
sunset: "bg-gradient-to-r from-sunset-500 to-sunset-600 text-white shadow-warm-sm hover:from-sunset-600 hover:to-sunset-700",
```

**Project-wide button cleanup:**
- Search for inline `bg-gradient-to-r from-blue-600 to-purple-600` patterns on buttons → replace with the `sunset` variant or `bg-primary`
- Search for `bg-earth-600 hover:bg-earth-700` → these can stay or be updated to `bg-primary hover:bg-primary/90`
- Keep `rounded-full` pill buttons as-is — they work for the editorial travel feel

### 2D. Page backgrounds

Search the entire project for page-level background patterns and standardize:
- `bg-white` on page wrappers → `bg-background`
- `bg-gray-50`, `bg-slate-50` → `bg-background` or `bg-secondary`
- Keep existing `bg-gradient-to-br from-sand-50 via-sand-50 to-earth-50` patterns — these already work with the warm palette
- Replace any `from-blue-50 to-indigo-50` or `from-blue-50 via-indigo-50 to-purple-50` gradients (empty states, etc.) with warm equivalents: `from-sand-50 via-earth-50 to-sunset-50`

### 2E. Typography consistency pass

Search for and standardize heading/text patterns across all pages:
- Page titles: should use `font-display text-3xl md:text-4xl` (the serif) with `text-foreground`
- Section headings: `font-display text-2xl` with `text-foreground`
- Card titles: `font-sans text-lg font-semibold` (keep these in sans-serif)
- Body copy: `text-muted-foreground` (which is now the warm gray)
- Remove any remaining `text-gray-*` references → replace with `text-foreground`, `text-muted-foreground`, or `text-earth-*` as appropriate

### Phase 2 deliverable
Status report of all files modified. Confirm the app compiles and renders. Note any components where the color/shadow changes look awkward or need manual review.

---

## Phase 3: Signature Moments & Polish

### 3A. Subtle grain texture on hero sections

Create a tiny noise texture utility. Add to `src/index.css`:

```css
.bg-grain {
  position: relative;
}
.bg-grain::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.03;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  z-index: 1;
}
```

Apply `bg-grain` to:
- The Hero component wrapper on the landing page
- The trip detail HeroSection
- Any full-bleed section backgrounds that benefit from subtle texture

### 3B. Image warmth treatment

Add a CSS utility for warming destination images:

```css
.img-warm {
  filter: saturate(1.05) contrast(1.02) brightness(1.01);
}
```

Apply `.img-warm` to destination/trip cover images in:
- `TripCard` component
- Hero slideshow images on the landing page
- Trip detail hero images
- Vision board images

This is extremely subtle but shifts the overall feel from clinical to warm.

### 3C. Update PWA theme_color and fix broken OG image

In `public/manifest.json`:
- Change `"theme_color": "#f59e0b"` → `"theme_color": "#603D2E"` (matches new primary)
- Change `"background_color": "#ffffff"` → `"background_color": "#FDFCFA"` (matches new background)

In `index.html`:
- Fix the broken OG image reference: update `<meta property="og:image" content="/attached_assets/Black Logo.jpg" />` to point to the correct file path

### 3D. Dark mode variable update

If the `.dark` class overrides exist in `src/index.css`, update them to match the warm palette direction. The dark mode should feel like a warm evening rather than cold dark mode:

```css
.dark {
  --background: 25 12% 10%;          /* warm dark brown-black */
  --foreground: 36 25% 90%;          /* warm off-white */
  --card: 25 12% 13%;
  --card-foreground: 36 25% 90%;
  --primary: 28 50% 55%;             /* warm bronze, lighter for dark bg */
  --primary-foreground: 25 12% 10%;
  --secondary: 25 10% 18%;
  --secondary-foreground: 36 25% 85%;
  --muted: 25 8% 20%;
  --muted-foreground: 30 10% 55%;
  --accent: 25 15% 22%;
  --accent-foreground: 36 25% 90%;
  --border: 25 10% 22%;
  --input: 25 10% 22%;
  --ring: 28 50% 55%;
}
```

### Phase 3 deliverable
Status report. List every file changed. Confirm the app compiles. Flag any visual issues you notice.

---

## Phase 4: Cleanup & Consistency Audit

### 4A. Search for cold color remnants

Do a project-wide search for these patterns and replace or remove them:
- `text-gray-` → should be `text-foreground`, `text-muted-foreground`, or `text-earth-*`
- `bg-gray-` → should be `bg-background`, `bg-secondary`, `bg-muted`, or `bg-earth-*`
- `border-gray-` → should be `border-[hsl(var(--border))]` or `border-sand-*`
- `from-blue-` or `to-blue-` (except in specific feature contexts like charts) → replace with warm palette equivalents
- `from-indigo-` or `to-indigo-` → replace with warm equivalents
- `from-purple-` or `to-purple-` → replace with warm equivalents
- `text-slate-` → replace with semantic or earth/sand tokens

**Exception:** If blue/purple is used meaningfully (e.g., chart colors in the budget view, link affordances, or info states), leave it. We're removing the generic "SaaS blue" vibe, not eliminating blue from existence.

### 4B. Verify `theme.ts` utility file

Update `src/lib/theme.ts` to reflect all the new tokens (fonts, shadows, colors) so any components referencing it stay in sync.

### 4C. Final consistency check

Render each of these routes and confirm there are no visual regressions, broken layouts, or color clashes:
- `/` (homepage)
- `/explore`
- `/my-trips`
- `/create-trip`
- `/trip/:tripId` (timeline view)
- `/trip/:tripId` (budget view)

### Phase 4 deliverable
Final status report. Full list of files modified across all phases. Note any remaining items that need manual design review.

---

## Rules for Claude Code During Execution

1. **Do not refactor component structure.** Only change styling — classes, CSS variables, font references, shadow values.
2. **Do not rename components, props, or files.**
3. **Do not modify any Supabase queries, React Query hooks, or business logic.**
4. **Do not remove Framer Motion animations** — they already support the editorial feel.
5. **When in doubt, prefer the warm palette over the cold one.** If you see `slate`, `gray`, `blue`, or `indigo` used as generic decoration, replace it with the warm equivalent. If it serves a specific UI purpose (error state, info badge, chart), leave it.
6. **Test compilation after each phase.** If something breaks, fix it before moving on.
7. **Return a status report after each phase** listing every file changed, what was changed, and any issues discovered.
