import { describe, it, expect } from 'vitest';
import {
  contrastRatio,
  FALLBACK_PALETTE,
  FONT_PAIRINGS,
  getFontPairing,
  isHexColor,
  relativeLuminance,
  sanitizePrintDesign,
} from './spec';

const DATES = ['2026-06-01', '2026-06-02', '2026-06-03'];

const VALID_RAW = {
  themeName: 'Aegean Deco',
  themeRationale: 'Island light and 1930s glamour.',
  palette: {
    primary: '#1d3557',
    secondary: '#3d6f8e',
    background: '#fdfcf7',
    surface: '#f1ede2',
    ink: '#22252a',
    muted: '#5c6470',
    accent: '#c65f28',
  },
  fontPairing: 'deco',
  motif: 'waves',
  cover: {
    title: 'Ten Days in the Aegean',
    subtitle: 'Athens · Santorini · Crete',
    tagline: 'Salt air, white stone, long lunches.',
  },
  intro: 'Welcome to the islands.',
  dayCaptions: { '2026-06-01': 'Arrival and a rooftop dinner.' },
  closing: 'Go slowly.',
};

describe('color math', () => {
  it('validates hex colors', () => {
    expect(isHexColor('#aabbcc')).toBe(true);
    expect(isHexColor('#ABC123')).toBe(true);
    expect(isHexColor('#abc')).toBe(false); // shorthand not accepted
    expect(isHexColor('aabbcc')).toBe(false);
    expect(isHexColor('#aabbcg')).toBe(false);
    expect(isHexColor(42)).toBe(false);
  });

  it('computes WCAG contrast (black on white = 21:1)', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 3);
  });

  it('luminance is 1 for white, 0 for black', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 3);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 3);
  });

  it('the fallback palette passes its own contrast gates', () => {
    const bg = FALLBACK_PALETTE.background;
    // Roles that set text clear AA; primary is display-only and accent is decorative.
    expect(contrastRatio(FALLBACK_PALETTE.ink, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(FALLBACK_PALETTE.muted, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(FALLBACK_PALETTE.secondary, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(FALLBACK_PALETTE.primary, bg)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(FALLBACK_PALETTE.accent, bg)).toBeGreaterThanOrEqual(3);
    expect(relativeLuminance(bg)).toBeGreaterThanOrEqual(0.5);
  });
});

describe('sanitizePrintDesign', () => {
  it('passes a well-formed spec through intact', () => {
    const spec = sanitizePrintDesign(VALID_RAW, DATES);
    expect(spec.themeName).toBe('Aegean Deco');
    expect(spec.palette.primary).toBe('#1d3557');
    expect(spec.fontPairing).toBe('deco');
    expect(spec.motif).toBe('waves');
    expect(spec.cover.title).toBe('Ten Days in the Aegean');
    expect(spec.dayCaptions['2026-06-01']).toBe('Arrival and a rooftop dinner.');
  });

  it('survives complete garbage with renderable fallbacks', () => {
    for (const raw of [null, undefined, 42, 'nope', [], {}]) {
      const spec = sanitizePrintDesign(raw, DATES);
      expect(spec.themeName).toBeTruthy();
      expect(spec.cover.title).toBeTruthy();
      expect(spec.closing).toBeTruthy();
      expect(spec.fontPairing).toBe('house');
      expect(spec.motif).toBe('none');
      expect(isHexColor(spec.palette.ink)).toBe(true);
      expect(contrastRatio(spec.palette.ink, spec.palette.background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('rejects a dark page background', () => {
    const spec = sanitizePrintDesign(
      { ...VALID_RAW, palette: { ...VALID_RAW.palette, background: '#101418' } },
      DATES
    );
    expect(spec.palette.background).toBe(FALLBACK_PALETTE.background);
  });

  it('replaces unreadable ink and muted colors', () => {
    const spec = sanitizePrintDesign(
      { ...VALID_RAW, palette: { ...VALID_RAW.palette, ink: '#eeeeee', muted: '#f0f0f0' } },
      DATES
    );
    expect(spec.palette.ink).toBe(FALLBACK_PALETTE.ink);
    expect(spec.palette.muted).toBe(FALLBACK_PALETTE.muted);
  });

  it('demotes a low-contrast primary to the ink color', () => {
    const spec = sanitizePrintDesign(
      { ...VALID_RAW, palette: { ...VALID_RAW.palette, primary: '#fdf3e0' } },
      DATES
    );
    expect(spec.palette.primary).toBe(spec.palette.ink);
  });

  it('normalizes hex casing', () => {
    const spec = sanitizePrintDesign(
      { ...VALID_RAW, palette: { ...VALID_RAW.palette, accent: '#C65F28' } },
      DATES
    );
    expect(spec.palette.accent).toBe('#c65f28');
  });

  it('demotes a low-contrast secondary to the primary hue, not to the neutral', () => {
    // Secondary sets 12px day dates and confirmation codes; a pale one is
    // unreadable. Demoting to primary keeps the page inside the model's theme.
    const spec = sanitizePrintDesign(
      { ...VALID_RAW, palette: { ...VALID_RAW.palette, secondary: '#cfe3f0' } },
      DATES
    );
    expect(spec.palette.secondary).toBe(spec.palette.primary);
    expect(contrastRatio(spec.palette.secondary, spec.palette.background)).toBeGreaterThanOrEqual(4.5);
  });

  it('demotes an accent that cannot draw a visible hairline', () => {
    const spec = sanitizePrintDesign(
      { ...VALID_RAW, palette: { ...VALID_RAW.palette, accent: '#f7e3d2' } },
      DATES
    );
    expect(spec.palette.accent).toBe(spec.palette.secondary);
    expect(contrastRatio(spec.palette.accent, spec.palette.background)).toBeGreaterThanOrEqual(3);
  });

  it('every text-bearing role clears AA no matter what the model returned', () => {
    const hostile = {
      ...VALID_RAW,
      palette: {
        primary: '#fefefe', secondary: '#fdfdfd', background: '#fffdf8',
        surface: '#ffffff', ink: '#fcfcfc', muted: '#fbfbfb', accent: '#fafafa',
      },
    };
    const { palette } = sanitizePrintDesign(hostile, DATES);
    for (const role of ['ink', 'muted', 'secondary'] as const) {
      expect(contrastRatio(palette[role], palette.background)).toBeGreaterThanOrEqual(4.5);
    }
    for (const role of ['primary', 'accent'] as const) {
      expect(contrastRatio(palette[role], palette.background)).toBeGreaterThanOrEqual(3);
    }
  });

  it('falls back on unknown pairing and motif ids', () => {
    const spec = sanitizePrintDesign({ ...VALID_RAW, fontPairing: 'comic-sans', motif: 'lasers' }, DATES);
    expect(spec.fontPairing).toBe('house');
    expect(spec.motif).toBe('none');
  });

  it('accepts the strict-schema array shape for dayCaptions', () => {
    const spec = sanitizePrintDesign(
      {
        ...VALID_RAW,
        dayCaptions: [
          { date: '2026-06-02', caption: 'Ferry to Santorini.' },
          { date: '2099-01-01', caption: 'Not a trip day.' },
          { date: '2026-06-03', caption: '' },
          'garbage',
        ],
      },
      DATES
    );
    expect(spec.dayCaptions).toEqual({ '2026-06-02': 'Ferry to Santorini.' });
  });

  it('drops captions for dates outside the trip', () => {
    const spec = sanitizePrintDesign(
      { ...VALID_RAW, dayCaptions: { '1999-01-01': 'stale', '2026-06-02': 'Ferry day.' } },
      DATES
    );
    expect(spec.dayCaptions).toEqual({ '2026-06-02': 'Ferry day.' });
  });

  it('clamps runaway copy with an ellipsis and collapses whitespace', () => {
    const spec = sanitizePrintDesign(
      { ...VALID_RAW, themeName: `A ${'very '.repeat(40)}long name`, intro: 'line\none\n\ntwo' },
      DATES
    );
    expect(spec.themeName.length).toBeLessThanOrEqual(60);
    expect(spec.themeName.endsWith('…')).toBe(true);
    expect(spec.intro).toBe('line one two');
  });
});

describe('font pairings', () => {
  it('resolves known ids and falls back to house', () => {
    expect(getFontPairing('deco').id).toBe('deco');
    expect(getFontPairing('nonsense').id).toBe('house');
  });

  it('every pairing has a display face, body face, and google query', () => {
    for (const p of FONT_PAIRINGS) {
      expect(p.display).toMatch(/'/);
      expect(p.body).toMatch(/'/);
      expect(p.googleQuery).toMatch(/^family=/);
    }
  });
});
