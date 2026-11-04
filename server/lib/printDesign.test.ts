// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  buildTripPayload,
  buildDesignMessages,
  formatPaletteAudit,
  PRINT_DESIGN_SCHEMA,
  scrub,
  stripMoney,
  tripTiming,
  type PrintTripRows,
} from './printDesign';

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
    acts: [
      { day_id: 'd1', title: 'Acropolis', description: 'Sunset visit. Tickets are €20–€25 at the gate.', start_time: '17:00', end_time: '19:00', cost: 30 },
      { day_id: 'd2', title: 'Ferry', description: null, start_time: '08:00', end_time: null, cost: null },
    ],
    stays: [
      { hotel: 'Hotel Grande Bretagne', hotel_address: 'Syntagma Sq', hotel_checkin_date: '2026-06-01', hotel_checkout_date: '2026-06-03', hotel_phone: '+30 21 0333 0000', cost: 900 },
    ],
    trans: [
      { type: 'flight', provider: 'Aegean', flight_number: 'A3 601', confirmation_number: 'XK42PQ', departure_location: 'JFK', arrival_location: 'ATH', start_date: '2026-06-01', start_time: '09:00' },
    ],
    // reservation_time is a time-of-day column: the day comes from day_id.
    dine: [{ day_id: 'd2', restaurant_name: 'Ta Karamanlidika', reservation_time: '20:00', notes: 'Meze', number_of_people: 4 }],
    otherExpenses: [{ description: 'Gifts', cost: 120 }],
    ...overrides,
  };
}

type PayloadDay = {
  date: string;
  weekday: string;
  items: Array<{ title: string; time?: string; kind: string; notes?: string; details?: string }>;
};
const daysOf = (payload: Record<string, unknown>) => payload.days as PayloadDay[];

describe('buildTripPayload', () => {
  it('reads the trip through the same projection the page prints', () => {
    const { payload, dayDates } = buildTripPayload(rows(), '2026-05-01');
    expect(dayDates).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
    expect(payload.destination).toBe('Greece');
    expect(payload.dates).toBe('June 1–3, 2026');
    const days = daysOf(payload);
    expect(days.map((d) => d.weekday)).toEqual(['Monday', 'Tuesday', 'Wednesday']);
    expect(days[0].items.map((i) => i.title)).toEqual(['Flight to ATH', 'Hotel Grande Bretagne', 'Acropolis']);
    expect((payload.stays as unknown[]).length).toBe(1);
  });

  it('puts a reservation on its own day', () => {
    const days = daysOf(buildTripPayload(rows(), '2026-05-01').payload);
    expect(days[1].items.map((i) => i.title)).toContain('Ta Karamanlidika');
    expect(days[0].items.map((i) => i.title)).not.toContain('Ta Karamanlidika');
    expect(days[1].items.find((i) => i.title === 'Ta Karamanlidika')?.details).toBe('Party of 4');
  });

  it('tells the model whether the trip is ahead, under way or done', () => {
    expect(buildTripPayload(rows(), '2026-05-01').payload.timing).toBe('upcoming');
    expect(buildTripPayload(rows(), '2026-06-02').payload.timing).toBe('underway');
    expect(buildTripPayload(rows(), '2026-07-01').payload.timing).toBe('past');
    expect(tripTiming({ startDate: null, endDate: null }, '2026-01-01')).toBe('upcoming');
  });

  it('leaves money out of what the model sees, even in the traveler’s notes', () => {
    const { payload } = buildTripPayload(rows(), '2026-05-01');
    const json = JSON.stringify(payload);
    expect(payload).not.toHaveProperty('budget');
    expect(json).not.toContain('"cost"');
    expect(json).not.toMatch(/€|\b(20|25|30|900|120|4000)\b/);
    expect(daysOf(payload)[0].items.find((i) => i.title === 'Acropolis')?.notes).toBe('Sunset visit. Tickets are at the gate.');
  });

  it('keeps confirmation codes and phone numbers out of the copy brief', () => {
    const json = JSON.stringify(buildTripPayload(rows(), '2026-05-01').payload);
    expect(json).not.toContain('XK42PQ');
    expect(json).not.toContain('0333');
    expect(json).toContain('Aegean');
  });

  it('caps runaway trips at 40 days', () => {
    const manyDays = Array.from({ length: 80 }, (_, i) => ({
      day_id: `d${i}`,
      date: new Date(Date.UTC(2026, 5, 1 + i)).toISOString().slice(0, 10),
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

  it('strips amounts of money from free text', () => {
    expect(stripMoney('Around $20–$22.97 for adults (pricing may vary).')).toBe('Around for adults (pricing may vary).');
    expect(stripMoney('45 USD per car')).toBe('per car');
    expect(stripMoney('$5')).toBeUndefined();
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

  it('tells the model to keep prices out of the copy', () => {
    const { payload, dayDates } = buildTripPayload(rows());
    const [system] = buildDesignMessages(payload, dayDates, null);
    expect(system.content).toMatch(/never mention prices/i);
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

describe('the palette brief', () => {
  const systemPrompt = () => {
    const { payload, dayDates } = buildTripPayload(rows());
    return buildDesignMessages(payload, dayDates, null)[0].content;
  };

  it('lets the design pick any page colour and bright fills', () => {
    const system = systemPrompt();
    expect(system).not.toMatch(/never use neon/i);
    expect(system).not.toMatch(/near-white/i);
    expect(system).toContain('fills');
    expect(system).toContain('"editorial"');
    expect(system).toContain('"bold"');
    expect(system).toContain('primary, secondary, accent and the fills clearly different hues or depths');
  });

  it('still states the text floors', () => {
    const system = systemPrompt();
    expect(system).toContain('4.5:1');
    expect(system).toContain('3:1');
  });

  it('gives the model no hex colour to copy', () => {
    expect(systemPrompt()).not.toMatch(/#[0-9a-f]{6}\b/i);
  });

  it('offers the new typefaces and motifs', () => {
    const system = systemPrompt();
    for (const id of ['playful', 'poster', 'retro', 'grotesque', 'expanded', 'confetti', 'dots', 'sunburst']) {
      expect(system).toContain(id);
    }
  });

  it('can draw a holiday, and says what one looks like', () => {
    const system = systemPrompt();
    for (const id of ['holly', 'snowflakes', 'pines', 'ornaments', 'leaves', 'blossoms', 'citrus']) {
      expect(system).toContain(`"${id}"`);
    }
    expect(system).toMatch(/Christmas: deep red, evergreen and gold/);
    expect(system).toMatch(/Never add an unrelated colour/);
  });

  it('asks for the right tense and for captions that add to the schedule', () => {
    const system = systemPrompt();
    expect(system).toMatch(/Never write an upcoming trip as a memory/);
    expect(system).toMatch(/Never repeat a time the schedule prints/);
    expect(system).toMatch(/use its weekday from the data/);
  });
});

describe('PRINT_DESIGN_SCHEMA days', () => {
  it('asks for a headline, caption, place and feature flag per date', () => {
    const { schema } = PRINT_DESIGN_SCHEMA;
    expect(schema.required).toContain('days');
    expect(schema.properties.days.items.required).toEqual(['date', 'headline', 'caption', 'place', 'feature']);
    expect(schema.properties.days.items.properties.feature).toEqual({ type: 'boolean' });
    expect('dayCaptions' in schema.properties).toBe(false);
  });
});

describe('PRINT_DESIGN_SCHEMA layout and fills', () => {
  it('asks for a layout and for fills', () => {
    const { schema } = PRINT_DESIGN_SCHEMA;
    expect(schema.properties.layout).toEqual({ type: 'string', enum: ['editorial', 'bold'] });
    expect(schema.properties.palette.properties.fills).toEqual({ type: 'array', items: { type: 'string' } });
    expect(schema.required).toContain('layout');
    expect(schema.properties.palette.required).toContain('fills');
  });
});

describe('formatPaletteAudit', () => {
  it('names each change and the ratio that caused it', () => {
    expect(
      formatPaletteAudit([
        { role: 'primary', from: '#f654a6', to: '#d02d86', ratio: 2.961, floor: 4.5, kind: 'adjusted' },
        { role: 'ink', from: null, to: '#2b2620', ratio: null, floor: 4.5, kind: 'replaced' },
        { role: 'fills', from: 'pink', to: null, ratio: null, floor: null, kind: 'dropped' },
        { role: 'fills', from: null, to: null, ratio: null, floor: null, kind: 'dropped' },
      ])
    ).toBe(
      'primary #f654a6 (2.96:1 < 4.5) → #d02d86 | ink missing → #2b2620 | fills dropped "pink" | fills dropped (not a string)'
    );
  });
});

describe('scrub', () => {
  it('takes money out wherever it is written', () => {
    expect(scrub('Tickets USD 45 at the door')).toBe('Tickets at the door');
    expect(scrub('EUR 20 deposit')).toBe('deposit');
    expect(scrub('Dinner ($80 pp)')).toBe('Dinner (pp)');
  });

  it('takes out a booking reference typed into a note, and keeps ordinary words', () => {
    expect(scrub('Confirmation # YB9FMQ, two bags')).toBe(', two bags');
    expect(scrub('ref: 88213 for the transfer')).toBe('for the transfer');
    expect(scrub('Bring the booking details')).toBe('Bring the booking details');
  });

  it('scrubs titles and places as well as notes before the model reads them', () => {
    const { payload } = buildTripPayload(
      rows({ acts: [{ day_id: 'd1', title: 'Dinner ($80 pp)', description: 'Conf. AB12CD', start_time: '20:00' }] }),
      '2026-05-01'
    );
    const json = JSON.stringify(payload);
    expect(json).not.toContain('$80');
    expect(json).not.toContain('AB12CD');
  });
});
