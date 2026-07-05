import { describe, expect, it } from 'vitest';
import { dateRange, planDateChange } from './tripDates';

describe('dateRange', () => {
  it('returns an inclusive list of YYYY-MM-DD dates', () => {
    expect(dateRange('2026-09-14', '2026-09-16')).toEqual([
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
    ]);
  });

  it('returns a single date when start === end', () => {
    expect(dateRange('2026-09-14', '2026-09-14')).toEqual(['2026-09-14']);
  });

  it('crosses a month boundary correctly', () => {
    expect(dateRange('2026-01-31', '2026-02-02')).toEqual([
      '2026-01-31',
      '2026-02-01',
      '2026-02-02',
    ]);
  });

  it('is stable across a spring-forward DST date (UTC stepping)', () => {
    // US DST began 2026-03-08; UTC stepping must not skip or duplicate a day.
    expect(dateRange('2026-03-07', '2026-03-09')).toEqual([
      '2026-03-07',
      '2026-03-08',
      '2026-03-09',
    ]);
  });

  it('returns an empty array when start is after end', () => {
    expect(dateRange('2026-09-16', '2026-09-14')).toEqual([]);
  });
});

describe('planDateChange', () => {
  it('reports days to add and days to drop against the new range', () => {
    const existing = ['2026-09-14', '2026-09-15', '2026-09-16'];
    const target = ['2026-09-15', '2026-09-16', '2026-09-17'];
    expect(planDateChange(existing, target)).toEqual({
      toAdd: ['2026-09-17'],
      toDrop: ['2026-09-14'],
    });
  });

  it('reports only additions when the range only grows', () => {
    expect(planDateChange(['2026-09-14'], ['2026-09-14', '2026-09-15'])).toEqual({
      toAdd: ['2026-09-15'],
      toDrop: [],
    });
  });

  it('reports nothing when ranges are identical', () => {
    const same = ['2026-09-14', '2026-09-15'];
    expect(planDateChange(same, same)).toEqual({ toAdd: [], toDrop: [] });
  });
});
