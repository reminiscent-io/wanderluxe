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
