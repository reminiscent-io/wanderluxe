import { describe, expect, it } from 'vitest';
import {
  buildPrintTrip,
  extractLinks,
  formatClock,
  formatDateRange,
  hasPrintLedger,
  shortPlace,
  weekdayOf,
  type PrintTripRows,
} from './trip';

const D1 = 'd1111111-1111-4111-8111-111111111111';
const D2 = 'd2222222-2222-4222-8222-222222222222';
const D3 = 'd3333333-3333-4333-8333-333333333333';
const D4 = 'd4444444-4444-4444-8444-444444444444';

/** A long holiday weekend with the same traps as a real one. */
function holidayRows(): PrintTripRows {
  return {
    trip: {
      destination: 'Holiday Weekend',
      arrival_date: '2026-12-18',
      departure_date: '2026-12-21',
      timezone: 'America/New_York',
      cover_image_url: 'https://images.example.com/tree.jpg',
      cover_image_position: 'center 0%',
      budget: null,
    },
    days: [
      // Out of order on purpose: the projection sorts by date.
      { day_id: D3, date: '2026-12-20', title: null, description: null },
      { day_id: D1, date: '2026-12-18', title: 'Arrival', description: null, image_url: 'https://images.example.com/d1.jpg', image_position: 'center 30%' },
      { day_id: D2, date: '2026-12-19', title: null, description: null },
      { day_id: D4, date: '2026-12-21', title: null, description: null },
    ],
    stays: [],
    trans: [
      {
        type: 'flight',
        provider: 'Example Air',
        flight_number: 'EX204',
        confirmation_number: 'ABC123',
        departure_location: 'Raleigh-Durham International Airport (RDU)',
        arrival_location: 'Long Island MacArthur Airport (ISP)',
        start_date: '2026-12-18',
        end_date: '2026-12-18',
        start_time: '12:50:00',
        end_time: '14:22:00',
        details: 'Fare: Nicer. 1h 32m.',
        cost: 300,
      },
      {
        type: 'rental_car',
        provider: null,
        departure_location: 'Long Island MacArthur Airport (ISP)',
        arrival_location: 'Long Island MacArthur Airport (ISP)',
        start_date: '2026-12-18',
        end_date: '2026-12-21',
        start_time: '14:45:00',
        end_time: '13:30:00',
        details: 'Not booked yet. Needs two car seats.',
      },
      {
        type: 'flight',
        provider: 'Example Air',
        flight_number: 'EX303',
        confirmation_number: 'ABC123',
        departure_location: 'Long Island MacArthur Airport (ISP)',
        arrival_location: 'Raleigh-Durham International Airport (RDU)',
        start_date: '2026-12-21',
        end_date: '2026-12-21',
        start_time: '15:02:00',
        end_time: '16:46:00',
      },
    ],
    acts: [
      {
        day_id: D1,
        title: 'Holiday Light Show',
        description: 'Tickets online or at the gate.\n\nLink for tickets: https://www.example-lights.com/e/holiday-light-show-tickets-1999',
        start_time: '16:30:00',
        end_time: null,
        location_address: '1 Falls Rd, Sayville, NY',
        location_phone: '+1 631 555 0100',
        location_website: 'example-lights.com',
      },
      {
        day_id: D3,
        title: 'Drive-through lights',
        description: 'One ticket per car; buy in advance.',
        start_time: '18:30:00',
        end_time: '20:30:00',
      },
      { day_id: D2, title: 'Park and playground', description: null, start_time: null, end_time: null },
    ],
    dine: [
      // reservation_time is a time-of-day column: the day comes from day_id alone.
      { day_id: D3, restaurant_name: 'Pancakes & Waffles', reservation_time: '09:00:00', notes: 'Sunday breakfast', number_of_people: null },
      { day_id: D1, restaurant_name: 'Dinner at home', reservation_time: '18:30:00', number_of_people: 9, confirmation_number: 'T-77', phone_number: '+1 631 555 0199', address: '21 Example Ave' },
    ],
    otherExpenses: [],
  };
}

describe('buildPrintTrip', () => {
  const trip = buildPrintTrip(holidayRows());
  const day = (date: string) => trip.days.find((d) => d.date === date)!;
  const titles = (date: string) => day(date).items.map((i) => (i.label ? `${i.label}: ${i.title}` : i.title));

  it('orders days by date and names each weekday from the calendar', () => {
    expect(trip.days.map((d) => d.date)).toEqual(['2026-12-18', '2026-12-19', '2026-12-20', '2026-12-21']);
    expect(trip.days.map((d) => d.weekday)).toEqual(['Friday', 'Saturday', 'Sunday', 'Monday']);
    expect(trip.days.map((d) => d.index)).toEqual([0, 1, 2, 3]);
  });

  it('places a reservation on the day it belongs to, never by its time', () => {
    expect(titles('2026-12-20')).toContain('Pancakes & Waffles');
    expect(titles('2026-12-21')).not.toContain('Pancakes & Waffles');
  });

  it('prints both ends of a rental car and nothing in between', () => {
    expect(titles('2026-12-18')).toContain('Pickup: Rental car');
    expect(titles('2026-12-21')).toContain('Return: Rental car');
    expect(titles('2026-12-19').some((t) => /rental/i.test(t))).toBe(false);
    expect(titles('2026-12-20').some((t) => /rental/i.test(t))).toBe(false);
    const ret = day('2026-12-21').items.find((i) => i.label === 'Return')!;
    expect(ret.time).toBe('1:30 PM');
  });

  it('keeps every fact about a flight', () => {
    const flight = day('2026-12-18').items.find((i) => i.kind === 'journey' && i.mode === 'flight')!;
    expect(flight.title).toBe('Flight to Long Island MacArthur (ISP)');
    expect(flight.place).toBe('Raleigh-Durham (RDU) → Long Island MacArthur (ISP)');
    expect(flight.time).toBe('12:50 PM');
    expect(flight.endTime).toBe('2:22 PM');
    expect(flight.facts).toEqual(['Example Air', 'Flight EX204', 'Confirmation ABC123']);
    expect(flight.notes).toBe('Fare: Nicer. 1h 32m.');
  });

  it('sorts a day by time, untimed plans at 8:00', () => {
    expect(titles('2026-12-18')).toEqual([
      'Flight to Long Island MacArthur (ISP)',
      'Pickup: Rental car',
      'Holiday Light Show',
      'Dinner at home',
    ]);
    const park = day('2026-12-19').items[0];
    expect(park.time).toBe('');
    expect(park.sortKey).toBe(480);
  });

  it('reads the whole activity: address, phone, website and the links in its notes', () => {
    const show = day('2026-12-18').items.find((i) => i.title === 'Holiday Light Show')!;
    expect(show.place).toBe('1 Falls Rd, Sayville, NY');
    expect(show.facts).toEqual(['+1 631 555 0100']);
    expect(show.notes).toBe('Tickets online or at the gate.');
    expect(show.links.map((l) => l.label)).toEqual(['Tickets', 'Website']);
    expect(show.links[0].href).toBe('https://www.example-lights.com/e/holiday-light-show-tickets-1999');
  });

  it('reads the whole reservation: party, confirmation, phone and address', () => {
    const dinner = day('2026-12-18').items.find((i) => i.title === 'Dinner at home')!;
    expect(dinner.facts).toEqual(['Party of 9', 'Confirmation T-77', '+1 631 555 0199']);
    expect(dinner.place).toBe('21 Example Ave');
  });

  it('keeps the photos and where the traveler pinned them', () => {
    expect(trip.cover).toEqual({ url: 'https://images.example.com/tree.jpg', position: 'center 0%' });
    expect(day('2026-12-18').image).toEqual({ url: 'https://images.example.com/d1.jpg', position: 'center 30%' });
    expect(day('2026-12-19').image).toBeUndefined();
  });

  it('summarizes the trip', () => {
    expect(trip.destination).toBe('Holiday Weekend');
    expect(trip.dateRange).toBe('December 18–21, 2026');
    expect(trip.nights).toBe(3);
    expect(trip.journeys.map((j) => j.label)).toEqual(['Flight', 'Rental Car', 'Flight']);
    expect(trip.reservations.map((r) => [r.name, r.date])).toEqual([
      ['Dinner at home', '2026-12-18'],
      ['Pancakes & Waffles', '2026-12-20'],
    ]);
  });

  it('counts money only for the opt-in Ledger', () => {
    expect(trip.budget.total).toBe(300);
    expect(trip.budget.categories).toEqual([{ category: 'Transportation', amount: 300 }]);
    expect(hasPrintLedger(trip)).toBe(true);
    // Money never reaches an itinerary item.
    for (const d of trip.days) {
      for (const i of d.items) expect(JSON.stringify(i)).not.toMatch(/\$|300/);
    }
  });
});

describe('stays', () => {
  const rows: PrintTripRows = {
    trip: { destination: 'Highlands', arrival_date: '2026-09-24', departure_date: '2026-09-28', timezone: 'Europe/London' },
    days: ['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28'].map((date, i) => ({ day_id: `day-${i}`, date })),
    stays: [
      { hotel: 'Castle Hotel', hotel_address: '1 Glen Rd', hotel_checkin_date: '2026-09-24', hotel_checkout_date: '2026-09-26', checkin_time: null, checkout_time: '11:00:00', hotel_phone: '+44 1 555' },
      { hotel: 'Loch Lodge', hotel_checkin_date: '2026-09-26', hotel_checkout_date: '2026-09-28', checkin_time: '16:00:00' },
    ],
    trans: [],
    acts: [],
    dine: [],
  };
  const trip = buildPrintTrip(rows);

  it('names where each night is spent', () => {
    expect(trip.days.map((d) => d.stay ?? null)).toEqual(['Castle Hotel', 'Castle Hotel', 'Loch Lodge', 'Loch Lodge', null]);
  });

  it('prints check-out before check-in on a changeover day', () => {
    expect(trip.days[2].items.map((i) => `${i.label} ${i.title}`)).toEqual(['Check-out Castle Hotel', 'Check-in Loch Lodge']);
    expect(trip.days[0].items[0].sortKey).toBe(15 * 60);
  });
});

describe('overnight journeys', () => {
  it('prints the arrival on the day it happens', () => {
    const trip = buildPrintTrip({
      trip: { destination: 'Night train', arrival_date: '2026-05-01', departure_date: '2026-05-02' },
      days: [
        { day_id: 'a', date: '2026-05-01' },
        { day_id: 'b', date: '2026-05-02' },
      ],
      stays: [],
      trans: [{ type: 'train', departure_location: 'Paris', arrival_location: 'Rome', start_date: '2026-05-01', end_date: '2026-05-02', start_time: '19:10', end_time: '09:40' }],
      acts: [],
      dine: [],
    });
    expect(trip.days[0].items[0].title).toBe('Train to Rome');
    expect(trip.days[0].items[0].facts).toContain('Arrives May 2, 9:40 AM');
    expect(trip.days[1].items[0].title).toBe('Arrive in Rome');
    expect(trip.days[1].items[0].time).toBe('9:40 AM');
  });
});

describe('helpers', () => {
  it('formats wall-clock times without converting them', () => {
    expect(formatClock('14:45:00')).toBe('2:45 PM');
    expect(formatClock('00:05')).toBe('12:05 AM');
    expect(formatClock('12:00')).toBe('12:00 PM');
    expect(formatClock(null)).toBe('');
    expect(formatClock('soon')).toBe('');
  });

  it('formats date ranges the way people write them', () => {
    expect(formatDateRange('2026-12-18', '2026-12-21')).toBe('December 18–21, 2026');
    expect(formatDateRange('2026-06-28', '2026-07-03')).toBe('June 28 – July 3, 2026');
    expect(formatDateRange('2025-12-30', '2026-01-02')).toBe('December 30, 2025 – January 2, 2026');
    expect(formatDateRange('2026-04-01', '2026-04-01')).toBe('April 1, 2026');
    expect(formatDateRange(null, null)).toBe('');
  });

  it('reads weekdays in UTC so no zone can move a day', () => {
    expect(weekdayOf('2026-12-20')).toBe('Sunday');
    expect(weekdayOf('2026-12-25')).toBe('Friday');
    expect(weekdayOf('not a date')).toBe('');
  });

  it('shortens airport names and leaves everything else alone', () => {
    expect(shortPlace('Raleigh-Durham International Airport (RDU)')).toBe('Raleigh-Durham (RDU)');
    expect(shortPlace('San Francisco (SFO)')).toBe('San Francisco (SFO)');
    expect(shortPlace('Gare de Lyon')).toBe('Gare de Lyon');
    expect(shortPlace(undefined)).toBeUndefined();
  });

  it('lifts links out of notes and keeps the words', () => {
    expect(extractLinks('Ticket Link: https://example.com/tickets/')).toEqual({
      notes: undefined,
      links: [{ href: 'https://example.com/tickets/', label: 'Tickets', display: 'example.com/tickets' }],
    });
    const { notes, links } = extractLinks('Laser show at the planetarium\nLink for tickets: https://a.example.org/page.aspx?pid=196&tab=2');
    expect(notes).toBe('Laser show at the planetarium');
    expect(links[0]).toMatchObject({ label: 'Tickets', display: 'a.example.org/page.aspx/…' });
    expect(extractLinks('See https://example.com.')).toEqual({
      notes: 'See.',
      links: [{ href: 'https://example.com/', label: 'example.com', display: 'example.com' }],
    });
    expect(extractLinks('No links here')).toEqual({ notes: 'No links here', links: [] });
  });
});

describe('review fixes', () => {
  it('keeps a word the link did not announce', () => {
    expect(extractLinks('Bring printed tickets https://x.example.com/a').notes).toBe('Bring printed tickets');
    expect(extractLinks('Check the website https://x.example.com').notes).toBe('Check the website');
    expect(extractLinks('Tickets https://x.example.com/t')).toMatchObject({ notes: undefined, links: [{ label: 'Tickets' }] });
    expect(extractLinks('Arrive early.\nTickets https://x.example.com/t').notes).toBe('Arrive early.');
  });

  const base = (patch: Partial<PrintTripRows>): PrintTripRows => ({
    trip: { destination: 'Edge cases', arrival_date: '2026-03-01', departure_date: '2026-03-03' },
    days: [
      { day_id: 'a', date: '2026-03-01' },
      { day_id: 'b', date: '2026-03-02' },
      { day_id: 'c', date: '2026-03-03' },
    ],
    stays: [],
    trans: [],
    acts: [],
    dine: [],
    ...patch,
  });

  it('prints an activity with no day on no day', () => {
    const trip = buildPrintTrip(base({ days: [{ date: '2026-03-01' }, { date: '2026-03-02' }], acts: [{ title: 'Orphan', start_time: '10:00' }] }));
    expect(trip.days.every((d) => d.items.length === 0)).toBe(true);
  });

  it('prints both ends of a day-use stay', () => {
    const trip = buildPrintTrip(base({ stays: [{ hotel: 'Day Spa Hotel', hotel_checkin_date: '2026-03-02', hotel_checkout_date: '2026-03-02', checkin_time: '10:00', checkout_time: '18:00' }] }));
    expect(trip.days[1].items.map((i) => i.label)).toEqual(['Check-in', 'Check-out']);
  });

  it('gives a stay with no check-out date its first night only', () => {
    const trip = buildPrintTrip(base({ stays: [{ hotel: 'Open-ended Inn', hotel_checkin_date: '2026-03-01' }] }));
    expect(trip.days.map((d) => d.stay ?? null)).toEqual(['Open-ended Inn', null, null]);
  });
});
