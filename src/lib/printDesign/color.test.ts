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
