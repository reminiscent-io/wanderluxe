import { describe, it, expect } from 'vitest';
import { fmtMoney, fmtTime, minsFromTime, sanitizeFilename, formatType, fmtShort, fmtDate } from './format';

describe('fmtMoney', () => {
  it('formats with currency symbol and grouping', () => {
    expect(fmtMoney(1234.5, 'EUR')).toBe('€1,234.50');
    expect(fmtMoney(54, 'USD')).toBe('$54.00');
  });

  it('defaults to USD when currency is missing', () => {
    expect(fmtMoney(50, null)).toBe('$50.00');
    expect(fmtMoney(50, undefined)).toBe('$50.00');
  });

  it('falls back gracefully on invalid currency codes', () => {
    expect(fmtMoney(50, 'ZZZ@')).toBe('ZZZ@ 50.00');
  });
});

describe('fmtTime', () => {
  it('formats HH:mm to 12-hour', () => {
    expect(fmtTime('14:30')).toBe('2:30 PM');
    expect(fmtTime('08:05')).toBe('8:05 AM');
  });
  it('formats ISO datetimes', () => {
    expect(fmtTime('2026-06-12T08:00:00')).toBe('8:00 AM');
  });
  it('returns empty string for missing/garbage input', () => {
    expect(fmtTime(null)).toBe('');
    expect(fmtTime()).toBe('');
    expect(fmtTime('abc')).toBe('');
  });
});

describe('minsFromTime', () => {
  it('parses 12-hour strings to minutes from midnight', () => {
    expect(minsFromTime('8:05 am')).toBe(485);
    expect(minsFromTime('12:15 pm')).toBe(735);
  });
  it('returns 9999 sentinel for unparseable input (sorts last)', () => {
    expect(minsFromTime('All-day')).toBe(9999);
  });
});

describe('sanitizeFilename', () => {
  it('lowercases and collapses non-alphanumerics to single underscores', () => {
    expect(sanitizeFilename('Rome, Italy!')).toBe('rome_italy');
  });
  it('falls back to itinerary', () => {
    expect(sanitizeFilename(null)).toBe('itinerary');
  });
});

describe('formatType', () => {
  it('title-cases snake_case transport types', () => {
    expect(formatType('car_service')).toBe('Car Service');
    expect(formatType(null)).toBe('Transport');
  });
});

describe('date formatting', () => {
  it('formats short and long dates', () => {
    expect(fmtShort('2026-06-12')).toBe('Jun 12');
    expect(fmtDate('2026-06-12')).toBe('Friday, June 12, 2026');
  });
});
