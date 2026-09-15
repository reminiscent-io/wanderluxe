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
