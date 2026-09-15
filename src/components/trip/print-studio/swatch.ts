// The colours in an edition's paint chip, in the Print Studio edition list.

import { FALLBACK_PALETTE, type PrintDesignSpec, type PrintPalette } from '@/lib/printDesign/spec';

/**
 * Three bands. A bold edition's fills are what its page is actually painted
 * with, so its swatch shows the first three (repeating when it has fewer).
 * Every other edition — editorial, or no layout at all — never paints its
 * fills, so its swatch shows primary, accent and secondary instead, since
 * those are the colours its page actually carries.
 */
export function swatchColors(
  palette?: Partial<PrintPalette> | null,
  layout?: PrintDesignSpec['layout']
): string[] {
  const fills = layout === 'bold' ? (palette?.fills ?? []).map((f) => f.color).filter(Boolean) : [];
  if (fills.length > 0) return [0, 1, 2].map((i) => fills[i % fills.length]);
  return [
    palette?.primary ?? FALLBACK_PALETTE.primary,
    palette?.accent ?? FALLBACK_PALETTE.accent,
    palette?.secondary ?? FALLBACK_PALETTE.secondary,
  ];
}
