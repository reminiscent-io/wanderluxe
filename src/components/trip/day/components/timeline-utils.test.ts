import { describe, it, expect } from 'vitest';
import { formatTimeRange, groupSimilarEvents, generateGroupTitle, type TimelineItem } from './timeline-utils';

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

describe('groupSimilarEvents', () => {
  const DAY = '2026-06-14';

  const item = (over: Partial<TimelineItem> & { id: string }): TimelineItem => ({
    type: 'activity',
    title: over.id,
    icon: null,
    ...over,
  });

  const flight = (id: string, time: string, from: string, to: string): TimelineItem =>
    item({ id, type: 'transportation', time, data: { type: 'flight', departure_location: from, arrival_location: to } as TimelineItem['data'] });

  it('does not group a true connection, which shares no common endpoint', () => {
    // JFK -> SJU -> SXM is one journey, but the rule matches on a shared arrival
    // or a shared departure, and a connection has neither: SJU is the first
    // flight's arrival and the second's departure. Documents current behaviour.
    const groups = groupSimilarEvents(
      [flight('a', '08:00', 'JFK (JFK)', 'SJU (SJU)'), flight('b', '11:30', 'SJU (SJU)', 'SXM (SXM)')],
      DAY,
    );
    expect(groups).toHaveLength(2);
  });

  it('groups two flights arriving at the same airport within the window', () => {
    const groups = groupSimilarEvents(
      [flight('a', '08:00', 'JFK (JFK)', 'SXM (SXM)'), flight('b', '10:00', 'BOS (BOS)', 'SXM (SXM)')],
      DAY,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(2);
    expect(generateGroupTitle(groups[0])).toBe('2 flights into SXM');
  });

  it('never groups activities, however close together', () => {
    const groups = groupSimilarEvents(
      [item({ id: 'a', time: '10:00' }), item({ id: 'b', time: '10:30' }), item({ id: 'c', time: '11:00' })],
      DAY,
    );
    expect(groups.map((g) => g.length)).toEqual([1, 1, 1]);
  });

  it('never groups dining', () => {
    const groups = groupSimilarEvents(
      [item({ id: 'a', type: 'dining', time: '12:00' }), item({ id: 'b', type: 'dining', time: '13:00' })],
      DAY,
    );
    expect(groups.map((g) => g.length)).toEqual([1, 1]);
  });

  it('does not group flights more than four hours apart', () => {
    const groups = groupSimilarEvents(
      [flight('a', '06:00', 'JFK (JFK)', 'SXM (SXM)'), flight('b', '14:00', 'BOS (BOS)', 'SXM (SXM)')],
      DAY,
    );
    expect(groups).toHaveLength(2);
  });

  it('does not group different transport modes', () => {
    const a = flight('a', '08:00', 'JFK (JFK)', 'SXM (SXM)');
    const b = item({ id: 'b', type: 'transportation', time: '09:00', data: { type: 'train', departure_location: 'BOS (BOS)', arrival_location: 'SXM (SXM)' } as TimelineItem['data'] });
    expect(groupSimilarEvents([a, b], DAY)).toHaveLength(2);
  });
});
