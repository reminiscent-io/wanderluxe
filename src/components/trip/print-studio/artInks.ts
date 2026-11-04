// Print Studio art — colour and placement data, kept apart from the drawings
// so art.tsx exports only components.
//
// Colour comes from the edition's own palette. Each motif names the hues its
// parts want (holly leaves near green, berries near red) and takes the nearest
// fill the design actually has, so the drawing reads right whatever order the
// model listed its fills in, and never uses a colour the edition did not choose.

import type { MotifId } from '@/lib/printDesign/spec';
import { contrastRatio, hexToOklch, isHexColor } from '@/lib/printDesign/color';

/** The colours one drawing is made of. */
export interface Inks {
  /** The main body: leaves, trees, baubles, flakes. */
  a: string;
  /** The second colour: berries, stars on trees, bands. */
  b: string;
  /** Small details: caps, trunks, centres. */
  c: string;
  /** Cut-outs and highlights, in the colour of the paper. */
  paper: string;
}

/** What the art may draw with, from the edition's palette. */
export interface ArtPalette {
  fills: string[];
  primary: string;
  secondary: string;
  accent: string;
  /** The page colour. */
  paper: string;
  /** Body text colour; the darkest ink an edition has. */
  ink: string;
}

/**
 * Target hues (OKLCH degrees) for each motif's a, b and c parts. null means
 * "any": the part takes fills in order. A motif absent here takes fills in
 * order for every part.
 */
const MOTIF_HUES: Partial<Record<MotifId, [number | null, number | null, number | null]>> = {
  holly: [150, 25, 85],
  pines: [150, 85, 30],
  ornaments: [null, 85, 85],
  snowflakes: [235, 200, null],
  stars: [85, null, null],
  leaves: [35, 60, 85],
  blossoms: [355, 85, 30],
  citrus: [100, 145, 60],
  waves: [235, 195, 85],
  palms: [145, 55, 85],
  mountains: [255, 220, 85],
  deco: [85, null, null],
  botanical: [145, 30, 85],
  sunburst: [85, 45, null],
};

/** Motifs that turn white on a coloured ground, the way snow does. */
const PAPER_ON_COLOUR: ReadonlySet<MotifId> = new Set(['snowflakes', 'stars']);

const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** The candidate nearest a hue, among colours with real colour in them. */
function nearestHue(candidates: string[], hue: number, avoid: Set<string>): string | null {
  let best: string | null = null;
  let bestGap = 61;
  for (const c of candidates) {
    if (avoid.has(c)) continue;
    const { C, h } = hexToOklch(c);
    if (C < 0.045) continue;
    const gap = hueGap(h, hue);
    if (gap < bestGap) {
      bestGap = gap;
      best = c;
    }
  }
  return best;
}

/** Whether a colour can be seen at all on a ground. */
const visibleOn = (color: string, ground: string) => contrastRatio(color, ground) >= 1.45;

/**
 * Choose a motif's inks from the palette, for drawing on `ground`.
 *
 * Each part takes the fill nearest its hue when one is within 60°, otherwise
 * the next fill in order. A part that would vanish into the ground takes
 * another candidate, and as a last resort the paper or the ink colour,
 * whichever stands out more.
 */
export function inksFor(motif: MotifId, palette: ArtPalette, ground: string = palette.paper): Inks {
  const candidates = [
    ...new Set([...palette.fills, palette.accent, palette.primary, palette.secondary].filter(isHexColor)),
  ];
  const hues = MOTIF_HUES[motif] ?? [null, null, null];
  const used = new Set<string>();
  const onColour = ground.toLowerCase() !== palette.paper.toLowerCase();
  const fallback = () =>
    contrastRatio(palette.paper, ground) >= contrastRatio(palette.ink, ground) ? palette.paper : palette.ink;

  const pick = (role: 0 | 1 | 2): string => {
    if (role === 0 && onColour && PAPER_ON_COLOUR.has(motif)) return palette.paper;
    const target = hues[role];
    let chosen = target === null ? null : nearestHue(candidates, target, used);
    if (!chosen || !visibleOn(chosen, ground)) {
      const open = candidates.filter((c) => !used.has(c) && visibleOn(c, ground));
      chosen = open[0] ?? null;
    }
    if (!chosen) chosen = fallback();
    used.add(chosen);
    return chosen;
  };

  return { a: pick(0), b: pick(1), c: pick(2), paper: palette.paper };
}

/** The palette's fills, or primary, accent and secondary for an edition stored without any. */
export function artPaletteOf(palette: {
  fills?: Array<{ color: string }>;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  ink: string;
}): ArtPalette {
  const fills = (palette.fills ?? []).map((fill) => fill.color);
  return {
    fills: fills.length > 0 ? fills : [palette.primary, palette.accent, palette.secondary],
    primary: palette.primary,
    secondary: palette.secondary,
    accent: palette.accent,
    paper: palette.background,
    ink: palette.ink,
  };
}

/* =========================================================================
   Seeded randomness — the same edition always draws the same page
   ========================================================================= */

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seeded(seed: string): () => number {
  let a = hashSeed(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How a motif lines up along an edge. */
export type FriezeMode = 'ground' | 'hang' | 'garland' | 'drift';

export const FRIEZE: Record<Exclude<MotifId, 'none'>, FriezeMode> = {
  holly: 'garland',
  snowflakes: 'drift',
  pines: 'ground',
  ornaments: 'hang',
  stars: 'drift',
  leaves: 'garland',
  blossoms: 'garland',
  citrus: 'garland',
  waves: 'ground',
  palms: 'ground',
  mountains: 'ground',
  deco: 'ground',
  botanical: 'garland',
  geometric: 'garland',
  confetti: 'drift',
  dots: 'drift',
  sunburst: 'drift',
};

/** Motifs that use only part of their box, scaled up when they stand along an edge. */
export const GROUND_SCALE: Partial<Record<Exclude<MotifId, 'none'>, number>> = { waves: 1.25, deco: 1.15 };

/**
 * How a motif sits along an edge. Things that stand ('ground') cannot hang
 * upside down from the top of a page, so a cover gives them corners instead.
 */
export function friezeMode(motif: MotifId): FriezeMode | null {
  return motif === 'none' ? null : FRIEZE[motif];
}
