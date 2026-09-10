import { describe, it, expect } from 'vitest';
import {
  sanitizeCopyOverrides,
  applyCopyOverrides,
  cleanUserCopy,
  countCopyEdits,
  originalCopy,
  EDITABLE_FIELDS,
  DAY_CAPTION_MAX,
} from './edits';
import { sanitizePrintDesign } from './spec';
import type { PrintDesignSpec } from './spec';

const DAYS = ['2026-06-01', '2026-06-02'];

function makeDesign(overrides: Partial<PrintDesignSpec> = {}): PrintDesignSpec {
  const base = sanitizePrintDesign(
    {
      themeName: 'Aegean Deco',
      themeRationale: 'Island light, drawn in straight lines.',
      cover: { title: 'Ten Days in the Aegean', subtitle: 'Athens · Naxos', tagline: 'Salt on everything.' },
      intro: 'You land at dusk and the heat is still coming off the stone.',
      dayCaptions: { '2026-06-01': 'Arrival, and a late dinner.' },
      closing: 'Safe travels.',
    },
    DAYS
  );
  return { ...base, ...overrides };
}

describe('cleanUserCopy', () => {
  it('collapses whitespace and trims', () => {
    expect(cleanUserCopy('  the   long   way  ', 80)).toBe('the long way');
  });

  it('strips control characters dragged in by a paste', () => {
    expect(cleanUserCopy('one\u0000two\u0007three', 80)).toBe('one two three');
    expect(cleanUserCopy('tab\tseparated', 80)).toBe('tab separated');
  });

  it('folds newlines into single spaces', () => {
    expect(cleanUserCopy('first line\nsecond line', 80)).toBe('first line second line');
  });

  it('clamps with an ellipsis at the limit', () => {
    const out = cleanUserCopy('x'.repeat(200), 20);
    expect(out).toHaveLength(20);
    expect(out?.endsWith('…')).toBe(true);
  });

  it('rejects non-strings so they fall through to the AI line', () => {
    expect(cleanUserCopy(42, 80)).toBeNull();
    expect(cleanUserCopy(null, 80)).toBeNull();
    expect(cleanUserCopy(undefined, 80)).toBeNull();
  });

  it('keeps an empty string, which means "print nothing"', () => {
    expect(cleanUserCopy('', 80)).toBe('');
  });
});

describe('the house voice does not apply to human writing', () => {
  // The whole point of the split from spec.ts's cleanCopy. If these ever start
  // coming back blank, the model's voice gate has leaked onto the traveler.
  const humanLines = [
    'The trip of a lifetime, honestly.',
    'A hidden gem we would go back to.',
    'It was an unforgettable journey — every single day.',
    'Nestled in the hills, and we embarked on the drive anyway.',
  ];

  it.each(humanLines)('keeps %j verbatim', (line) => {
    expect(cleanUserCopy(line, 600)).toBe(line);
  });

  it('survives the full override round trip', () => {
    const design = makeDesign();
    const overrides = sanitizeCopyOverrides({ intro: humanLines[2] }, DAYS);
    expect(applyCopyOverrides(design, overrides).intro).toBe(humanLines[2]);
  });
});

describe('sanitizeCopyOverrides', () => {
  it('drops unknown keys', () => {
    const out = sanitizeCopyOverrides({ 'cover.title': 'Kept', palette: 'nope', design: {} }, DAYS);
    expect(out).toEqual({ 'cover.title': 'Kept' });
  });

  it('keeps day captions only for real trip dates', () => {
    const out = sanitizeCopyOverrides(
      { 'day.2026-06-01': 'Kept', 'day.2026-12-25': 'Dropped' },
      DAYS
    );
    expect(out).toEqual({ 'day.2026-06-01': 'Kept' });
  });

  it('passes captions through when the trip shape is unknown', () => {
    const out = sanitizeCopyOverrides({ 'day.2026-12-25': 'Kept' }, []);
    expect(out).toEqual({ 'day.2026-12-25': 'Kept' });
  });

  it('clamps each field to its own maximum', () => {
    const long = 'y'.repeat(1000);
    const out = sanitizeCopyOverrides(
      { 'cover.title': long, intro: long, 'day.2026-06-01': long },
      DAYS
    );
    expect(out['cover.title']).toHaveLength(80);
    expect(out.intro).toHaveLength(600);
    expect(out['day.2026-06-01']).toHaveLength(DAY_CAPTION_MAX);
  });

  it('refuses non-object input', () => {
    expect(sanitizeCopyOverrides(null, DAYS)).toEqual({});
    expect(sanitizeCopyOverrides('a string', DAYS)).toEqual({});
    expect(sanitizeCopyOverrides(['an', 'array'], DAYS)).toEqual({});
  });

  it('ignores a bare day. prefix with no date', () => {
    expect(sanitizeCopyOverrides({ 'day.': 'nowhere' }, DAYS)).toEqual({});
  });

  it('returns a fresh object rather than the input', () => {
    const input = { 'cover.title': 'Kept' };
    expect(sanitizeCopyOverrides(input, DAYS)).not.toBe(input);
  });
});

describe('applyCopyOverrides', () => {
  it('returns the design untouched when there is nothing to apply', () => {
    const design = makeDesign();
    expect(applyCopyOverrides(design, {})).toBe(design);
    expect(applyCopyOverrides(design, null)).toBe(design);
  });

  it('layers the traveler over the AI', () => {
    const design = makeDesign();
    const out = applyCopyOverrides(design, { 'cover.title': 'Our Honeymoon' });
    expect(out.cover.title).toBe('Our Honeymoon');
    expect(out.cover.tagline).toBe(design.cover.tagline);
  });

  it('never touches palette, fonts or motif', () => {
    const design = makeDesign();
    const out = applyCopyOverrides(design, { 'cover.title': 'Anything', intro: 'At all' });
    expect(out.palette).toEqual(design.palette);
    expect(out.fontPairing).toBe(design.fontPairing);
    expect(out.motif).toBe(design.motif);
  });

  it('lets a blank delete an optional line', () => {
    const out = applyCopyOverrides(makeDesign(), { 'cover.tagline': '' });
    expect(out.cover.tagline).toBe('');
  });

  it('falls back rather than printing an empty cover title', () => {
    const design = makeDesign();
    const out = applyCopyOverrides(design, { 'cover.title': '' });
    expect(out.cover.title).toBe(design.cover.title);
  });

  it('falls back for every required field', () => {
    const design = makeDesign();
    for (const field of EDITABLE_FIELDS.filter((f) => f.required)) {
      const out = applyCopyOverrides(design, { [field.key]: '' });
      expect(originalCopy(out, field.key)).toBe(originalCopy(design, field.key));
    }
  });

  it('adds, replaces and removes day captions', () => {
    const design = makeDesign();
    const out = applyCopyOverrides(design, {
      'day.2026-06-01': '',
      'day.2026-06-02': 'The long drive north.',
    });
    expect(out.dayCaptions['2026-06-01']).toBeUndefined();
    expect(out.dayCaptions['2026-06-02']).toBe('The long drive north.');
  });

  it('does not mutate the design it was given', () => {
    const design = makeDesign();
    const before = JSON.stringify(design);
    applyCopyOverrides(design, { 'cover.title': 'Changed', 'day.2026-06-01': 'Changed' });
    expect(JSON.stringify(design)).toBe(before);
  });
});

describe('countCopyEdits', () => {
  it('counts only fields that actually differ', () => {
    const design = makeDesign();
    expect(countCopyEdits(design, null)).toBe(0);
    expect(countCopyEdits(design, { 'cover.title': design.cover.title })).toBe(0);
    expect(countCopyEdits(design, { 'cover.title': 'Different' })).toBe(1);
    expect(countCopyEdits(design, { 'cover.title': 'Different', intro: 'Also different' })).toBe(2);
  });
});

describe('field registry', () => {
  it('matches the clamps sanitizePrintDesign applies to the model', () => {
    // If spec.ts ever loosens a limit, an edit could be clamped tighter than
    // the AI line it replaces, which would read as text going missing.
    const expected: Record<string, number> = {
      themeName: 60,
      themeRationale: 240,
      'cover.title': 80,
      'cover.subtitle': 120,
      'cover.tagline': 160,
      intro: 600,
      closing: 200,
    };
    for (const field of EDITABLE_FIELDS) {
      expect(field.max).toBe(expected[field.key]);
    }
  });

  it('has a unique key per field', () => {
    const keys = EDITABLE_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
