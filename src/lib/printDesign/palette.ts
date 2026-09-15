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
