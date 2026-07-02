import { describe, it, expect } from 'vitest';
import { formatTimeRange } from './timeline-utils';

describe('formatTimeRange with zone suffixes', () => {
  it('is unchanged with no suffixes', () => {
    expect(formatTimeRange('09:00', '14:30')).toBe('9:00 AM – 2:30 PM');
    expect(formatTimeRange('09:20', '11:45', true)).toBe('9:20 AM → 11:45 AM');
  });
  it('appends a suffix to a lone start time', () => {
    expect(formatTimeRange('09:00', undefined, false, 'EDT')).toBe('9:00 AM EDT');
  });
  it('appends per-endpoint suffixes on a range', () => {
    expect(formatTimeRange('23:00', '11:00', true, 'EDT', 'BST')).toBe('11:00 PM EDT → 11:00 AM BST');
  });
  it('appends only the end suffix when start suffix is empty', () => {
    expect(formatTimeRange('09:00', '14:30', false, '', 'EDT')).toBe('9:00 AM – 2:30 PM EDT');
  });
});
