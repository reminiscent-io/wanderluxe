import { describe, expect, it } from 'vitest';
import { analyzeTrip, describePlan, legsOf, lengthOf, planEdition, type PlanPage } from './plan';
import type { PrintDay, PrintItem, PrintTrip } from './trip';
import { buildPrintTrip } from './trip';

/* --------------------------------------------------------------- fixtures */

const item = (title: string, notes?: string): PrintItem => ({
  kind: 'activity',
  title,
  time: '9:00 AM',
  endTime: '',
  notes,
  links: [],
  facts: [],
  sortKey: 540,
});

const LONG_NOTE = 'Bring the tickets, arrive early, the line wraps around the block by ten. '.repeat(3);

/** n items per day; "heavy" items carry a paragraph of notes. */
function makeTrip(spec: Array<number | 'heavy' | 'open'>, extra: Partial<PrintTrip> = {}): PrintTrip {
  const days: PrintDay[] = spec.map((s, i) => {
    const date = `2026-06-${String(i + 1).padStart(2, '0')}`;
    const items =
      s === 'open' ? [] : s === 'heavy' ? Array.from({ length: 9 }, (_, k) => item(`Plan ${k}`, LONG_NOTE)) : Array.from({ length: s }, (_, k) => item(`Plan ${k}`));
    return { date, index: i, weekday: 'Monday', items };
  });
  return {
    destination: 'Somewhere',
    startDate: days[0]?.date ?? null,
    endDate: days[days.length - 1]?.date ?? null,
    dateRange: '',
    nights: Math.max(0, days.length - 1),
    timezone: null,
    days,
    stays: [],
    journeys: [],
    reservations: [],
    budget: { budget: null, categories: [], total: 0 },
    ...extra,
  };
}

const kinds = (pages: PlanPage[]) =>
  pages.map((p) => {
    if (p.kind === 'day') return p.parts > 1 ? `day${p.day}.${p.part}` : `day${p.day}`;
    if (p.kind === 'pair') return `pair${p.days[0]}+${p.days[1]}`;
    if (p.kind === 'chapter') return `chapter${p.leg}`;
    if (p.kind === 'overview') return p.details ? 'overview+details' : p.parts > 1 ? `overview.${p.part}` : 'overview';
    if (p.kind === 'details') return p.parts > 1 ? `details.${p.part}` : 'details';
    return p.kind;
  });

const NO_DESIGN = {};

/* ------------------------------------------------------------------ tests */

describe('length', () => {
  it('names the trip length', () => {
    expect([1, 2, 3, 4, 8, 9, 16, 17].map(lengthOf)).toEqual(['single', 'short', 'short', 'week', 'week', 'long', 'long', 'epic']);
  });

  it('gives a day trip a cover, its day and a back page, and no overview', () => {
    expect(kinds(planEdition(makeTrip([3]), NO_DESIGN).pages)).toEqual(['cover', 'day0', 'back']);
  });

  it('gives a short trip a page a day, however light', () => {
    expect(kinds(planEdition(makeTrip([1, 1, 1]), NO_DESIGN).pages)).toEqual(['cover', 'overview', 'day0', 'day1', 'day2', 'back']);
  });
});

describe('density', () => {
  it('weighs each day by what it holds', () => {
    const a = analyzeTrip(makeTrip(['open', 1, 6, 'heavy']), NO_DESIGN);
    expect(a.days.map((d) => d.density)).toEqual(['open', 'light', 'full', 'packed']);
    expect(a.busiest).toBe(3);
    expect(a.itemCount).toBe(16);
  });

  it('pairs light neighbours on a week-long trip and gives full days their own page', () => {
    const plan = planEdition(makeTrip([1, 1, 6, 1, 'open', 6]), NO_DESIGN);
    expect(kinds(plan.pages)).toEqual(['cover', 'overview', 'pair0+1', 'day2', 'pair3+4', 'day5', 'back']);
  });

  it('never pairs a feature day', () => {
    const trip = makeTrip([1, 1, 1, 1]);
    const plan = planEdition(trip, { featureDays: [trip.days[1].date] });
    expect(kinds(plan.pages)).toEqual(['cover', 'overview', 'day0', 'day1', 'pair2+3', 'back']);
    expect(plan.pages.find((p) => p.kind === 'day' && p.day === 1)).toMatchObject({ feature: true });
  });

  it('gives a day with the traveler’s own photo a page of its own', () => {
    const trip = makeTrip([1, 1, 1, 1]);
    trip.days[0].image = { url: 'https://example.com/a.jpg' };
    expect(kinds(planEdition(trip, NO_DESIGN).pages)).toEqual(['cover', 'overview', 'day0', 'pair1+2', 'day3', 'back']);
  });
});

describe('fit feedback', () => {
  it('stops pairing two days that did not fit on one sheet', () => {
    const trip = makeTrip([1, 1, 1, 1]);
    const plan = planEdition(trip, NO_DESIGN, { feedback: [`solo:${trip.days[0].date}`] });
    expect(kinds(plan.pages)).toEqual(['cover', 'overview', 'day0', 'pair1+2', 'day3', 'back']);
  });

  it('breaks a day only where the renderer said it ran out of paper', () => {
    const trip = makeTrip([2, 'heavy', 2]);
    const date = trip.days[1].date;
    const plan = planEdition(trip, NO_DESIGN, { feedback: [`break:day:${date}:4`, `break:day:${date}:7`] });
    const parts = plan.pages.filter((p) => p.kind === 'day' && p.day === 1);
    expect(parts).toEqual([
      { kind: 'day', day: 1, from: 0, to: 4, part: 1, parts: 3, feature: false, tight: false },
      { kind: 'day', day: 1, from: 4, to: 7, part: 2, parts: 3, feature: false, tight: false },
      { kind: 'day', day: 1, from: 7, to: 9, part: 3, parts: 3, feature: false, tight: false },
    ]);
    // Page numbers count the cover: the busy day starts on page 4.
    expect(plan.dayPages).toEqual([3, 4, 7]);
  });

  it('tightens a day and compacts the overview before splitting either', () => {
    const trip = makeTrip([2, 2, 2]);
    const plan = planEdition(trip, NO_DESIGN, { feedback: [`tight:${trip.days[1].date}`, 'compact:overview'] });
    expect(plan.pages.find((p) => p.kind === 'day' && p.day === 1)).toMatchObject({ tight: true, parts: 1 });
    expect(plan.pages.find((p) => p.kind === 'day' && p.day === 0)).toMatchObject({ tight: false });
    expect(plan.pages.find((p) => p.kind === 'overview')).toMatchObject({ compact: true, parts: 1 });
  });

  it('ignores breaks outside the day', () => {
    const trip = makeTrip([3]);
    const plan = planEdition(trip, NO_DESIGN, { feedback: [`break:day:${trip.days[0].date}:0`, `break:day:${trip.days[0].date}:99`] });
    expect(kinds(plan.pages)).toEqual(['cover', 'day0', 'back']);
  });

  it('runs the overview over two pages when its rows overflow', () => {
    const plan = planEdition(makeTrip(new Array(20).fill(1)), NO_DESIGN, { feedback: ['break:overview:12'] });
    expect(plan.pages.filter((p) => p.kind === 'overview')).toEqual([
      { kind: 'overview', from: 0, to: 12, part: 1, parts: 2, details: false, compact: false },
      { kind: 'overview', from: 12, to: 20, part: 2, parts: 2, details: false, compact: false },
    ]);
  });
});

describe('locations', () => {
  const places = (trip: PrintTrip, names: string[]) =>
    Object.fromEntries(trip.days.map((d, i) => [d.date, names[i]]));

  it('makes one leg of a trip with no places', () => {
    expect(legsOf(makeTrip([1, 1, 1]), NO_DESIGN)).toEqual([{ place: '', from: 0, to: 2 }]);
  });

  it('groups consecutive days in one place and fills gaps from the neighbours', () => {
    const trip = makeTrip([1, 1, 1, 1, 1]);
    expect(legsOf(trip, { dayPlaces: places(trip, ['', 'Athens', '', 'santorini', 'Santorini']) })).toEqual([
      { place: 'Athens', from: 0, to: 2 },
      { place: 'santorini', from: 3, to: 4 },
    ]);
  });

  it('opens each long leg of a long trip with a chapter, and never pairs across places', () => {
    const trip = makeTrip([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const plan = planEdition(trip, {
      dayPlaces: places(trip, ['Edinburgh', 'Edinburgh', 'Edinburgh', 'Fort William', 'Fort William', 'Gleneagles', 'Gleneagles', 'Gleneagles', 'Gleneagles']),
    });
    expect(kinds(plan.pages)).toEqual([
      'cover', 'overview',
      'chapter0', 'pair0+1', 'day2',
      'pair3+4',
      'chapter2', 'pair5+6', 'pair7+8',
      'back',
    ]);
    // Fort William is two days: marked on its first day, no chapter page.
    expect(plan.legBanners).toEqual([false, true, false]);
  });

  it('marks places on the day itself on a trip too short for chapters, and still pairs light days', () => {
    const trip = makeTrip([1, 1, 6, 1, 1, 1, 1]);
    const plan = planEdition(trip, {
      dayPlaces: places(trip, ['San Francisco', 'San Francisco', 'St. Helena', 'St. Helena', 'Palo Alto', 'Palo Alto', 'Palo Alto']),
    });
    expect(plan.pages.some((p) => p.kind === 'chapter')).toBe(false);
    expect(plan.legBanners).toEqual([true, true, true]);
    expect(kinds(plan.pages)).toEqual(['cover', 'overview', 'pair0+1', 'day2', 'day3', 'pair4+5', 'day6', 'back']);
  });

  it('stops signposting a trip that changes place every day', () => {
    const trip = makeTrip(new Array(10).fill(1));
    const plan = planEdition(trip, { dayPlaces: places(trip, trip.days.map((_, i) => `Town ${i}`)) });
    expect(plan.analysis.legs).toHaveLength(10);
    expect(plan.pages.some((p) => p.kind === 'chapter')).toBe(false);
    expect(plan.legBanners.every((b) => !b)).toBe(true);
  });
});

describe('bookings, ledger and back', () => {
  const journey = { mode: 'flight' as const, label: 'Flight', date: '2026-06-01', time: '9:00 AM', endTime: '', confirmation: 'ABC123' };

  it('puts a few bookings on the overview and leaves out bookings with nothing to look up', () => {
    const plain = makeTrip([1, 1, 1], { journeys: [{ ...journey, confirmation: undefined }] });
    expect(planEdition(plain, NO_DESIGN).detailRows).toEqual([]);
    const coded = makeTrip([1, 1, 1], { journeys: [journey] });
    expect(kinds(planEdition(coded, NO_DESIGN).pages)).toEqual(['cover', 'overview+details', 'day0', 'day1', 'day2', 'back']);
  });

  it('gives bookings their own page when the overview could not hold them', () => {
    const trip = makeTrip([1, 1, 1], { journeys: [journey] });
    expect(kinds(planEdition(trip, NO_DESIGN, { feedback: ['details:own'] }).pages)).toEqual([
      'cover', 'overview', 'day0', 'day1', 'day2', 'details', 'back',
    ]);
  });

  it('adds the Ledger only when asked and when there is money to show', () => {
    const trip = makeTrip([1, 1], { budget: { budget: 900, categories: [], total: 0 } });
    expect(kinds(planEdition(trip, NO_DESIGN).pages)).not.toContain('ledger');
    expect(kinds(planEdition(trip, NO_DESIGN, { showBudget: true }).pages)).toEqual(['cover', 'overview', 'day0', 'day1', 'ledger', 'back']);
    expect(kinds(planEdition(makeTrip([1, 1]), NO_DESIGN, { showBudget: true }).pages)).not.toContain('ledger');
  });
});

describe('a real-shaped trip', () => {
  it('lays a four-day holiday weekend out as one page a day with the flights on the overview', () => {
    const D = ['a', 'b', 'c', 'd'];
    const trip = buildPrintTrip({
      trip: { destination: 'Holiday', arrival_date: '2026-12-18', departure_date: '2026-12-21' },
      days: D.map((day_id, i) => ({ day_id, date: `2026-12-${18 + i}` })),
      stays: [],
      trans: [
        { type: 'flight', provider: 'Example Air', flight_number: 'EX1', confirmation_number: 'CODE1', departure_location: 'Home (RDU)', arrival_location: 'Island (ISP)', start_date: '2026-12-18', start_time: '12:50', end_time: '14:22', details: 'Fare: Nicer. 1h 32m.' },
        { type: 'rental_car', departure_location: 'Island (ISP)', arrival_location: 'Island (ISP)', start_date: '2026-12-18', end_date: '2026-12-21', start_time: '14:45', end_time: '13:30', details: 'Not booked yet. Needs two car seats; pick up after the flight lands and return before the flight home leaves.' },
        { type: 'flight', provider: 'Example Air', flight_number: 'EX2', confirmation_number: 'CODE1', departure_location: 'Island (ISP)', arrival_location: 'Home (RDU)', start_date: '2026-12-21', start_time: '15:02', end_time: '16:46' },
      ],
      acts: [
        { day_id: 'a', title: 'Holiday light show and winter garden mini golf', description: `${LONG_NOTE}${LONG_NOTE}`, start_time: '16:30' },
        ...['Bagels', 'Park', 'Lunch out', 'Laser show', 'Dinner with friends'].map((title, k) => ({ day_id: 'b', title, description: 'If weather allows, coffee first and a walk.', start_time: `${9 + k * 2}:00` })),
        ...['Christmas Land', 'Family visit', 'Holiday market', 'Drive-through lights'].map((title, k) => ({ day_id: 'c', title, description: 'One ticket per car; buy in advance.', start_time: `${11 + k * 2}:00` })),
      ],
      dine: [
        { day_id: 'a', restaurant_name: 'Dinner at home', reservation_time: '18:30', number_of_people: 9 },
        { day_id: 'c', restaurant_name: 'Pancakes & Waffles', reservation_time: '09:00', notes: 'Sunday breakfast' },
      ],
    });
    const plan = planEdition(trip, NO_DESIGN);
    expect(kinds(plan.pages)).toEqual(['cover', 'overview+details', 'day0', 'day1', 'day2', 'day3', 'back']);
    expect(plan.analysis.days.map((d) => d.density)).toEqual(['full', 'full', 'full', 'light']);
    expect(plan.dayPages).toEqual([3, 4, 5, 6]);
    expect(describePlan(plan, trip)).toBe('7 pages · 4 days');
  });
});
