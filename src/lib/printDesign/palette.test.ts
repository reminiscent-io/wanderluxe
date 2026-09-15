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
    expect(adjustments.find((a) => a.role === 'ink')).toMatchObject({ from: 'nope', kind: 'replaced' });

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
