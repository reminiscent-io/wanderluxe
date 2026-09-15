import { describe, it, expect } from 'vitest';
import { SAMPLE_TEASER_DESIGN, teaserDesign } from './sample';
import { sanitizePrintDesign } from './spec';
import { findSlop } from './voice';

describe('SAMPLE_TEASER_DESIGN', () => {
  it('survives the sanitizer unchanged, so the preview shows what it claims', () => {
    expect(sanitizePrintDesign(SAMPLE_TEASER_DESIGN, [])).toEqual(SAMPLE_TEASER_DESIGN);
  });

  it('invents no prose: every optional copy slot is empty', () => {
    expect(SAMPLE_TEASER_DESIGN.cover.tagline).toBe('');
    expect(SAMPLE_TEASER_DESIGN.cover.subtitle).toBe('');
    expect(SAMPLE_TEASER_DESIGN.themeRationale).toBe('');
    expect(SAMPLE_TEASER_DESIGN.intro).toBe('');
    expect(SAMPLE_TEASER_DESIGN.dayCaptions).toEqual({});
  });

  it('clears the house voice on the copy it does set', () => {
    expect(findSlop(SAMPLE_TEASER_DESIGN.themeName)).toEqual([]);
    expect(findSlop(SAMPLE_TEASER_DESIGN.closing)).toEqual([]);
  });

  it('reads as a different design from the Simple PDF', () => {
    expect(SAMPLE_TEASER_DESIGN.fontPairing).toBe('editorial');
    expect(SAMPLE_TEASER_DESIGN.motif).toBe('waves');
  });
});

describe('teaserDesign', () => {
  it('titles the cover with the trip destination', () => {
    expect(teaserDesign('Lisbon').cover.title).toBe('Lisbon');
  });

  it('falls back to the sample title when there is no destination', () => {
    expect(teaserDesign().cover.title).toBe(SAMPLE_TEASER_DESIGN.cover.title);
    expect(teaserDesign('   ').cover.title).toBe(SAMPLE_TEASER_DESIGN.cover.title);
  });

  it('changes nothing else about the design', () => {
    const { cover, ...rest } = teaserDesign('Lisbon');
    const { cover: sampleCover, ...sampleRest } = SAMPLE_TEASER_DESIGN;
    expect(rest).toEqual(sampleRest);
    expect(cover.tagline).toBe(sampleCover.tagline);
  });
});
