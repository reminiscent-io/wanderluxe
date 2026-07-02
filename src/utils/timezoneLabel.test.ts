import { describe, it, expect } from 'vitest';
import { effectiveTz, tzAbbrev, shouldShowBadge, transportTzLabels, getTimezoneOptions } from './timezoneLabel';

describe('effectiveTz', () => {
  it('prefers the entity zone', () => {
    expect(effectiveTz('Europe/London', 'America/New_York')).toBe('Europe/London');
  });
  it('falls back to the trip zone on null/undefined', () => {
    expect(effectiveTz(null, 'America/New_York')).toBe('America/New_York');
    expect(effectiveTz(undefined, 'America/New_York')).toBe('America/New_York');
  });
  it('is null when both are unset', () => {
    expect(effectiveTz(null, null)).toBeNull();
  });
});

describe('tzAbbrev', () => {
  it('is DST-correct for America/New_York (EST in Jan, EDT in Jul)', () => {
    expect(tzAbbrev('America/New_York', '2026-01-15')).toBe('EST');
    expect(tzAbbrev('America/New_York', '2026-07-15')).toBe('EDT');
  });
  it('handles fixed-offset GMT+N zones', () => {
    // Etc/GMT+5 is UTC-5 (POSIX sign inversion); en-US renders "GMT-5"
    expect(tzAbbrev('Etc/GMT+5', '2026-07-15')).toBe('GMT-5');
  });
  it('changes across DST for Europe/London without throwing', () => {
    const jan = tzAbbrev('Europe/London', '2026-01-15');
    const jul = tzAbbrev('Europe/London', '2026-07-15');
    expect(jan).not.toBe('');
    expect(jul).not.toBe('');
    expect(jan).not.toBe(jul);
  });
  it('returns empty string on invalid zone or date', () => {
    expect(tzAbbrev('Not/AZone', '2026-07-15')).toBe('');
    expect(tzAbbrev('America/New_York', 'garbage')).toBe('');
    expect(tzAbbrev('', '2026-07-15')).toBe('');
  });
});

describe('shouldShowBadge', () => {
  it('is true when the effective zone differs from the trip zone', () => {
    expect(shouldShowBadge('Europe/London', 'America/New_York')).toBe(true);
  });
  it('is false when the entity inherits the trip zone', () => {
    expect(shouldShowBadge(null, 'America/New_York')).toBe(false);
  });
  it('is false when entity zone equals trip zone', () => {
    expect(shouldShowBadge('America/New_York', 'America/New_York')).toBe(false);
  });
  it('is true when only the entity zone is set (trip unresolved)', () => {
    expect(shouldShowBadge('Europe/London', null)).toBe(true);
  });
  it('is false when nothing is set', () => {
    expect(shouldShowBadge(null, null)).toBe(false);
  });
});

describe('transportTzLabels', () => {
  const trip = 'America/New_York';
  it('labels both endpoints when the two zones differ', () => {
    const r = transportTzLabels('America/New_York', 'Europe/London', trip, '2026-07-15');
    expect(r.dep).toBe('EDT');
    expect(r.arr).not.toBe('');
    expect(r.arr).not.toBe(r.dep);
  });
  it('labels both with the same abbrev when one foreign zone covers the leg', () => {
    const r = transportTzLabels('Europe/Paris', 'Europe/Paris', trip, '2026-07-15');
    expect(r.dep).not.toBe('');
    expect(r.arr).toBe(r.dep);
  });
  it('is empty when the leg inherits the trip zone', () => {
    expect(transportTzLabels(null, null, trip, '2026-07-15')).toEqual({ dep: '', arr: '' });
    expect(transportTzLabels(trip, trip, trip, '2026-07-15')).toEqual({ dep: '', arr: '' });
  });
});

describe('getTimezoneOptions', () => {
  it('returns a non-empty list containing common zones', () => {
    const zones = getTimezoneOptions();
    expect(zones.length).toBeGreaterThan(10);
    expect(zones).toContain('America/New_York');
    expect(zones).toContain('Europe/London');
  });
});
