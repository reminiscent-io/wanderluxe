import { describe, it, expect } from 'vitest';
import {
  auditPrintCopy,
  auditPrintPalette,
  contrastRatio,
  FALLBACK_PALETTE,
  FONT_PAIRINGS,
  getFontPairing,
  isHexColor,
  MOTIF_NOTES,
  MOTIFS,
  namesWrongWeekday,
  PALETTE_FLOORS,
  relativeLuminance,
  sanitizePrintDesign,
  themeNameEndsInEdition,
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
    // The plate prints "The ___ Edition", so the fallback fills only the blank.
    expect(out.themeName).toBe('Traveler’s');
  });

  it('knows when a theme name already carries its own Edition', () => {
    expect(themeNameEndsInEdition('Sun-Bleached Edition')).toBe(true);
    expect(themeNameEndsInEdition('Harbour edition ')).toBe(true);
    expect(themeNameEndsInEdition('Traveler’s')).toBe(false);
    expect(themeNameEndsInEdition('Editions of Rome')).toBe(false);
    expect(themeNameEndsInEdition('Reedition')).toBe(false);
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

  it('offers playful and expressive pairings alongside the editorial ones', () => {
    for (const id of ['playful', 'poster', 'retro', 'grotesque', 'expanded']) {
      expect(getFontPairing(id).id).toBe(id);
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

describe('per-day copy: headlines, places, features', () => {
  // Friday through Monday.
  const WEEKEND = ['2026-12-18', '2026-12-19', '2026-12-20', '2026-12-21'];
  const raw = {
    ...VALID_RAW,
    days: [
      { date: '2026-12-18', headline: 'Lights at Sayville Falls', caption: 'The rental car still needs car seats.', place: 'Huntington', feature: false },
      { date: '2026-12-19', headline: 'Heckscher Park', caption: 'Coffee first, then the playground.', place: 'Huntington', feature: false },
      // The real failure: Dec 20, 2026 is a Sunday.
      { date: '2026-12-20', headline: 'Christmas Land', caption: 'Saturday brings Christmas Land at Deer Park.', place: 'Huntington', feature: true },
      { date: '2026-12-21', headline: 'Monday: flying home', caption: 'Return the car before the 3:02 flight.', place: 'Huntington', feature: true },
      { date: '2027-01-01', headline: 'Not a trip day', caption: 'Nope.', place: 'Nowhere', feature: true },
    ],
  };
  const spec = sanitizePrintDesign(raw, WEEKEND);

  it('folds the model’s days array into records keyed by date', () => {
    expect(spec.dayHeadlines).toEqual({
      '2026-12-18': 'Lights at Sayville Falls',
      '2026-12-19': 'Heckscher Park',
      '2026-12-20': 'Christmas Land',
      '2026-12-21': 'Monday: flying home',
    });
    expect(spec.dayPlaces?.['2026-12-18']).toBe('Huntington');
    expect(Object.keys(spec.dayPlaces ?? {})).toHaveLength(4);
  });

  it('drops a line that puts the day on the wrong weekday', () => {
    expect(spec.dayCaptions['2026-12-20']).toBeUndefined();
    expect(spec.dayCaptions['2026-12-18']).toBe('The rental car still needs car seats.');
    expect(namesWrongWeekday('Sunday breakfast, then the outlets.', '2026-12-20')).toBe(false);
    expect(namesWrongWeekday('Saturday brings Christmas Land.', '2026-12-20')).toBe(true);
    expect(namesWrongWeekday('The lights run Sundays 5 to 10.', '2026-12-19')).toBe(false);
  });

  it('keeps feature days to real dates, in date order, capped', () => {
    expect(spec.featureDays).toEqual(['2026-12-20', '2026-12-21']);
    const many = sanitizePrintDesign({ ...raw, featureDays: WEEKEND, days: [] }, WEEKEND);
    expect(many.featureDays).toEqual(['2026-12-18', '2026-12-19']);
  });

  it('drops a headline too long to set rather than cutting it', () => {
    const long = sanitizePrintDesign(
      { days: [{ date: '2026-12-18', headline: 'A headline that keeps on going well past the point any page could set it', caption: '', place: '', feature: false }] },
      WEEKEND
    );
    expect(long.dayHeadlines).toBeUndefined();
  });

  // Headlines are asked for in sentence case, so a capital mid-line is a name
  // ("Hyde Park Winter Wonderland" is a real fair) and lowercase is the model.
  it('holds sentence-case headlines to the house voice', () => {
    const slop = sanitizePrintDesign(
      { days: [{ date: '2026-12-18', headline: 'A winter wonderland awaits', caption: '', place: '', feature: false }] },
      WEEKEND
    );
    expect(slop.dayHeadlines).toBeUndefined();
  });

  it('drops trip copy that names a weekday the trip never reaches', () => {
    const wrong = sanitizePrintDesign({ ...VALID_RAW, intro: 'We land on Wednesday and drive north.' }, WEEKEND);
    expect(wrong.intro).toBe('');
    const right = sanitizePrintDesign({ ...VALID_RAW, intro: 'We land on Friday and drive north.' }, WEEKEND);
    expect(right.intro).toBe('We land on Friday and drive north.');
  });

  it('is idempotent with the new fields', () => {
    expect(sanitizePrintDesign(spec, WEEKEND)).toEqual(spec);
  });

  it('adds nothing to an edition stored before these fields existed', () => {
    const old = sanitizePrintDesign(VALID_RAW, DATES);
    expect('dayHeadlines' in old).toBe(false);
    expect('dayPlaces' in old).toBe(false);
    expect('featureDays' in old).toBe(false);
  });

  it('reports a wrong weekday in the copy audit', () => {
    const audit = auditPrintCopy(raw);
    expect(audit).toContainEqual({
      field: 'days.2026-12-20.caption',
      findings: [{ rule: 'wrong weekday', match: 'saturday on a Sunday' }],
    });
  });

  it('accepts the new seasonal motifs', () => {
    for (const motif of ['holly', 'snowflakes', 'pines', 'ornaments', 'leaves', 'blossoms', 'citrus']) {
      expect(sanitizePrintDesign({ ...VALID_RAW, motif }, DATES).motif).toBe(motif);
    }
    expect(MOTIFS.every((m) => typeof MOTIF_NOTES[m] === 'string')).toBe(true);
  });
});
