import { describe, expect, it } from 'vitest';
import { buildDroppedDayReport } from './tripWrites';

describe('buildDroppedDayReport', () => {
  const droppedDays = [
    { day_id: 'd1', date: '2026-09-14' },
    { day_id: 'd2', date: '2026-09-15' },
  ];

  it('summarizes activities, dining, and accommodation nights per dropped day', () => {
    const report = buildDroppedDayReport(droppedDays, {
      activities: [
        { day_id: 'd1', title: 'Louvre' },
        { day_id: 'd1', title: 'Seine cruise' },
      ],
      reservations: [{ day_id: 'd2', restaurant_name: 'Le Cinq' }],
      accommodationDays: [{ day_id: 'd1' }],
    });

    expect(report).toEqual([
      {
        date: '2026-09-14',
        activities: ['Louvre', 'Seine cruise'],
        dining: [],
        accommodation_nights: 1,
        total: 3,
      },
      {
        date: '2026-09-15',
        activities: [],
        dining: ['Le Cinq'],
        accommodation_nights: 0,
        total: 1,
      },
    ]);
  });

  it('returns zero-total entries for days with no content', () => {
    const report = buildDroppedDayReport(droppedDays, {
      activities: [],
      reservations: [],
      accommodationDays: [],
    });
    expect(report.every((r) => r.total === 0)).toBe(true);
    expect(report).toHaveLength(2);
  });
});
