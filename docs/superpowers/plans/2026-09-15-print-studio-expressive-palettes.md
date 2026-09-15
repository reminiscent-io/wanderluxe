# Print Studio Expressive Palettes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Print Studio editions carry any palette (saturated or dark pages, neon fills) and a second "bold" layout that puts colour into shapes, while every printed word stays legible.

**Architecture:** Colour math moves into a dependency-free `color.ts` (WCAG contrast plus OKLCH lightness moves). A new `palette.ts` owns the palette contract and one `resolvePalette` function that only adjusts text-role lightness and passes everything else through. `spec.ts` adds `layout`, new font and motif registry entries, and uses `resolvePalette`. The server prompt and strict schema learn `layout` and `fills`. `PrintDocument` sets `data-layout` and fill CSS variables; `printDocument.css` gains a `[data-layout="bold"]` block.

**Tech Stack:** TypeScript, React 19, Vitest + Testing Library, plain CSS, Express (server prompt), OpenAI strict json_schema.

**Spec:** `docs/superpowers/specs/2026-09-15-print-studio-expressive-palettes-design.md`

## Global Constraints

- Worktree: `/Users/reminiscent/wanderluxe/.claude/worktrees/nervous-ptolemy-baa12a`, branch `claude/jovial-noether-e0284e`. Run every command from there. Never `cd` to `/Users/reminiscent/wanderluxe`.
- `src/lib/printDesign/*` stays dependency-free and DOM-free (imported by the Express server and the browser).
- Text floors, verbatim: `PALETTE_FLOORS = { ink: 4.5, muted: 4.5, secondary: 4.5, primary: 4.5, accent: 3 }`. Text on a fill: 4.5.
- No luminance gate on `background` or `surface`. Fills get no contrast gate against the page.
- A text colour that misses its floor moves only in OKLCH lightness, away from the page colour, hue and chroma held (chroma trimmed only to stay in sRGB). It is never replaced by another role's colour.
- New spec fields are optional: `PrintDesignSpec.layout?: 'editorial' | 'bold'`, `PrintPalette.fills?: PrintFill[]` where `PrintFill = { color: string; text: string }`. Absent `layout` renders editorial.
- Ruling (plan): `sanitizePrintDesign` sets `layout` only when the model sent a known id; an unknown or missing layout leaves the field absent (absent = editorial). This keeps designs without a layout round-tripping unchanged, which `sample.test.ts` on `claude/print-studio-landing-page-ee2863` asserts.
- `resolvePalette` omits `fills` when there are none, for the same round-trip reason.
- Max fills: 4. Fill entries are accepted as hex strings (model) or `{ color }` objects (stored).
- New font pairing ids, verbatim: `playful`, `poster`, `retro`, `grotesque`, `expanded`. New motif ids: `confetti`, `dots`, `sunburst`.
- The prompt contains no hex colour examples. "Never use neon" and "near-white" are removed.
- Editorial layout must not change visually for existing editions.
- Test command: `npx vitest run <paths>`. `npm run type-check` has ~300 pre-existing errors; check only files you touched with `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "<file names>"`.
- Commit messages end with a blank line then `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/printDesign/color.ts` (new) | Hex validation, WCAG luminance/contrast, OKLCH conversion, `ensureContrast`, `textOnFill` |
| `src/lib/printDesign/palette.ts` (new) | `PrintPalette`, `PrintFill`, `FALLBACK_PALETTE`, `PALETTE_FLOORS`, `PaletteAdjustment`, `resolvePalette`, `resolveFills` |
| `src/lib/printDesign/spec.ts` | Design spec contract, `PRINT_LAYOUTS`, registries, `sanitizePrintDesign`, `auditPrintCopy`, `auditPrintPalette`; re-exports colour and palette names so existing imports keep working |
| `src/components/trip/print-studio/motifs.tsx` | Three new motif tiles |
| `server/lib/printDesign.ts` | Prompt palette brief, schema (`layout`, `fills`), palette adjustment log |
| `src/components/trip/print-studio/PrintDocument.tsx` | `data-layout`, fill CSS variables, cover panel wrapper, per-day fill variables |
| `src/components/trip/print-studio/printDocument.css` | Bold layout block |
| `src/components/trip/print-studio/PrintStudioDialog.tsx` | Swatch shows fills when present |
| `CLAUDE.md` | §23 bullets |

---

### Task 1: Colour engine (`color.ts`)

**Files:**
- Create: `src/lib/printDesign/color.ts`
- Test: `src/lib/printDesign/color.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `isHexColor(v: unknown): v is string`
  - `normalizeHex(v: string): string`
  - `relativeLuminance(hex: string): number`
  - `contrastRatio(a: string, b: string): number`
  - `hexToOklch(hex: string): { L: number; C: number; h: number }`
  - `oklchToHex(L: number, C: number, h: number): string`
  - `ensureContrast(hex: string, ground: string, floor: number): string`
  - `textOnFill(fill: string, ink: string, background: string): string`
  - `FILL_TEXT_FLOOR = 4.5`

- [ ] **Step 1: Write the failing test**

Create `src/lib/printDesign/color.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  contrastRatio,
  ensureContrast,
  FILL_TEXT_FLOOR,
  hexToOklch,
  isHexColor,
  normalizeHex,
  oklchToHex,
  relativeLuminance,
  textOnFill,
} from './color';

const hueDelta = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

// Deterministic PRNG, so a property failure reproduces exactly.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const randomHex = (rand: () => number) =>
  `#${Math.floor(rand() * 0x1000000).toString(16).padStart(6, '0')}`;

const channels = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
};

describe('WCAG helpers', () => {
  it('validates and normalizes six-digit hex only', () => {
    expect(isHexColor('#aabbcc')).toBe(true);
    expect(isHexColor(' #ABC123 ')).toBe(true);
    expect(isHexColor('#abc')).toBe(false);
    expect(isHexColor('aabbcc')).toBe(false);
    expect(isHexColor(42)).toBe(false);
    expect(normalizeHex(' #ABC123 ')).toBe('#abc123');
  });

  it('measures contrast the WCAG way', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 3);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 3);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 3);
  });
});

describe('OKLCH conversion', () => {
  it('round-trips in-gamut colours to within one 8-bit step', () => {
    for (const hex of ['#1d3557', '#f654a6', '#24d7c6', '#faf8f4', '#7a6046', '#000000', '#ffffff']) {
      const { L, C, h } = hexToOklch(hex);
      const back = channels(oklchToHex(L, C, h));
      channels(hex).forEach((c, i) => expect(Math.abs(c - back[i])).toBeLessThanOrEqual(1));
    }
  });

  it('trims chroma, never hue, to stay inside sRGB', () => {
    const out = oklchToHex(0.3, 0.4, 150);
    expect(isHexColor(out)).toBe(true);
    expect(hueDelta(hexToOklch(out).h, 150)).toBeLessThan(3);
  });
});

describe('ensureContrast', () => {
  it('returns a colour that already clears its floor untouched', () => {
    expect(ensureContrast('#1d3557', '#fdfcf7', 4.5)).toBe('#1d3557');
  });

  it('darkens a pale colour on a light page and keeps its hue', () => {
    const out = ensureContrast('#e3b77a', '#faf8f4', 4.5);
    expect(contrastRatio(out, '#faf8f4')).toBeGreaterThanOrEqual(4.5);
    expect(relativeLuminance(out)).toBeLessThan(relativeLuminance('#e3b77a'));
    expect(hueDelta(hexToOklch(out).h, hexToOklch('#e3b77a').h)).toBeLessThan(2);
  });

  it('lightens a dark colour on a dark page and keeps its hue', () => {
    const out = ensureContrast('#3d49a0', '#141414', 4.5);
    expect(contrastRatio(out, '#141414')).toBeGreaterThanOrEqual(4.5);
    expect(relativeLuminance(out)).toBeGreaterThan(relativeLuminance('#3d49a0'));
    expect(hueDelta(hexToOklch(out).h, hexToOklch('#3d49a0').h)).toBeLessThan(2);
  });

  it('finds a legible colour on a saturated mid-tone page', () => {
    const out = ensureContrast('#ff66cc', '#ff00aa', 4.5);
    expect(contrastRatio(out, '#ff00aa')).toBeGreaterThanOrEqual(4.5);
  });

  it('holds every floor, is idempotent, and keeps hue across random palettes', () => {
    const rand = mulberry32(20260915);
    for (let i = 0; i < 3000; i++) {
      const colour = randomHex(rand);
      const ground = randomHex(rand);
      const floor = i % 2 ? 4.5 : 3;
      const out = ensureContrast(colour, ground, floor);
      expect(contrastRatio(out, ground)).toBeGreaterThanOrEqual(floor);
      expect(ensureContrast(out, ground, floor)).toBe(out);
      const a = hexToOklch(colour);
      const b = hexToOklch(out);
      if (out !== colour && a.C > 0.05 && b.C > 0.05) {
        expect(hueDelta(a.h, b.h)).toBeLessThan(3);
      }
    }
  });
});

describe('textOnFill', () => {
  it('prefers the edition ink, then its page colour', () => {
    expect(textOnFill('#ffd452', '#222139', '#fff8f4')).toBe('#222139');
    expect(textOnFill('#1d3557', '#222139', '#fff8f4')).toBe('#fff8f4');
  });

  it('falls back to black or white, whichever reads better', () => {
    expect(textOnFill('#f654a6', '#f0f0f0', '#fafafa')).toBe('#000000');
    expect(textOnFill('#3d49a0', '#20202a', '#1a1a1a')).toBe('#ffffff');
  });

  it('always clears the fill text floor', () => {
    const rand = mulberry32(7);
    for (let i = 0; i < 2000; i++) {
      const fill = randomHex(rand);
      const text = textOnFill(fill, randomHex(rand), randomHex(rand));
      expect(contrastRatio(text, fill)).toBeGreaterThanOrEqual(FILL_TEXT_FLOOR);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/printDesign/color.test.ts`
Expected: FAIL — `Failed to resolve import "./color"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/printDesign/color.ts`:

```ts
// src/lib/printDesign/color.ts — colour math for Print Studio palettes.
//
// Two jobs. WCAG 2.x contrast, because the legibility floors are defined in
// those terms. And moving a colour's lightness in OKLCH until it clears a
// floor, so a colour the design chose keeps its hue and chroma instead of
// being swapped for a different colour.
//
// Dependency-free and DOM-free: the Express route and the browser both use it.

const HEX_RE = /^#([0-9a-f]{6})$/i;

export function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && HEX_RE.test(v.trim());
}

export function normalizeHex(v: string): string {
  return `#${HEX_RE.exec(v.trim())![1].toLowerCase()}`;
}

function wcagChannel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const m = HEX_RE.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  return (
    0.2126 * wcagChannel((n >> 16) & 0xff) +
    0.7152 * wcagChannel((n >> 8) & 0xff) +
    0.0722 * wcagChannel(n & 0xff)
  );
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/* =========================================================================
   OKLCH
   ========================================================================= */

export interface Oklch {
  L: number;
  C: number;
  h: number;
}

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function hexToOklch(hex: string): Oklch {
  const n = parseInt(normalizeHex(hex).slice(1), 16);
  const r = srgbToLinear((n >> 16) & 0xff);
  const g = srgbToLinear((n >> 8) & 0xff);
  const b = srgbToLinear(n & 0xff);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

function oklchToLinearRgb(L: number, C: number, h: number): [number, number, number] {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: number[]) => rgb.every((c) => c >= -1e-4 && c <= 1 + 1e-4);

function linearRgbToHex(rgb: number[]): string {
  const encode = (c: number) => {
    const v = Math.min(1, Math.max(0, c));
    const s = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    return Math.round(s * 255).toString(16).padStart(2, '0');
  };
  return `#${rgb.map(encode).join('')}`;
}

/** OKLCH → hex. Chroma is reduced (hue never) until the colour fits sRGB. */
export function oklchToHex(L: number, C: number, h: number): string {
  const lightness = Math.min(1, Math.max(0, L));
  let chroma = Math.max(0, C);
  if (!inGamut(oklchToLinearRgb(lightness, chroma, h))) {
    let lo = 0;
    let hi = chroma;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinearRgb(lightness, mid, h))) lo = mid;
      else hi = mid;
    }
    chroma = lo;
  }
  return linearRgbToHex(oklchToLinearRgb(lightness, chroma, h));
}

/* =========================================================================
   Legibility
   ========================================================================= */

const BLACK = '#000000';
const WHITE = '#ffffff';

/**
 * The lightest move of `hex` toward black or white that clears `floor`
 * against `ground`, with OKLCH hue and chroma held.
 *
 * The pole is whichever of black and white contrasts more with the ground;
 * that pole always reaches at least 4.58:1, so every floor up to 4.5 has a
 * solution. Along the path toward the pole, contrast first falls (if the
 * colour starts on the far side of the ground's luminance) and then only
 * rises, so "clears the floor" is false then true, and a binary search finds
 * the boundary. Candidates are tested after 8-bit rounding, so the returned
 * hex itself clears the floor.
 */
export function ensureContrast(hex: string, ground: string, floor: number): string {
  if (contrastRatio(hex, ground) >= floor) return hex;
  const pole = contrastRatio(BLACK, ground) >= contrastRatio(WHITE, ground) ? BLACK : WHITE;
  if (contrastRatio(pole, ground) < floor) return pole;

  const { L, C, h } = hexToOklch(hex);
  const target = pole === BLACK ? 0 : 1;
  const at = (t: number) => oklchToHex(L + (target - L) * t, C, h);

  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(at(mid), ground) >= floor) hi = mid;
    else lo = mid;
  }
  return hi === 1 ? pole : at(hi);
}

/** Text set on a solid fill clears this against the fill. */
export const FILL_TEXT_FLOOR = 4.5;

/**
 * The text colour for a fill: the edition's ink, else its page colour, else
 * whichever of black and white reads better (always at least 4.58:1).
 */
export function textOnFill(fill: string, ink: string, background: string): string {
  for (const candidate of [ink, background]) {
    if (contrastRatio(candidate, fill) >= FILL_TEXT_FLOOR) return candidate;
  }
  return contrastRatio(BLACK, fill) >= contrastRatio(WHITE, fill) ? BLACK : WHITE;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/printDesign/color.test.ts`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Commit**

```bash
git add src/lib/printDesign/color.ts src/lib/printDesign/color.test.ts
git commit -m "feat: add OKLCH colour engine for Print Studio palettes

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 2: Palette contract and resolution (`palette.ts`)

**Files:**
- Create: `src/lib/printDesign/palette.ts`
- Test: `src/lib/printDesign/palette.test.ts`

**Interfaces:**
- Consumes (Task 1, `./color`): `contrastRatio`, `ensureContrast`, `isHexColor`, `normalizeHex`, `textOnFill`, `hexToOklch` (tests only).
- Produces:
  - `interface PrintFill { color: string; text: string }`
  - `interface PrintPalette { primary; secondary; background; surface; ink; muted; accent: string; fills?: PrintFill[] }`
  - `FALLBACK_PALETTE: PrintPalette`
  - `PALETTE_FLOORS = { ink: 4.5, muted: 4.5, secondary: 4.5, primary: 4.5, accent: 3 } as const`
  - `type TextRole = keyof typeof PALETTE_FLOORS`
  - `MAX_FILLS = 4`
  - `interface PaletteAdjustment { role: TextRole | 'background' | 'fills'; from: string | null; to: string | null; ratio: number | null; floor: number | null; kind: 'adjusted' | 'replaced' | 'dropped' }`
  - `resolvePalette(raw: unknown): { palette: PrintPalette; adjustments: PaletteAdjustment[] }`
  - `resolveFills(palette: PrintPalette): PrintFill[]`

- [ ] **Step 1: Write the failing test**

Create `src/lib/printDesign/palette.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { contrastRatio, hexToOklch } from './color';
import {
  FALLBACK_PALETTE,
  MAX_FILLS,
  PALETTE_FLOORS,
  resolveFills,
  resolvePalette,
  type PrintPalette,
} from './palette';

const ROLES = Object.keys(PALETTE_FLOORS) as Array<keyof typeof PALETTE_FLOORS>;

const hueDelta = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const randomHex = (rand: () => number) =>
  `#${Math.floor(rand() * 0x1000000).toString(16).padStart(6, '0')}`;

const VALID: PrintPalette = {
  primary: '#1d3557',
  secondary: '#3d6f8e',
  background: '#fdfcf7',
  surface: '#f1ede2',
  ink: '#22252a',
  muted: '#5c6470',
  accent: '#c65f28',
};

describe('resolvePalette', () => {
  it('passes a legible palette through untouched and reports nothing', () => {
    const { palette, adjustments } = resolvePalette(VALID);
    expect(palette).toEqual(VALID);
    expect(adjustments).toEqual([]);
  });

  it('passes the fallback palette through untouched', () => {
    expect(resolvePalette({ ...FALLBACK_PALETTE }).palette).toEqual(FALLBACK_PALETTE);
  });

  it('keeps whatever page colour and surface the design chose', () => {
    for (const background of ['#141414', '#ff00aa', '#ffd400', '#1d3557']) {
      const { palette } = resolvePalette({ ...VALID, background, surface: '#00ff66' });
      expect(palette.background).toBe(background);
      expect(palette.surface).toBe('#00ff66');
    }
  });

  it('moves a pale text colour until it reads, keeping its hue', () => {
    const { palette, adjustments } = resolvePalette({
      ...VALID,
      background: '#faf8f4',
      primary: '#e3b77a',
      accent: '#b5c7a6',
    });
    expect(contrastRatio(palette.primary, '#faf8f4')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(palette.accent, '#faf8f4')).toBeGreaterThanOrEqual(3);
    expect(hueDelta(hexToOklch(palette.primary).h, hexToOklch('#e3b77a').h)).toBeLessThan(2);
    expect(hueDelta(hexToOklch(palette.accent).h, hexToOklch('#b5c7a6').h)).toBeLessThan(2);
    expect(palette.primary).not.toBe(palette.ink);
    expect(adjustments.map((a) => [a.role, a.kind])).toEqual([
      ['primary', 'adjusted'],
      ['accent', 'adjusted'],
    ]);
    expect(adjustments[0]).toMatchObject({ from: '#e3b77a', to: palette.primary, floor: 4.5 });
    expect(adjustments[0].ratio).toBeCloseTo(contrastRatio('#e3b77a', '#faf8f4'), 5);
  });

  it('lightens text on a dark page', () => {
    const { palette } = resolvePalette({ ...VALID, background: '#141414' });
    for (const role of ROLES) {
      expect(contrastRatio(palette[role], '#141414')).toBeGreaterThanOrEqual(PALETTE_FLOORS[role]);
    }
    expect(palette.ink).not.toBe(VALID.ink);
  });

  it('replaces a missing or malformed colour with the fallback, then fits it to the page', () => {
    const { palette, adjustments } = resolvePalette({ ...VALID, background: '#141414', ink: 'nope' });
    expect(contrastRatio(palette.ink, '#141414')).toBeGreaterThanOrEqual(4.5);
    expect(adjustments.find((a) => a.role === 'ink')).toMatchObject({ from: null, kind: 'replaced' });

    const bare = resolvePalette(null);
    expect(bare.palette.background).toBe(FALLBACK_PALETTE.background);
    expect(bare.adjustments[0]).toMatchObject({ role: 'background', from: null, kind: 'replaced' });
  });

  it('keeps fills at any brightness and gives each a legible text colour', () => {
    const { palette } = resolvePalette({ ...VALID, fills: ['#FFD452', '#24d7c6', '#f654a6'] });
    expect(palette.fills!.map((f) => f.color)).toEqual(['#ffd452', '#24d7c6', '#f654a6']);
    for (const fill of palette.fills!) {
      expect(contrastRatio(fill.text, fill.color)).toBeGreaterThanOrEqual(4.5);
    }
    expect(palette.fills![0].text).toBe(VALID.ink);
  });

  it('drops malformed fills, removes duplicates and keeps at most four', () => {
    const { palette, adjustments } = resolvePalette({
      ...VALID,
      fills: ['#111111', 'pink', '#111111', '#222222', 42, '#333333', '#444444', '#555555'],
    });
    expect(palette.fills!.map((f) => f.color)).toEqual(['#111111', '#222222', '#333333', '#444444']);
    expect(adjustments.filter((a) => a.kind === 'dropped').map((a) => a.from)).toEqual(['pink', null]);
    expect(MAX_FILLS).toBe(4);
  });

  it('omits fills when there are none', () => {
    expect('fills' in resolvePalette({ ...VALID, fills: [] }).palette).toBe(false);
    expect('fills' in resolvePalette(VALID).palette).toBe(false);
  });

  it('accepts stored fills, so resolving twice changes nothing', () => {
    const once = resolvePalette({
      ...VALID,
      background: '#2a1a3a',
      primary: '#553377',
      fills: ['#ff00aa', '#00e5ff'],
    }).palette;
    expect(resolvePalette(once).palette).toEqual(once);
  });

  it('holds every floor and is idempotent across random palettes', () => {
    const rand = mulberry32(915);
    for (let i = 0; i < 2000; i++) {
      const raw = {
        primary: randomHex(rand),
        secondary: randomHex(rand),
        background: randomHex(rand),
        surface: randomHex(rand),
        ink: randomHex(rand),
        muted: randomHex(rand),
        accent: randomHex(rand),
        fills: Array.from({ length: Math.floor(rand() * 6) }, () => randomHex(rand)),
      };
      const { palette } = resolvePalette(raw);
      for (const role of ROLES) {
        expect(contrastRatio(palette[role], palette.background)).toBeGreaterThanOrEqual(PALETTE_FLOORS[role]);
      }
      for (const fill of palette.fills ?? []) {
        expect(contrastRatio(fill.text, fill.color)).toBeGreaterThanOrEqual(4.5);
      }
      expect(resolvePalette(palette).palette).toEqual(palette);
    }
  });
});

describe('resolveFills', () => {
  it('returns the stored fills when the palette has them', () => {
    const fills = [{ color: '#ff00aa', text: '#000000' }];
    expect(resolveFills({ ...VALID, fills })).toBe(fills);
  });

  it('derives fills from primary, accent and secondary when there are none', () => {
    const derived = resolveFills(VALID);
    expect(derived.map((f) => f.color)).toEqual(['#1d3557', '#c65f28', '#3d6f8e']);
    for (const fill of derived) {
      expect(contrastRatio(fill.text, fill.color)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('does not repeat a colour two roles share', () => {
    expect(resolveFills({ ...VALID, accent: '#1d3557' }).map((f) => f.color)).toEqual(['#1d3557', '#3d6f8e']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/printDesign/palette.test.ts`
Expected: FAIL — `Failed to resolve import "./palette"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/printDesign/palette.ts`:

```ts
// src/lib/printDesign/palette.ts — the Print Studio palette contract, and the
// one function that makes a design's palette printable.
//
// Sanitize for legibility, not taste. The page colour, the surface and the
// fills pass through as the design sent them: light paper, a saturated page, a
// dark one, neon shapes. Only the five text roles are touched, and only in
// lightness (see ensureContrast), so a colour the design chose stays that
// colour. It is never swapped for another role's colour or the house colour.
//
// Dependency-free and DOM-free, like the rest of this folder.

import { contrastRatio, ensureContrast, isHexColor, normalizeHex, textOnFill } from './color';

/** A solid shape colour plus the text colour chosen to sit on it. */
export interface PrintFill {
  /** The shape itself, at whatever brightness the design asked for. */
  color: string;
  /** Text set on this fill. Chosen by resolvePalette; clears 4.5:1 on `color`. */
  text: string;
}

export interface PrintPalette {
  /** Theme hue for display type, day numerals and section labels. Text, so 4.5:1. */
  primary: string;
  /** Day dates, the route line, confirmation codes. Small text, 4.5:1. */
  secondary: string;
  /** Page ground. Any colour: light paper, saturated, or dark. */
  background: string;
  /** The mat behind the cover photo. Never carries text, so it has no floor. */
  surface: string;
  /** Body text, 4.5:1. */
  ink: string;
  /** Times, details and locations at 12–13px, 4.5:1. */
  muted: string;
  /** Item-type icon rings and hairlines. Meaningful graphics, 3:1. */
  accent: string;
  /** 0–4 solid shape colours for the bold layout. Absent on editions stored before 2026-09-15. */
  fills?: PrintFill[];
}

export const FALLBACK_PALETTE: PrintPalette = {
  primary: '#3f4a5c',
  // #7a6046 rather than a lighter bronze: secondary sets 12px day dates and
  // confirmation codes, and the old #8a6f52 measured 4.42:1 on this ground.
  secondary: '#7a6046',
  background: '#faf8f4',
  surface: '#f1ece3',
  ink: '#2b2620',
  muted: '#6b6257',
  accent: '#b0562e',
};

/** Minimum contrast of each text role against the page background. */
export const PALETTE_FLOORS = { ink: 4.5, muted: 4.5, secondary: 4.5, primary: 4.5, accent: 3 } as const;

export type TextRole = keyof typeof PALETTE_FLOORS;

const TEXT_ROLES: TextRole[] = ['ink', 'muted', 'primary', 'secondary', 'accent'];

export const MAX_FILLS = 4;

/** One change resolvePalette made to what the design sent, for the server log. */
export interface PaletteAdjustment {
  role: TextRole | 'background' | 'fills';
  /** What the design sent; null when it was missing or not a colour. */
  from: string | null;
  /** What the palette uses instead; null for a dropped fill. */
  to: string | null;
  /** Contrast of `from` against the page, when there was a colour to measure. */
  ratio: number | null;
  floor: number | null;
  kind: 'adjusted' | 'replaced' | 'dropped';
}

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const cleanHex = (v: unknown): string | null => (isHexColor(v) ? normalizeHex(v) : null);

/**
 * Make a palette printable. Guarantees, whatever came in:
 *  - every colour is a normalized #rrggbb
 *  - each text role clears PALETTE_FLOORS against the page background
 *  - each fill carries a text colour that clears 4.5:1 on it
 *  - fills are deduplicated and capped at MAX_FILLS, and omitted when empty
 *  - resolving an already-resolved palette returns it unchanged
 *
 * Accepts fills as hex strings (model output) or { color } objects (a stored
 * palette), which is what makes the last guarantee hold.
 */
export function resolvePalette(raw: unknown): { palette: PrintPalette; adjustments: PaletteAdjustment[] } {
  const r = asRecord(raw);
  const adjustments: PaletteAdjustment[] = [];

  const sentBackground = cleanHex(r.background);
  const background = sentBackground ?? FALLBACK_PALETTE.background;
  if (!sentBackground) {
    adjustments.push({ role: 'background', from: null, to: background, ratio: null, floor: null, kind: 'replaced' });
  }

  const surface = cleanHex(r.surface) ?? background;

  const text = {} as Record<TextRole, string>;
  for (const role of TEXT_ROLES) {
    const floor = PALETTE_FLOORS[role];
    const sent = cleanHex(r[role]);
    const to = ensureContrast(sent ?? FALLBACK_PALETTE[role], background, floor);
    text[role] = to;
    if (!sent) {
      adjustments.push({ role, from: null, to, ratio: null, floor, kind: 'replaced' });
    } else if (to !== sent) {
      adjustments.push({ role, from: sent, to, ratio: contrastRatio(sent, background), floor, kind: 'adjusted' });
    }
  }

  const fills: PrintFill[] = [];
  for (const entry of Array.isArray(r.fills) ? r.fills : []) {
    const value = entry && typeof entry === 'object' ? (entry as Record<string, unknown>).color : entry;
    const color = cleanHex(value);
    if (!color) {
      const from = typeof value === 'string' ? value.slice(0, 40) : null;
      adjustments.push({ role: 'fills', from, to: null, ratio: null, floor: null, kind: 'dropped' });
      continue;
    }
    if (fills.length >= MAX_FILLS || fills.some((f) => f.color === color)) continue;
    fills.push({ color, text: textOnFill(color, text.ink, background) });
  }

  const palette: PrintPalette = {
    primary: text.primary,
    secondary: text.secondary,
    background,
    surface,
    ink: text.ink,
    muted: text.muted,
    accent: text.accent,
  };
  if (fills.length > 0) palette.fills = fills;

  return { palette, adjustments };
}

/**
 * The fills a layout should paint with. A palette without its own fills (every
 * edition stored before 2026-09-15, or a bold design that sent none) borrows
 * primary, accent and secondary, which are already known to suit the page.
 */
export function resolveFills(palette: PrintPalette): PrintFill[] {
  if (palette.fills && palette.fills.length > 0) return palette.fills;
  const derived: PrintFill[] = [];
  for (const color of [palette.primary, palette.accent, palette.secondary]) {
    if (derived.some((f) => f.color === color)) continue;
    derived.push({ color, text: textOnFill(color, palette.ink, palette.background) });
  }
  return derived;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/printDesign/palette.test.ts src/lib/printDesign/color.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/printDesign/palette.ts src/lib/printDesign/palette.test.ts
git commit -m "feat: resolve Print Studio palettes for legibility, keeping hue

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 3: Wire the palette and layout into the design spec (`spec.ts`)

**Files:**
- Modify: `src/lib/printDesign/spec.ts`
- Modify: `src/lib/printDesign/spec.test.ts`
- Modify: `CLAUDE.md` (§23 "Shared contract" bullet)

**Interfaces:**
- Consumes (Task 1, `./color`): `contrastRatio`, `isHexColor`, `normalizeHex`, `relativeLuminance`, `hexToOklch` (tests).
- Consumes (Task 2, `./palette`): `resolvePalette`, `resolveFills`, `FALLBACK_PALETTE`, `PALETTE_FLOORS`, types `PrintPalette`, `PrintFill`, `PaletteAdjustment`.
- Produces (from `spec.ts`):
  - `PRINT_LAYOUTS = ['editorial', 'bold'] as const`, `type PrintLayout`
  - `PrintDesignSpec.layout?: PrintLayout`
  - `auditPrintPalette(raw: unknown): PaletteAdjustment[]`
  - Re-exports so existing imports keep compiling: `contrastRatio`, `isHexColor`, `normalizeHex`, `relativeLuminance`, `FALLBACK_PALETTE`, `PALETTE_FLOORS`, `resolveFills`, types `PaletteAdjustment`, `PrintFill`, `PrintPalette`.
  - `sanitizePrintDesign` keeps its signature; its `palette` now comes from `resolvePalette`, and it sets `layout` only for a known id.

- [ ] **Step 1: Update the tests first**

In `src/lib/printDesign/spec.test.ts`:

1. Replace the import block at the top with:

```ts
import { describe, it, expect } from 'vitest';
import {
  auditPrintCopy,
  auditPrintPalette,
  contrastRatio,
  FALLBACK_PALETTE,
  FONT_PAIRINGS,
  getFontPairing,
  isHexColor,
  PALETTE_FLOORS,
  relativeLuminance,
  sanitizePrintDesign,
} from './spec';
import { hexToOklch } from './color';

const hueDelta = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

type TextRole = keyof typeof PALETTE_FLOORS;
const TEXT_ROLES = Object.keys(PALETTE_FLOORS) as TextRole[];
```

2. Replace the test `'the fallback palette passes its own contrast gates'` with:

```ts
  it('the fallback palette passes its own contrast gates', () => {
    for (const role of TEXT_ROLES) {
      expect(contrastRatio(FALLBACK_PALETTE[role], FALLBACK_PALETTE.background)).toBeGreaterThanOrEqual(
        PALETTE_FLOORS[role]
      );
    }
  });
```

3. In `'passes a well-formed spec through intact'`, add these two lines before the closing `});`:

```ts
    expect(spec.palette).toEqual(VALID_RAW.palette);
    expect('layout' in spec).toBe(false);
```

4. Replace `'rejects a dark page background'` with:

```ts
  it('keeps a dark page background and lightens text to read on it', () => {
    const spec = sanitizePrintDesign(
      { ...VALID_RAW, palette: { ...VALID_RAW.palette, background: '#101418' } },
      DATES
    );
    expect(spec.palette.background).toBe('#101418');
    for (const role of TEXT_ROLES) {
      expect(contrastRatio(spec.palette[role], '#101418')).toBeGreaterThanOrEqual(PALETTE_FLOORS[role]);
    }
  });
```

5. Replace `'replaces unreadable ink and muted colors'` with:

```ts
  it('moves unreadable ink and muted colours until they read, instead of replacing them', () => {
    const spec = sanitizePrintDesign(
      { ...VALID_RAW, palette: { ...VALID_RAW.palette, ink: '#eeeeee', muted: '#f0f0f0' } },
      DATES
    );
    expect(contrastRatio(spec.palette.ink, spec.palette.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(spec.palette.muted, spec.palette.background)).toBeGreaterThanOrEqual(4.5);
    expect(spec.palette.ink).not.toBe(FALLBACK_PALETTE.ink);
    expect(spec.palette.muted).not.toBe(FALLBACK_PALETTE.muted);
  });
```

6. Delete these three tests entirely: `'demotes a low-contrast primary to the ink color'`, `'demotes a low-contrast secondary to the primary hue, not to the neutral'`, `'demotes an accent that cannot draw a visible hairline'`. In their place add:

```ts
  it('keeps a pale primary, secondary and accent in their own hues instead of demoting them', () => {
    const sent = { primary: '#f4a6c0', secondary: '#a8d0f0', accent: '#b5c7a6' };
    const { palette } = sanitizePrintDesign(
      { ...VALID_RAW, palette: { ...VALID_RAW.palette, ...sent } },
      DATES
    );
    for (const role of ['primary', 'secondary', 'accent'] as const) {
      expect(contrastRatio(palette[role], palette.background)).toBeGreaterThanOrEqual(PALETTE_FLOORS[role]);
      expect(hueDelta(hexToOklch(palette[role]).h, hexToOklch(sent[role]).h)).toBeLessThan(2);
      expect(palette[role]).not.toBe(palette.ink);
    }
    expect(new Set([palette.primary, palette.secondary, palette.accent]).size).toBe(3);
  });

  it('keeps a known layout and leaves an unknown or missing one absent', () => {
    expect(sanitizePrintDesign({ ...VALID_RAW, layout: 'bold' }, DATES).layout).toBe('bold');
    expect(sanitizePrintDesign({ ...VALID_RAW, layout: 'editorial' }, DATES).layout).toBe('editorial');
    expect('layout' in sanitizePrintDesign({ ...VALID_RAW, layout: 'lasers' }, DATES)).toBe(false);
    expect('layout' in sanitizePrintDesign(VALID_RAW, DATES)).toBe(false);
  });

  it('keeps the fills the model sent', () => {
    const spec = sanitizePrintDesign(
      { ...VALID_RAW, layout: 'bold', palette: { ...VALID_RAW.palette, fills: ['#ff00aa', '#00e5ff'] } },
      DATES
    );
    expect(spec.palette.fills?.map((f) => f.color)).toEqual(['#ff00aa', '#00e5ff']);
  });

  it('returns an already-sanitized design unchanged', () => {
    const once = sanitizePrintDesign(
      {
        ...VALID_RAW,
        layout: 'bold',
        palette: { ...VALID_RAW.palette, background: '#1b1030', fills: ['#ff00aa'] },
      },
      DATES
    );
    expect(sanitizePrintDesign(once, DATES)).toEqual(once);
  });
```

7. In `'every text-bearing role clears AA no matter what the model returned'`, replace the two `for` loops with:

```ts
    for (const role of TEXT_ROLES) {
      expect(contrastRatio(palette[role], palette.background)).toBeGreaterThanOrEqual(PALETTE_FLOORS[role]);
    }
```

8. Append at the end of the file:

```ts
describe('auditPrintPalette', () => {
  it('reports each palette change with the ratio that caused it', () => {
    const audit = auditPrintPalette({
      ...VALID_RAW,
      palette: { ...VALID_RAW.palette, accent: '#f7e3d2', fills: ['nope'] },
    });
    expect(audit.map((a) => [a.role, a.kind])).toEqual([
      ['accent', 'adjusted'],
      ['fills', 'dropped'],
    ]);
    expect(audit[0].ratio).toBeLessThan(3);
  });

  it('reports nothing for a legible palette', () => {
    expect(auditPrintPalette(VALID_RAW)).toEqual([]);
  });
});
```

Leave `relativeLuminance` and `isHexColor` in the import list: the existing `'color math'` tests use them.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/printDesign/spec.test.ts`
Expected: FAIL — `auditPrintPalette` and `PALETTE_FLOORS` are not exported from `./spec`, so the file fails to import or the new tests fail.

- [ ] **Step 3: Update `spec.ts`**

1. Replace the import line `import { findSlop, repairCopy, type SlopFinding } from './voice';` and the whole `export interface PrintPalette { ... }` block that follows it with:

```ts
import { findSlop, repairCopy, type SlopFinding } from './voice';
import { resolvePalette, type PaletteAdjustment } from './palette';
import type { PrintPalette } from './palette';

// Colour and palette live in their own modules; these re-exports keep every
// existing `from '@/lib/printDesign/spec'` import working.
export { contrastRatio, isHexColor, normalizeHex, relativeLuminance } from './color';
export {
  FALLBACK_PALETTE,
  PALETTE_FLOORS,
  resolveFills,
  type PaletteAdjustment,
  type PrintFill,
  type PrintPalette,
} from './palette';

/**
 * How an edition carries colour. 'editorial' sets structure in type and
 * hairline rules; 'bold' puts the palette's fills into panels, bands and
 * badges.
 */
export const PRINT_LAYOUTS = ['editorial', 'bold'] as const;

export type PrintLayout = (typeof PRINT_LAYOUTS)[number];
```

2. In `export interface PrintDesignSpec`, directly after the `motif: MotifId;` line, add:

```ts
  /**
   * How the page carries colour. Absent on editions stored before 2026-09-15;
   * absent renders as 'editorial'.
   */
  layout?: PrintLayout;
```

3. Delete the whole "Color math — tiny, dependency-free WCAG helpers" section: the banner comment, `HEX_RE`, `isHexColor`, `normalizeHex`, `channel`, `relativeLuminance` and `contrastRatio`.

4. Delete `export const FALLBACK_PALETTE: PrintPalette = { ... };` (with its comment) and the `function cleanHex(...)` helper. Both now live in `palette.ts` or are no longer needed.

5. Replace the doc comment above `sanitizePrintDesign` and the palette code at the top of its body — everything from `let background = cleanHex(...)` through `if (contrastRatio(accent, background) < 3) accent = secondary;` — so the start of the function reads:

```ts
/**
 * Validate + clamp a raw model response into a renderable PrintDesignSpec.
 *
 * Sanitizes for legibility, not taste. Guarantees, regardless of input:
 *  - the palette is printable (resolvePalette in ./palette): every colour is a
 *    normalized #rrggbb, each text role clears its floor against the page, and
 *    each fill carries legible text. Any page colour, surface and fill passes
 *    through as sent; a text colour that misses moves in lightness only, so it
 *    keeps its hue.
 *  - layout is a known id, or absent (absent renders 'editorial')
 *  - fontPairing and motif are known registry ids
 *  - all copy is single-line-ish, length-clamped, never empty for required slots
 *  - prose copy clears the house voice: banned words, travel clichés and AI
 *    sentence shapes are dropped to the field's fallback (see ./voice.ts)
 *  - dayCaptions only contains keys from `dayDates`
 *  - sanitizing an already-sanitized design returns it unchanged
 */
export function sanitizePrintDesign(raw: unknown, dayDates: string[] = []): PrintDesignSpec {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const { palette } = resolvePalette(r.palette);

  const layout = (PRINT_LAYOUTS as readonly string[]).includes(r.layout as string)
    ? (r.layout as PrintLayout)
    : undefined;
```

Keep the rest of the body (`fontPairing`, `motif`, `rawCover`, captions) as it is.

6. In the returned object, replace `palette: { primary, secondary, background, surface, ink, muted, accent },` with `palette,` and add this line directly after `motif,`:

```ts
    ...(layout ? { layout } : {}),
```

7. Append after `auditPrintCopy`:

```ts
/**
 * Report what resolvePalette changes in the model's palette, and why. Purely
 * observational: the server logs it, so a model that keeps sending pastel text
 * colours shows up as a line with ratios attached rather than as a quiet shift
 * in every edition's colours.
 */
export function auditPrintPalette(raw: unknown): PaletteAdjustment[] {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return resolvePalette(r.palette).adjustments;
}
```

8. `PrintPalette` is still used in `PrintDesignSpec` through the type-only import from step 1. If nothing else in the file references it, the import stays for that interface.

- [ ] **Step 4: Run the Print Studio tests**

Run: `npx vitest run src/lib/printDesign src/components/trip/print-studio server/lib/printDesign.test.ts`
Expected: PASS for every file, including `edits.test.ts` and `PrintDocument.test.tsx`, which import from `spec.ts`.

Then: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "printDesign/(spec|palette|color)|PrintStudioDialog|PrintDocument|PrintItinerary"`
Expected: no output.

- [ ] **Step 5: Update CLAUDE.md**

In `CLAUDE.md` §23, replace the bullet that starts `- **Shared contract**: \`src/lib/printDesign/spec.ts\`` with:

```markdown
- **Shared contract**: `src/lib/printDesign/spec.ts` (dependency-free; imported by both client and server) — registries (`FONT_PAIRINGS` → Google Fonts pairs, `MOTIFS`, `PRINT_LAYOUTS`) + `sanitizePrintDesign`. Colour lives in `color.ts` (WCAG contrast + OKLCH) and `palette.ts` (`resolvePalette`). The sanitizer works for **legibility, not taste**: any page colour, surface and fill passes through (saturated, dark, neon), and only the text roles are adjusted — in OKLCH lightness, hue and chroma held — until they clear `PALETTE_FLOORS` (ink/muted/secondary/primary 4.5:1, accent 3:1). A text colour is never swapped for another role's. Each fill gets a text colour that clears 4.5:1 on it. Also registry-id fallbacks, copy length clamps, captions restricted to real trip dates; `auditPrintPalette` reports every colour change for the server log
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/printDesign/spec.ts src/lib/printDesign/spec.test.ts CLAUDE.md
git commit -m "feat: sanitize Print Studio designs for legibility, not taste

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 4: Playful and expressive typefaces and motifs

**Files:**
- Modify: `src/lib/printDesign/spec.ts` (`FONT_PAIRINGS`, `MOTIFS`)
- Modify: `src/components/trip/print-studio/motifs.tsx` (`tileFor`)
- Modify: `src/lib/printDesign/spec.test.ts` (`font pairings` describe)
- Create: `src/components/trip/print-studio/motifs.test.tsx`

**Interfaces:**
- Consumes (Task 3): `spec.ts` as reorganized; `getFontPairing`, `FONT_PAIRINGS`, `MOTIFS`, `MotifId`.
- Produces: `FontPairingId` gains `'playful' | 'poster' | 'retro' | 'grotesque' | 'expanded'`; `MotifId` gains `'confetti' | 'dots' | 'sunburst'`. `FONT_PAIRINGS` and `MOTIFS` stay `as const` arrays (Task 5 builds prompt menus and schema enums from them).

- [ ] **Step 1: Write the failing tests**

In `src/lib/printDesign/spec.test.ts`, inside `describe('font pairings', ...)`, add:

```ts
  it('offers playful and expressive pairings alongside the editorial ones', () => {
    for (const id of ['playful', 'poster', 'retro', 'grotesque', 'expanded']) {
      expect(getFontPairing(id).id).toBe(id);
    }
  });
```

Create `src/components/trip/print-studio/motifs.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MotifBand, MotifMark } from './motifs';
import { MOTIFS } from '@/lib/printDesign/spec';

describe('motifs', () => {
  it('registers the celebratory motifs', () => {
    expect(MOTIFS).toEqual(expect.arrayContaining(['confetti', 'dots', 'sunburst']));
  });

  it('draws every registered motif as a band and as a mark', () => {
    for (const motif of MOTIFS) {
      const band = render(<MotifBand motif={motif} />);
      const mark = render(<MotifMark motif={motif} />);
      if (motif === 'none') {
        expect(band.container.querySelector('svg')).toBeNull();
        expect(mark.container.firstChild).toBeNull();
      } else {
        expect(band.container.querySelector('pattern')).not.toBeNull();
        expect(mark.container.querySelector('svg')?.children.length ?? 0).toBeGreaterThan(0);
      }
      band.unmount();
      mark.unmount();
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/printDesign/spec.test.ts src/components/trip/print-studio/motifs.test.tsx`
Expected: FAIL — `getFontPairing('playful').id` is `'house'`, and `MOTIFS` lacks `confetti`.

- [ ] **Step 3: Add the font pairings**

In `src/lib/printDesign/spec.ts`, insert these five entries at the end of the `FONT_PAIRINGS` array, directly before `] as const;`:

```ts
  {
    id: 'playful',
    label: 'Fredoka & Nunito',
    display: "'Fredoka', 'Trebuchet MS', sans-serif",
    body: "'Nunito', 'Helvetica Neue', sans-serif",
    googleQuery: 'family=Fredoka:wght@400;600&family=Nunito:wght@400;600;700',
  },
  {
    id: 'poster',
    label: 'Lilita One & Poppins',
    display: "'Lilita One', Impact, sans-serif",
    body: "'Poppins', 'Helvetica Neue', sans-serif",
    googleQuery: 'family=Lilita+One&family=Poppins:wght@400;500;600',
  },
  {
    id: 'retro',
    label: 'Shrikhand & Karla',
    display: "'Shrikhand', Georgia, serif",
    body: "'Karla', 'Helvetica Neue', sans-serif",
    googleQuery: 'family=Shrikhand&family=Karla:wght@400;500;700',
  },
  {
    id: 'grotesque',
    label: 'Archivo Black & Archivo',
    display: "'Archivo Black', 'Arial Black', sans-serif",
    body: "'Archivo', 'Helvetica Neue', sans-serif",
    googleQuery: 'family=Archivo+Black&family=Archivo:wght@400;500;600',
  },
  {
    id: 'expanded',
    label: 'Unbounded & Work Sans',
    display: "'Unbounded', 'Arial Black', sans-serif",
    body: "'Work Sans', 'Helvetica Neue', sans-serif",
    googleQuery: 'family=Unbounded:wght@400;600&family=Work+Sans:wght@400;500;600',
  },
```

- [ ] **Step 4: Add the motif ids**

In `src/lib/printDesign/spec.ts`, replace the `MOTIFS` array with:

```ts
export const MOTIFS = [
  'waves', // coastal / island trips
  'palms', // tropical
  'mountains', // alpine / hiking
  'deco', // art-deco cities, glamour
  'stars', // desert nights, northern lights
  'botanical', // gardens, countryside
  'geometric', // modern cities
  'confetti', // birthdays, parties, celebrations
  'dots', // playful, retro, pop
  'sunburst', // sunny, mid-century, festive
  'none', // let the typography carry it
] as const;
```

- [ ] **Step 5: Draw the motif tiles**

In `src/components/trip/print-studio/motifs.tsx`, inside `tileFor`, add these three cases directly before `case 'none':`:

```tsx
    case 'confetti':
      return {
        w: 40,
        h: 16,
        content: (
          <g fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round">
            <path d="M4 4 L 8 6" />
            <path d="M17 11 L 19 7" opacity={0.75} />
            <circle cx="27" cy="4.5" r="1.6" />
            <path d="M33 12 L 37 11" opacity={0.6} />
            <circle cx="11" cy="12.5" r="1" fill="currentColor" stroke="none" opacity={0.7} />
            <path d="M22 13 Q 24 11.5, 25.5 13.5" opacity={0.8} />
          </g>
        ),
      };
    case 'dots':
      return {
        w: 20,
        h: 12,
        content: (
          <g fill="currentColor" stroke="none">
            <circle cx="5" cy="3.5" r="1.6" />
            <circle cx="15" cy="8.5" r="1.6" opacity={0.7} />
          </g>
        ),
      };
    case 'sunburst':
      return {
        w: 32,
        h: 16,
        content: (
          <g fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round">
            <path d="M10 14 A 6 6 0 0 1 22 14" />
            <path d="M16 6 L 16 2.5" />
            <path d="M10.5 8.5 L 8 6" opacity={0.8} />
            <path d="M21.5 8.5 L 24 6" opacity={0.8} />
            <path d="M7.5 12 L 4 11" opacity={0.6} />
            <path d="M24.5 12 L 28 11" opacity={0.6} />
            <path d="M0 14.5 L 32 14.5" strokeWidth={STROKE * 0.6} opacity={0.5} />
          </g>
        ),
      };
```

Update the file's header comment line "Each motif is a small repeating tile drawn with currentColor strokes" to "Each motif is a small repeating tile drawn in currentColor, mostly strokes with the odd small dot".

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/lib/printDesign/spec.test.ts src/components/trip/print-studio/motifs.test.tsx server/lib/printDesign.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/printDesign/spec.ts src/lib/printDesign/spec.test.ts src/components/trip/print-studio/motifs.tsx src/components/trip/print-studio/motifs.test.tsx
git commit -m "feat: add playful Print Studio typefaces and celebration motifs

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 5: Prompt, schema and palette log (`server/lib/printDesign.ts`)

**Files:**
- Modify: `server/lib/printDesign.ts`
- Modify: `server/lib/printDesign.test.ts`

**Interfaces:**
- Consumes (Tasks 3–4, via `../../src/lib/printDesign/spec`): `auditPrintPalette`, `PRINT_LAYOUTS`, `FONT_PAIRINGS`, `MOTIFS`, type `PaletteAdjustment`.
- Produces:
  - `formatPaletteAudit(adjustments: PaletteAdjustment[]): string`
  - `PRINT_DESIGN_SCHEMA` with `properties.layout = { type: 'string', enum: ['editorial', 'bold'] }` and `properties.palette.properties.fills = { type: 'array', items: { type: 'string' } }`, both listed in their object's `required`.

- [ ] **Step 1: Write the failing tests**

In `server/lib/printDesign.test.ts`, change the import to:

```ts
import {
  buildTripPayload,
  buildDesignMessages,
  formatPaletteAudit,
  PRINT_DESIGN_SCHEMA,
  type PrintTripRows,
} from './printDesign';
```

Append at the end of the file:

```ts
describe('the palette brief', () => {
  const systemPrompt = () => {
    const { payload, dayDates } = buildTripPayload(rows());
    return buildDesignMessages(payload, dayDates, null)[0].content;
  };

  it('lets the design pick any page colour and bright fills', () => {
    const system = systemPrompt();
    expect(system).not.toMatch(/never use neon/i);
    expect(system).not.toMatch(/near-white/i);
    expect(system).toContain('fills');
    expect(system).toContain('"editorial"');
    expect(system).toContain('"bold"');
  });

  it('still states the text floors', () => {
    const system = systemPrompt();
    expect(system).toContain('4.5:1');
    expect(system).toContain('3:1');
  });

  it('gives the model no hex colour to copy', () => {
    expect(systemPrompt()).not.toMatch(/#[0-9a-f]{6}\b/i);
  });

  it('offers the new typefaces and motifs', () => {
    const system = systemPrompt();
    for (const id of ['playful', 'poster', 'retro', 'grotesque', 'expanded', 'confetti', 'dots', 'sunburst']) {
      expect(system).toContain(id);
    }
  });
});

describe('PRINT_DESIGN_SCHEMA layout and fills', () => {
  it('asks for a layout and for fills', () => {
    const { schema } = PRINT_DESIGN_SCHEMA;
    expect(schema.properties.layout).toEqual({ type: 'string', enum: ['editorial', 'bold'] });
    expect(schema.properties.palette.properties.fills).toEqual({ type: 'array', items: { type: 'string' } });
    expect(schema.required).toContain('layout');
    expect(schema.properties.palette.required).toContain('fills');
  });
});

describe('formatPaletteAudit', () => {
  it('names each change and the ratio that caused it', () => {
    expect(
      formatPaletteAudit([
        { role: 'primary', from: '#f654a6', to: '#d02d86', ratio: 2.961, floor: 4.5, kind: 'adjusted' },
        { role: 'ink', from: null, to: '#2b2620', ratio: null, floor: 4.5, kind: 'replaced' },
        { role: 'fills', from: 'pink', to: null, ratio: null, floor: null, kind: 'dropped' },
        { role: 'fills', from: null, to: null, ratio: null, floor: null, kind: 'dropped' },
      ])
    ).toBe(
      'primary #f654a6 (2.96:1 < 4.5) → #d02d86 | ink missing → #2b2620 | fills dropped "pink" | fills dropped (not a string)'
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run server/lib/printDesign.test.ts`
Expected: FAIL — `formatPaletteAudit` is not exported, the prompt still says "Never use neon", and the schema has no `layout`.

- [ ] **Step 3: Update the imports**

In `server/lib/printDesign.ts`, replace the `spec` import with:

```ts
import {
  auditPrintCopy,
  auditPrintPalette,
  FONT_PAIRINGS,
  MOTIFS,
  PRINT_LAYOUTS,
  sanitizePrintDesign,
  type PaletteAdjustment,
  type PrintDesignSpec,
} from '../../src/lib/printDesign/spec';
```

- [ ] **Step 4: Rewrite the palette brief**

In `buildDesignMessages`, replace the single array entry that begins `'- a seven-color palette as #rrggbb hex values. The page is PRINTED,` with these entries:

```ts
    "- a seven-color palette plus fills, as #rrggbb hex values. Match the traveler's theme request and do not tone it down:",
    '  - background is the page. Any color works. Light paper is the classic keepsake and the right default; go saturated or dark when the theme asks for it.',
    '  - ink (body text), muted (item details and times at small sizes), secondary (day dates and confirmation codes, small) and primary (titles, day numerals and small section labels) are all text on that page, and each needs 4.5:1 contrast against it. accent draws the item icons and hairlines and needs 3:1. Pastel text colors cannot pass on a light page, and dark text colors cannot pass on a dark one.',
    '  - A text color that misses its floor is moved lighter or darker at the same hue, so choose colors that already clear it.',
    '  - muted is a toned color from the theme, not a plain grey. Give primary, secondary and accent clearly different hues or depths.',
    '  - surface is a mat behind the cover photo and never carries text.',
    '  - fills are 2 to 4 colors for solid shapes: cover and closing panels, section bands, day-number badges. They have no contrast requirement against the page, so any brightness works, including neon when the theme calls for it. Text placed on a fill is colored automatically so it stays legible.',
    '- a layout: "editorial" (structure in type and hairline rules; quiet, and right for most trips) or "bold" (color panels, bands and badges built from the fills; for parties, pop, poster, playful, or anything loud).',
```

- [ ] **Step 5: Extend the schema**

In `PRINT_DESIGN_SCHEMA.schema`:

1. Change the top-level `required` array to:

```ts
    required: ['themeName', 'themeRationale', 'palette', 'layout', 'fontPairing', 'motif', 'cover', 'intro', 'dayCaptions', 'closing'],
```

2. In `palette`, change `required` to `['primary', 'secondary', 'background', 'surface', 'ink', 'muted', 'accent', 'fills']` and add this property after `accent: { type: 'string' },`:

```ts
          fills: { type: 'array', items: { type: 'string' } },
```

3. Add this property directly after the `palette: { ... },` property:

```ts
      layout: { type: 'string', enum: [...PRINT_LAYOUTS] },
```

- [ ] **Step 6: Log palette adjustments**

Add this exported helper directly above `export class PrintDesignError`:

```ts
/** One log line for everything resolvePalette changed in a model's palette. */
export function formatPaletteAudit(adjustments: PaletteAdjustment[]): string {
  return adjustments
    .map((a) => {
      if (a.kind === 'dropped') {
        return `fills dropped ${a.from === null ? '(not a string)' : JSON.stringify(a.from)}`;
      }
      if (a.kind === 'replaced') return `${a.role} missing → ${a.to}`;
      return `${a.role} ${a.from} (${(a.ratio ?? 0).toFixed(2)}:1 < ${a.floor}) → ${a.to}`;
    })
    .join(' | ');
}
```

In `generatePrintDesign`, directly after the `if (audits.length > 0) { ... }` block and before the `return`, add:

```ts
  // The same for colour: a text colour moved to clear its floor, or a fill that
  // was not a colour. A steady run of these on one role means the prompt drifted.
  const paletteAudit = auditPrintPalette(parsed);
  if (paletteAudit.length > 0) {
    console.warn('print-design palette adjusted:', formatPaletteAudit(paletteAudit));
  }
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run server/lib/printDesign.test.ts src/lib/printDesign`
Expected: PASS, including the existing strict-schema test.

Then type-check the server file directly (no tsconfig project includes `server/`, and these files use only relative imports):
`npx tsc --noEmit --skipLibCheck --target es2022 --module esnext --moduleResolution bundler server/lib/printDesign.ts 2>&1 | grep -E "server/lib/printDesign|src/lib/printDesign"`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add server/lib/printDesign.ts server/lib/printDesign.test.ts
git commit -m "feat: let the Print Studio model choose any page colour, fills and layout

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 6: Bold layout in the renderer

**Files:**
- Modify: `src/components/trip/print-studio/PrintDocument.tsx`
- Modify: `src/components/trip/print-studio/printDocument.css`
- Modify: `src/components/trip/print-studio/PrintDocument.test.tsx`
- Modify: `CLAUDE.md` (§23 "Output page" bullet)

**Interfaces:**
- Consumes (Tasks 2–3, via `@/lib/printDesign/spec`): `resolveFills(palette: PrintPalette): PrintFill[]`, `PrintDesignSpec.layout?: 'editorial' | 'bold'`, `sanitizePrintDesign`.
- Produces (DOM contract for CSS and tests):
  - `article.print-doc[data-layout="editorial" | "bold"]`
  - inline CSS vars on `.print-doc`: `--pd-fill-1`…`--pd-fill-4`, `--pd-on-fill-1`…`--pd-on-fill-4` (fills cycle when fewer than four)
  - `div.pd-cover-panel` wrapping the cover's eyebrow, title, tagline, route and dates
  - inline CSS vars on each `section.pd-day`: `--pd-day-fill`, `--pd-day-on-fill` from fill `i % fills.length`

- [ ] **Step 1: Write the failing tests**

Append to `src/components/trip/print-studio/PrintDocument.test.tsx`:

```tsx
describe('PrintDocument layouts', () => {
  const data = romeTrip();
  const dates = data.days.map((d) => d.date);
  const editorial = sanitizePrintDesign({}, dates);
  const bold = sanitizePrintDesign(
    { layout: 'bold', palette: { background: '#1b1030', fills: ['#ff00aa', '#00e5ff'] } },
    dates
  );
  const docOf = (container: HTMLElement) => container.querySelector<HTMLElement>('.print-doc')!;

  it('renders a design without a layout as editorial', () => {
    const { container } = render(<PrintDocument design={editorial} data={data} />);
    expect(docOf(container).getAttribute('data-layout')).toBe('editorial');
  });

  it('prints exactly the same words in the bold layout', () => {
    const plain = render(<PrintDocument design={editorial} data={data} />);
    const plainText = plain.container.textContent;
    plain.unmount();

    const loud = render(<PrintDocument design={bold} data={data} />);
    expect(docOf(loud.container).getAttribute('data-layout')).toBe('bold');
    expect(loud.container.textContent).toBe(plainText);
  });

  it('hands the fills to the stylesheet and cycles them through the days', () => {
    const { container } = render(<PrintDocument design={bold} data={data} />);
    const doc = docOf(container);
    expect(doc.style.getPropertyValue('--pd-fill-1')).toBe('#ff00aa');
    expect(doc.style.getPropertyValue('--pd-fill-2')).toBe('#00e5ff');
    expect(doc.style.getPropertyValue('--pd-fill-3')).toBe('#ff00aa');
    expect(doc.style.getPropertyValue('--pd-on-fill-1')).toBe(bold.palette.fills![0].text);

    const days = container.querySelectorAll<HTMLElement>('.pd-day');
    expect(days[0].style.getPropertyValue('--pd-day-fill')).toBe('#ff00aa');
    expect(days[1].style.getPropertyValue('--pd-day-fill')).toBe('#00e5ff');
    expect(days[1].style.getPropertyValue('--pd-day-on-fill')).toBe(bold.palette.fills![1].text);
  });

  it('borrows fills from the palette for an edition stored without them', () => {
    const { container } = render(<PrintDocument design={editorial} data={data} />);
    expect(docOf(container).style.getPropertyValue('--pd-fill-1')).toBe(editorial.palette.primary);
  });

  it('groups the cover title block so the bold layout can paint it as a panel', () => {
    const { container } = render(<PrintDocument design={bold} data={data} />);
    const panel = container.querySelector('.pd-cover-panel');
    expect(panel?.querySelector('.pd-cover-title')).not.toBeNull();
    expect(panel?.querySelector('.pd-eyebrow')).not.toBeNull();
  });
});
```

(`romeTrip` has two days, `2026-06-12` and `2026-06-13`, so `days[1]` exists.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/trip/print-studio/PrintDocument.test.tsx`
Expected: FAIL — `data-layout` is null, and `--pd-fill-1` is empty.

- [ ] **Step 3: Update `PrintDocument.tsx`**

1. Change the spec import to:

```tsx
import { getFontPairing, resolveFills, type PrintDesignSpec } from '@/lib/printDesign/spec';
```

2. Replace the `styleVars` declaration with:

```tsx
  const layout = design.layout ?? 'editorial';

  // Solid shape colours for the bold layout. Editions stored without fills
  // borrow primary, accent and secondary. Four slots, cycling when there are
  // fewer, so the stylesheet can always name --pd-fill-1 through -4.
  const fills = resolveFills(palette);
  const fillVars: Record<string, string> = {};
  for (let i = 0; i < 4; i++) {
    const fill = fills[i % fills.length];
    fillVars[`--pd-fill-${i + 1}`] = fill.color;
    fillVars[`--pd-on-fill-${i + 1}`] = fill.text;
  }

  // Each day takes the next fill, so the day badges and icon discs step
  // through the palette down the page.
  const dayFillVars = (index: number) => {
    const fill = fills[index % fills.length];
    return { '--pd-day-fill': fill.color, '--pd-day-on-fill': fill.text } as React.CSSProperties;
  };

  const styleVars = {
    '--pd-primary': palette.primary,
    '--pd-secondary': palette.secondary,
    '--pd-bg': palette.background,
    '--pd-surface': palette.surface,
    '--pd-ink': palette.ink,
    '--pd-muted': palette.muted,
    '--pd-accent': palette.accent,
    '--pd-display': pairing.display,
    '--pd-body': pairing.body,
    ...fillVars,
  } as React.CSSProperties;
```

3. Change the opening `<article>` tag to:

```tsx
    <article className="print-doc" data-layout={layout} style={styleVars} lang="en">
```

4. In the cover, wrap everything from `<p className="pd-eyebrow">` through the `{data.dateRange && ...}` line in a panel, so that part of the cover reads:

```tsx
          <MotifBand motif={design.motif} height={16} className="pd-cover-band" />
          <div className="pd-cover-panel">
            <p className="pd-eyebrow">WanderLuxe · Print Studio Edition</p>
            <h1 className="pd-cover-title">{copy('cover.title', design.cover.title)}</h1>
            {(design.cover.tagline || isEditing) && (
              <p className="pd-cover-tagline">{copy('cover.tagline', design.cover.tagline)}</p>
            )}
            {(design.cover.subtitle || isEditing) && (
              <div className="pd-cover-route">
                <span>{copy('cover.subtitle', design.cover.subtitle)}</span>
              </div>
            )}
            {data.dateRange && <p className="pd-cover-dates">{data.dateRange}</p>}
          </div>
```

5. Change the day section's opening tag to:

```tsx
              <section className="pd-day" key={day.date} style={dayFillVars(i)}>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/trip/print-studio/PrintDocument.test.tsx`
Expected: PASS (the existing money tests too).

- [ ] **Step 5: Add the cover panel base rule and update the stylesheet header**

In `src/components/trip/print-studio/printDocument.css`, replace the header comment (lines 1–10) with:

```css
/* Print Studio document — editorial and bold keepsake layouts.
 *
 * All colors and families arrive as CSS custom properties set inline by
 * PrintDocument from the AI design spec:
 *   --pd-primary --pd-secondary --pd-bg --pd-surface --pd-ink --pd-muted
 *   --pd-accent --pd-display --pd-body
 *   --pd-fill-1..4 and --pd-on-fill-1..4 (solid shapes, and the text on them)
 *   --pd-day-fill and --pd-day-on-fill (set on each day, cycling the fills)
 *
 * The editorial layout carries structure in typography and hairline rules.
 * The bold layout ([data-layout='bold'], at the end of this file) moves the
 * fills into panels, bands and badges. Both print their colour: .print-doc
 * sets print-color-adjust: exact.
 */
```

Directly after the `.pd-cover-band { ... }` rule, add:

```css
/* The cover's title block. Generates no box in the editorial layout, so the
   cover's flex column is exactly what it was; the bold layout paints it. */
.pd-cover-panel {
  display: contents;
}
```

- [ ] **Step 6: Add the bold layout block**

In `src/components/trip/print-studio/printDocument.css`, insert this block directly above the final `@page {` rule:

```css
/* =========================================================================
   Bold layout
   -------------------------------------------------------------------------
   The same document, with colour moved from hairlines into shapes. Every piece
   of text inside a shape takes that shape's on-fill colour, which the
   sanitizer chose to clear 4.5:1 against it. Text on the page keeps the
   palette's text roles, which clear their floors against the page. A fill is
   never used as a text colour: fills carry no floor against the page.
   ========================================================================= */

.print-doc[data-layout='bold'] .pd-cover-band {
  color: var(--pd-fill-2);
  opacity: 1;
  margin-bottom: 1.6rem;
}

.print-doc[data-layout='bold'] .pd-cover-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--pd-fill-1);
  color: var(--pd-on-fill-1);
  border-radius: 1.1rem;
  padding: 2.6rem 2.2rem 2.4rem;
  break-inside: avoid;
}

.print-doc[data-layout='bold'] .pd-cover-panel .pd-eyebrow,
.print-doc[data-layout='bold'] .pd-cover-panel .pd-cover-title,
.print-doc[data-layout='bold'] .pd-cover-panel .pd-cover-tagline,
.print-doc[data-layout='bold'] .pd-cover-panel .pd-cover-route span,
.print-doc[data-layout='bold'] .pd-cover-panel .pd-cover-dates {
  color: var(--pd-on-fill-1);
}

.print-doc[data-layout='bold'] .pd-cover-panel .pd-cover-route {
  align-self: stretch;
}

.print-doc[data-layout='bold'] .pd-cover-panel .pd-cover-route::before,
.print-doc[data-layout='bold'] .pd-cover-panel .pd-cover-route::after {
  border-top-color: color-mix(in srgb, var(--pd-on-fill-1) 45%, transparent);
}

.print-doc[data-layout='bold'] .pd-theme-plate {
  border-top: 3px solid var(--pd-fill-2);
}

.print-doc[data-layout='bold'] .pd-section-label::after {
  border-top: 2px solid var(--pd-fill-2);
}

.print-doc[data-layout='bold'] .pd-section-label span {
  background: var(--pd-fill-2);
  color: var(--pd-on-fill-2);
  padding: 0.45rem 0.9rem 0.4rem;
  border-radius: 999px;
}

.print-doc[data-layout='bold'] .pd-facts {
  border-block: 2px solid var(--pd-fill-2);
}

.print-doc[data-layout='bold'] .pd-day-head {
  border-top: 3px solid var(--pd-day-fill);
  padding-top: 1rem;
  align-items: center;
}

.print-doc[data-layout='bold'] .pd-day-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 3.2rem;
  height: 3.2rem;
  padding: 0 0.5rem;
  border-radius: 0.9rem;
  background: var(--pd-day-fill);
  color: var(--pd-day-on-fill);
  font-size: 1.7rem;
}

.print-doc[data-layout='bold'] .pd-item-icon {
  border: 0;
  background: var(--pd-day-fill);
  color: var(--pd-day-on-fill);
}

.print-doc[data-layout='bold'] .pd-table th {
  background: var(--pd-fill-3);
  color: var(--pd-on-fill-3);
  border-bottom: 0;
  padding: 0.5rem 0.6rem;
}

.print-doc[data-layout='bold'] .pd-table th:first-child {
  border-radius: 0.5rem 0 0 0.5rem;
}

.print-doc[data-layout='bold'] .pd-table th:last-child {
  border-radius: 0 0.5rem 0.5rem 0;
}

.print-doc[data-layout='bold'] .pd-table td {
  padding-left: 0.6rem;
}

.print-doc[data-layout='bold'] .pd-closing {
  background: var(--pd-fill-1);
  color: var(--pd-on-fill-1);
  border-radius: 1.1rem;
  padding: 2.6rem 2rem 2.2rem;
}

.print-doc[data-layout='bold'] .pd-closing-mark,
.print-doc[data-layout='bold'] .pd-closing-line,
.print-doc[data-layout='bold'] .pd-closing .pd-credit {
  color: var(--pd-on-fill-1);
}

/* Editing inside a panel: the accent hairline could vanish on a fill, so the
   affordance follows the text colour instead. */
.print-doc[data-layout='bold'] .pd-cover-panel .pd-edit-input,
.print-doc[data-layout='bold'] .pd-closing .pd-edit-input {
  box-shadow: inset 0 -1px 0 0 color-mix(in srgb, currentColor 55%, transparent);
}

.print-doc[data-layout='bold'] .pd-cover-panel .pd-edit-input:hover,
.print-doc[data-layout='bold'] .pd-closing .pd-edit-input:hover {
  background: color-mix(in srgb, currentColor 10%, transparent);
}

.print-doc[data-layout='bold'] .pd-cover-panel .pd-edit-input:focus,
.print-doc[data-layout='bold'] .pd-closing .pd-edit-input:focus {
  background: color-mix(in srgb, currentColor 14%, transparent);
  box-shadow: inset 0 -2px 0 0 currentColor;
}

.print-doc[data-layout='bold'] .pd-cover-panel .pd-edit[data-edited] .pd-edit-input,
.print-doc[data-layout='bold'] .pd-closing .pd-edit[data-edited] .pd-edit-input {
  box-shadow: inset 0 -1px 0 0 currentColor;
}

.print-doc[data-layout='bold'] .pd-cover-panel .pd-edit-input::placeholder,
.print-doc[data-layout='bold'] .pd-closing .pd-edit-input::placeholder,
.print-doc[data-layout='bold'] .pd-cover-panel .pd-edit-tools,
.print-doc[data-layout='bold'] .pd-closing .pd-edit-tools,
.print-doc[data-layout='bold'] .pd-cover-panel .pd-edit-revert,
.print-doc[data-layout='bold'] .pd-closing .pd-edit-revert {
  color: inherit;
}

@media (max-width: 40rem) {
  .print-doc[data-layout='bold'] .pd-cover-panel,
  .print-doc[data-layout='bold'] .pd-closing {
    padding: 2rem 1.25rem 1.8rem;
    border-radius: 0.9rem;
  }

  .print-doc[data-layout='bold'] .pd-day-num {
    min-width: 2.7rem;
    height: 2.7rem;
    font-size: 1.45rem;
  }
}

@media print {
  .print-doc[data-layout='bold'] .pd-cover-panel,
  .print-doc[data-layout='bold'] .pd-closing,
  .print-doc[data-layout='bold'] .pd-day-num {
    break-inside: avoid;
  }

  /* The panel editing rules above outrank the print reset in the editing
     block, so repeat it here: words print as words. */
  .print-doc[data-layout='bold'] .pd-edit-input {
    box-shadow: none;
    background: transparent;
  }
}
```

- [ ] **Step 7: Re-run the renderer and editing tests**

Run: `npx vitest run src/components/trip/print-studio src/lib/printDesign`
Expected: PASS.

Then: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "print-studio/PrintDocument"`
Expected: no output.

- [ ] **Step 8: Update CLAUDE.md**

In `CLAUDE.md` §23, in the bullet that starts `- **Output page**:`, replace the final sentence `Layout carries structure in type + hairline rules, not background fills, so it survives printers that drop backgrounds` with:

```markdown
Two layouts, chosen by the model per edition (`design.layout`; absent = editorial): **editorial** carries structure in type + hairline rules; **bold** (`[data-layout='bold']` in `printDocument.css`) paints the palette's fills into the cover and closing panels, section bands, day-number badges, item icons and table heads, and every piece of text inside a shape uses that fill's sanitizer-chosen text colour. `print-color-adjust: exact` makes both print their colour
```

- [ ] **Step 9: Commit**

```bash
git add src/components/trip/print-studio/PrintDocument.tsx src/components/trip/print-studio/printDocument.css src/components/trip/print-studio/PrintDocument.test.tsx CLAUDE.md
git commit -m "feat: add the bold Print Studio layout, with colour in panels and badges

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 7: Edition swatch shows fills

**Files:**
- Create: `src/components/trip/print-studio/swatch.ts`
- Create: `src/components/trip/print-studio/swatch.test.ts`
- Modify: `src/components/trip/print-studio/PrintStudioDialog.tsx` (import line and `PaletteSwatch`)

**Interfaces:**
- Consumes (Tasks 2–3, via `@/lib/printDesign/spec`): `FALLBACK_PALETTE`, type `PrintPalette` (with optional `fills`).
- Produces: `swatchColors(palette?: Partial<PrintPalette> | null): string[]` — always three colours.

- [ ] **Step 1: Write the failing test**

Create `src/components/trip/print-studio/swatch.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { swatchColors } from './swatch';
import { FALLBACK_PALETTE } from '@/lib/printDesign/spec';

const palette = {
  primary: '#1d3557',
  secondary: '#3d6f8e',
  background: '#fdfcf7',
  surface: '#f1ede2',
  ink: '#22252a',
  muted: '#5c6470',
  accent: '#c65f28',
};

describe('swatchColors', () => {
  it('shows primary, accent and secondary for an edition without fills', () => {
    expect(swatchColors(palette)).toEqual(['#1d3557', '#c65f28', '#3d6f8e']);
  });

  it('shows the first three fills when the edition has them', () => {
    const fills = ['#ff00aa', '#00e5ff', '#ffd400', '#7cff00'].map((color) => ({ color, text: '#000000' }));
    expect(swatchColors({ ...palette, fills })).toEqual(['#ff00aa', '#00e5ff', '#ffd400']);
  });

  it('repeats fills when there are fewer than three', () => {
    const fills = [{ color: '#ff00aa', text: '#000000' }, { color: '#00e5ff', text: '#000000' }];
    expect(swatchColors({ ...palette, fills })).toEqual(['#ff00aa', '#00e5ff', '#ff00aa']);
  });

  it('falls back to the house palette for a row with no design', () => {
    expect(swatchColors(undefined)).toEqual([
      FALLBACK_PALETTE.primary,
      FALLBACK_PALETTE.accent,
      FALLBACK_PALETTE.secondary,
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/trip/print-studio/swatch.test.ts`
Expected: FAIL — `Failed to resolve import "./swatch"`.

- [ ] **Step 3: Write the implementation**

Create `src/components/trip/print-studio/swatch.ts`:

```ts
// The colours in an edition's paint chip, in the Print Studio edition list.

import { FALLBACK_PALETTE, type PrintPalette } from '@/lib/printDesign/spec';

/**
 * Three bands. An edition with fills shows its first three (repeating when it
 * has fewer), since those are what a bold page is built from; any other
 * edition shows primary, accent and secondary, as the list always has.
 */
export function swatchColors(palette?: Partial<PrintPalette> | null): string[] {
  const fills = (palette?.fills ?? []).map((f) => f.color).filter(Boolean);
  if (fills.length > 0) return [0, 1, 2].map((i) => fills[i % fills.length]);
  return [
    palette?.primary ?? FALLBACK_PALETTE.primary,
    palette?.accent ?? FALLBACK_PALETTE.accent,
    palette?.secondary ?? FALLBACK_PALETTE.secondary,
  ];
}
```

- [ ] **Step 4: Use it in the dialog**

In `src/components/trip/print-studio/PrintStudioDialog.tsx`:

1. Replace `import { FALLBACK_PALETTE, type PrintDesignSpec } from '@/lib/printDesign/spec';` with:

```tsx
import type { PrintDesignSpec } from '@/lib/printDesign/spec';
import { swatchColors } from './swatch';
```

2. In `PaletteSwatch`, replace the array literal and its `.map(...)`:

```tsx
    {[
      palette?.primary ?? FALLBACK_PALETTE.primary,
      palette?.accent ?? FALLBACK_PALETTE.accent,
      palette?.secondary ?? FALLBACK_PALETTE.secondary,
    ].map((color, i) => (
```

with:

```tsx
    {swatchColors(palette).map((color, i) => (
```

If `FALLBACK_PALETTE` is referenced anywhere else in the file, keep it imported from `@/lib/printDesign/spec` alongside the type.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/components/trip/print-studio`
Expected: PASS, including `PrintStudioDialog.test.tsx`.

Then: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "print-studio/(swatch|PrintStudioDialog)"`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/components/trip/print-studio/swatch.ts src/components/trip/print-studio/swatch.test.ts src/components/trip/print-studio/PrintStudioDialog.tsx
git commit -m "feat: show an edition's fills in its Print Studio swatch

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## After all tasks (controller, not committed)

1. Full Print Studio suite: `npx vitest run src/lib/printDesign src/components/trip/print-studio server/lib/printDesign.test.ts` — expect everything to pass.
2. `npx eslint src/lib/printDesign src/components/trip/print-studio server/lib/printDesign.ts` — no new errors.
3. Visual check from the spec: regenerate the kid's-party and Tokyo themes with the new prompt, sanitize, render both layouts through `PrintDocument` in a scratch harness, and screenshot desktop, 375px and print emulation. Delete the harness afterwards.
