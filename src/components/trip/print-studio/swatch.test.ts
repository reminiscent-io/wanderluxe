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
