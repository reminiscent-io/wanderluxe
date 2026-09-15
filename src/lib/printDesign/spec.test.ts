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
    for (const role of TEXT_ROLES) {
      expect(contrastRatio(FALLBACK_PALETTE[role], FALLBACK_PALETTE.background)).toBeGreaterThanOrEqual(
        PALETTE_FLOORS[role]
      );
    }
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
    expect(spec.palette).toEqual(VALID_RAW.palette);
    expect('layout' in spec).toBe(false);
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

  it('normalizes hex casing', () => {
    const spec = sanitizePrintDesign(
      { ...VALID_RAW, palette: { ...VALID_RAW.palette, accent: '#C65F28' } },
      DATES
    );
    expect(spec.palette.accent).toBe('#c65f28');
  });

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

  it('every text-bearing role clears AA no matter what the model returned', () => {
    const hostile = {
      ...VALID_RAW,
      palette: {
        primary: '#fefefe', secondary: '#fdfdfd', background: '#fffdf8',
        surface: '#ffffff', ink: '#fcfcfc', muted: '#fbfbfb', accent: '#fafafa',
      },
    };
    const { palette } = sanitizePrintDesign(hostile, DATES);
    for (const role of TEXT_ROLES) {
      expect(contrastRatio(palette[role], palette.background)).toBeGreaterThanOrEqual(PALETTE_FLOORS[role]);
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

describe('house voice', () => {
  const withCopy = (copy: Record<string, unknown>) =>
    sanitizePrintDesign({ ...VALID_RAW, ...copy }, DATES);

  it('drops a sloppy tagline rather than printing it', () => {
    const out = withCopy({ cover: { ...VALID_RAW.cover, tagline: 'An unforgettable tapestry of vibrant island life.' } });
    expect(out.cover.tagline).toBe('');
    // The rest of the design is untouched — one bad line is not a bad design.
    expect(out.cover.title).toBe('Ten Days in the Aegean');
    expect(out.palette.primary).toBe('#1d3557');
  });

  it('falls back on required copy slots instead of blanking them', () => {
    const out = withCopy({
      cover: { ...VALID_RAW.cover, title: 'Embark on a Transformative Escape' },
      closing: 'Ultimately, a journey of a lifetime.',
      themeName: 'Meticulous Realm',
    });
    expect(out.cover.title).toBe('The Itinerary');
    expect(out.closing).toBe('Safe travels.');
    expect(out.themeName).toBe('Traveler’s Edition');
  });

  it('drops only the captions that break the rules', () => {
    const out = sanitizePrintDesign(
      {
        ...VALID_RAW,
        dayCaptions: {
          '2026-06-01': 'Late lunch at Kiki’s, then the 6pm ferry.',
          '2026-06-02': 'A breathtaking day showcasing the island’s charm.',
        },
      },
      DATES
    );
    expect(out.dayCaptions['2026-06-01']).toBe('Late lunch at Kiki’s, then the 6pm ferry.');
    expect(out.dayCaptions['2026-06-02']).toBeUndefined();
  });

  it('never rejects the route line, which is the traveler’s own place names', () => {
    const out = withCopy({
      cover: { ...VALID_RAW.cover, subtitle: 'Foster City · The Beacon · Vibrant Coffee' },
    });
    expect(out.cover.subtitle).toBe('Foster City · The Beacon · Vibrant Coffee');
  });

  it('repairs em dashes instead of dropping the line', () => {
    const out = withCopy({ cover: { ...VALID_RAW.cover, tagline: 'Salt air — white stone — long lunches' } });
    expect(out.cover.tagline).toBe('Salt air, white stone, long lunches');
  });

  it('audits the raw response for logging without changing it', () => {
    const audit = auditPrintCopy({
      ...VALID_RAW,
      intro: 'A vibrant escape.',
      dayCaptions: { '2026-06-01': 'A testament to slow mornings.' },
    });
    expect(audit.map((a) => a.field)).toEqual(['intro', 'dayCaptions.2026-06-01']);
    expect(audit[0].findings[0]).toEqual({ rule: 'banned word', match: 'vibrant' });
  });

  it('reports nothing for copy that is already clean', () => {
    expect(auditPrintCopy(VALID_RAW)).toEqual([]);
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
