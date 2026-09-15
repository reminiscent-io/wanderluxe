import { describe, it, expect } from 'vitest';
import editions from './tokyoEditions.json';
import trip from './tokyoTrip.json';
import { sanitizePrintDesign, type PrintDesignSpec } from '@/lib/printDesign/spec';
import { findSlop } from '@/lib/printDesign/voice';

const specs = editions as unknown as PrintDesignSpec[];
const dayDates = (trip as { days: { date: string }[] }).days.map((d) => d.date);

describe('committed showcase editions', () => {
  it('ships three editions', () => {
    expect(specs).toHaveLength(3);
  });

  it('are already sanitized, so the landing page shows what the product would', () => {
    for (const spec of specs) {
      expect(sanitizePrintDesign(spec, dayDates)).toEqual(spec);
    }
  });

  it('carry no copy the house voice would drop', () => {
    for (const spec of specs) {
      const prose = [
        spec.themeName,
        spec.themeRationale,
        spec.cover.title,
        spec.cover.tagline,
        spec.intro,
        spec.closing,
        ...Object.values(spec.dayCaptions),
      ].filter(Boolean);
      for (const line of prose) {
        expect(findSlop(line), line).toEqual([]);
      }
    }
  });

  it('caption only real days of the sample trip', () => {
    for (const spec of specs) {
      for (const date of Object.keys(spec.dayCaptions)) {
        expect(dayDates).toContain(date);
      }
    }
  });

  it('ships a sample trip with items on every day', () => {
    const days = (trip as { days: { items: unknown[] }[] }).days;
    expect(days.length).toBeGreaterThan(1);
    for (const day of days) expect(day.items.length).toBeGreaterThan(0);
  });
});
