// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildTripPayload, buildDesignMessages, PRINT_DESIGN_SCHEMA, type PrintTripRows } from './printDesign';

function rows(overrides: Partial<PrintTripRows> = {}): PrintTripRows {
  return {
    trip: {
      destination: 'Greece',
      arrival_date: '2026-06-01',
      departure_date: '2026-06-03',
      timezone: 'Europe/Athens',
      budget: 4000,
    },
    days: [
      { day_id: 'd1', date: '2026-06-01', title: 'Athens', description: 'Arrival day' },
      { day_id: 'd2', date: '2026-06-02', title: null, description: null },
      { day_id: 'd3', date: '2026-06-03', title: 'Home', description: null },
    ],
    activities: [
      { day_id: 'd1', title: 'Acropolis', description: 'Sunset visit', start_time: '17:00', end_time: '19:00', cost: 30 },
      { day_id: 'd2', title: 'Ferry', description: null, start_time: '08:00', end_time: null, cost: null },
    ],
    stays: [
      { hotel: 'Hotel Grande Bretagne', hotel_address: 'Syntagma Sq', hotel_checkin_date: '2026-06-01', hotel_checkout_date: '2026-06-03', cost: 900 },
    ],
    transportation: [
      { type: 'flight', provider: 'Aegean', departure_location: 'JFK', arrival_location: 'ATH', start_date: '2026-06-01', start_time: '09:00' },
    ],
    reservations: [
      { restaurant_name: 'Ta Karamanlidika', reservation_time: '2026-06-01T20:00', notes: 'Meze' },
    ],
    otherExpenses: [{ description: 'Travel insurance', cost: 120 }],
    ...overrides,
  };
}

describe('buildTripPayload', () => {
  it('serializes every entity type and returns the day dates', () => {
    const { payload, dayDates } = buildTripPayload(rows());
    expect(dayDates).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
    expect(payload.destination).toBe('Greece');
    const days = payload.days as Array<{ date: unknown; activities: unknown[] }>;
    expect(days).toHaveLength(3);
    expect(days[0].activities).toHaveLength(1);
    expect((payload.accommodations as unknown[]).length).toBe(1);
    expect((payload.transportation as unknown[]).length).toBe(1);
    expect((payload.dining as unknown[]).length).toBe(1);
    expect((payload.other_expenses as unknown[]).length).toBe(1);
  });

  it('caps runaway trips at 40 days', () => {
    const manyDays = Array.from({ length: 80 }, (_, i) => ({
      day_id: `d${i}`,
      date: `2026-06-${String((i % 28) + 1).padStart(2, '0')}`,
      title: null,
      description: null,
    }));
    const { payload, dayDates } = buildTripPayload(rows({ days: manyDays }));
    expect(dayDates.length).toBe(40);
    expect((payload.days as unknown[]).length).toBe(40);
  });

  it('clamps long strings and collapses whitespace', () => {
    const { payload } = buildTripPayload(
      rows({ trip: { destination: `  Athens${' and beyond'.repeat(40)}  `, arrival_date: 'a', departure_date: 'b' } })
    );
    expect((payload.destination as string).length).toBeLessThanOrEqual(140);
    expect(payload.destination as string).not.toMatch(/^\s/);
  });
});

describe('buildDesignMessages', () => {
  it('marks a user theme as styling preference only', () => {
    const { payload, dayDates } = buildTripPayload(rows());
    const messages = buildDesignMessages(payload, dayDates, 'art deco riviera');
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('styling preference');
    expect(messages[1].content).toContain('THEME REQUEST');
    expect(messages[1].content).toContain('art deco riviera');
  });

  it('lists every trip date the model must caption', () => {
    const { payload, dayDates } = buildTripPayload(rows());
    const messages = buildDesignMessages(payload, dayDates, null);
    expect(messages[0].content).toContain('2026-06-01, 2026-06-02, 2026-06-03');
    expect(messages[1].content).not.toContain('THEME REQUEST');
  });
});

describe('PRINT_DESIGN_SCHEMA', () => {
  it('is strict: every object requires all of its properties', () => {
    const check = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const n = node as Record<string, unknown>;
      if (n.type === 'object') {
        expect(n.additionalProperties).toBe(false);
        const props = Object.keys((n.properties ?? {}) as object);
        expect((n.required as string[]).slice().sort()).toEqual(props.slice().sort());
        for (const child of Object.values((n.properties ?? {}) as Record<string, unknown>)) check(child);
      }
      if (n.type === 'array') check(n.items);
    };
    check(PRINT_DESIGN_SCHEMA.schema);
  });
});
