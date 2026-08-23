import { describe, it, expect } from 'vitest';
import { buildTripCalendarICS, isFeedAuthorized, type FeedInput } from './icalFeed';

const input: FeedInput = {
  trip: { destination: 'Paris', timezone: 'America/New_York' },
  activities: [{ id: 'a1', title: 'Louvre', date: '2026-06-30', start_time: '14:30:00', end_time: '16:00:00', description: 'Tickets booked', location_address: 'Rue de Rivoli', timezone: null }],
  reservations: [{ id: 'r1', restaurant_name: 'Septime', date: '2026-07-01', reservation_time: '20:00:00', end_time: '22:15:00', address: '80 Rue de Charonne', notes: null, timezone: null }],
  accommodations: [{ stay_id: 's1', hotel: 'Hotel Lutetia', hotel_checkin_date: '2026-06-30', hotel_checkout_date: '2026-07-03', hotel_address: '45 Bd Raspail', hotel_details: 'Deluxe room, breakfast included' }],
  transportation: [{ id: 't1', type: 'flight', start_date: '2026-06-30', start_time: '09:00:00', end_date: '2026-06-30', end_time: '11:30:00', departure_location: 'JFK', arrival_location: 'CDG', provider: 'Air France', details: 'AF17, seat 12A', departure_timezone: null, arrival_timezone: null }],
};

describe('buildTripCalendarICS', () => {
  const ics = buildTripCalendarICS(input);
  it('emits a VCALENDAR with the trip name', () => {
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
  });
  it('uses stable per-entity UIDs', () => {
    expect(ics).toContain('UID:activity-a1@wanderluxe.io');
    expect(ics).toContain('UID:dining-r1@wanderluxe.io');
    expect(ics).toContain('UID:accommodation-s1@wanderluxe.io');
    expect(ics).toContain('UID:transportation-t1@wanderluxe.io');
  });
  it('emits floating timed events (no Z, no TZID)', () => {
    expect(ics).toContain('DTSTART:20260630T143000');
    expect(ics).toContain('DTEND:20260630T160000');
    expect(ics).not.toMatch(/DTSTART:20260630T143000Z/);
  });
  it('emits all-day accommodation with exclusive end date', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20260630');
    expect(ics).toContain('DTEND;VALUE=DATE:20260704');
  });
  it('includes summaries', () => {
    expect(ics).toContain('SUMMARY:Louvre');
    expect(ics).toContain('SUMMARY:Septime');
    expect(ics).toContain('SUMMARY:Flight: JFK to CDG');
  });
  it('populates descriptions for accommodations and transportation where available', () => {
    expect(ics).toContain('DESCRIPTION:Deluxe room');
    expect(ics).toContain('DESCRIPTION:AF17');
  });
});

describe('buildTripCalendarICS edge cases', () => {
  it('keeps departure/arrival times for a multi-day (overnight) transport leg', () => {
    const ics = buildTripCalendarICS({
      trip: { destination: 'Test' },
      activities: [], reservations: [], accommodations: [],
      transportation: [{ id: 'tn', type: 'train', start_date: '2026-07-01', start_time: '22:00:00', end_date: '2026-07-02', end_time: '08:00:00', departure_location: 'Paris', arrival_location: 'Nice', provider: null, details: null }],
    });
    expect(ics).toContain('DTSTART:20260701T220000');
    expect(ics).toContain('DTEND:20260702T080000');
    expect(ics).not.toContain('VALUE=DATE:20260701');
  });

  it('emits the explicit DTEND for a timed reservation', () => {
    const ics = buildTripCalendarICS(input);
    expect(ics).toContain('DTSTART:20260701T200000');
    expect(ics).toContain('DTEND:20260701T221500');
  });

  it('blocks out 90 minutes for a reservation with no stated end', () => {
    // A subscriber wants the dinner hour held; a DTSTART with no DTEND is
    // zero-duration per RFC 5545 and shows as an instant.
    const ics = buildTripCalendarICS({
      trip: { destination: 'Test' },
      activities: [],
      reservations: [{ id: 'ro', restaurant_name: 'Dinner', date: '2026-07-01', reservation_time: '20:00:00', end_time: null, address: null, notes: null }],
      accommodations: [], transportation: [],
    });
    expect(ics).toContain('DTSTART:20260701T200000');
    expect(ics).toContain('DTEND:20260701T213000');
  });

  it('omits DTEND for a timed activity with no end time', () => {
    const ics = buildTripCalendarICS({
      trip: { destination: 'Test' },
      activities: [{ id: 'ao', title: 'Wander', date: '2026-07-01', start_time: '20:00:00', end_time: null, description: null, location_address: null, timezone: null }],
      reservations: [], accommodations: [], transportation: [],
    });
    expect(ics).toContain('DTSTART:20260701T200000');
    expect(ics).not.toContain('DTEND');
  });
});

describe('buildTripCalendarICS timezone labels', () => {
  it('appends the zone to the SUMMARY of a cross-zone activity', () => {
    const crossZone = buildTripCalendarICS({
      ...input,
      activities: [{ ...input.activities[0], timezone: 'Europe/London' }],
    });
    expect(crossZone).toMatch(/SUMMARY:.*\(GMT\+1\)/);
  });

  it('labels both zones on a cross-zone flight summary', () => {
    const crossZone = buildTripCalendarICS({
      ...input,
      transportation: [{
        ...input.transportation[0],
        start_time: '23:00',
        end_time: '11:00',
        departure_timezone: 'America/New_York',
        arrival_timezone: 'Europe/London',
      }],
    });
    expect(crossZone).toMatch(/SUMMARY:.*\(EDT -> GMT\+1\)/);
  });

  it('stays floating for cross-zone items (no TZID, no Z)', () => {
    const crossZone = buildTripCalendarICS({
      ...input,
      activities: [{ ...input.activities[0], timezone: 'Europe/London' }],
    });
    expect(crossZone).not.toContain('TZID');
    expect(crossZone).not.toMatch(/DTSTART:\d{8}T\d{6}Z/);
  });
});

describe('buildTripCalendarICS rental cars', () => {
  const rental = (over: Partial<FeedInput['transportation'][0]> = {}) => buildTripCalendarICS({
    ...input,
    transportation: [{
      id: 'rc1', type: 'rental_car',
      start_date: '2026-06-30', start_time: '10:00:00',
      end_date: '2026-07-03', end_time: '09:00:00',
      departure_location: 'Nice Airport', arrival_location: 'Nice Airport',
      provider: 'Hertz', details: 'Confirmation ABC123',
      departure_timezone: null, arrival_timezone: null,
      ...over,
    }],
  });

  it('splits a multi-day rental car into pickup and return bookends', () => {
    const ics = rental();
    expect(ics).toContain('UID:transportation-rc1-pickup@wanderluxe.io');
    expect(ics).toContain('UID:transportation-rc1-return@wanderluxe.io');
    expect(ics).not.toContain('UID:transportation-rc1@wanderluxe.io');
    expect(ics).toContain('SUMMARY:Rental Car Pickup: Nice Airport');
    expect(ics).toContain('SUMMARY:Rental Car Return: Nice Airport');
  });

  it('gives the rental bookends short blocks instead of one multi-day span', () => {
    const ics = rental();
    expect(ics).toContain('DTSTART:20260630T100000');
    expect(ics).toContain('DTEND:20260630T110000');
    expect(ics).toContain('DTSTART:20260703T090000');
    expect(ics).toContain('DTEND:20260703T093000');
    // The shape that made the car read as the current event all week.
    expect(ics).not.toMatch(/DTSTART:20260630T100000\r?\nDTEND:20260703/);
  });

  it('carries location and details onto both rental bookends', () => {
    const ics = rental();
    expect(ics.match(/LOCATION:Nice Airport/g)).toHaveLength(2);
    expect(ics.match(/DESCRIPTION:Confirmation ABC123/g)).toHaveLength(2);
  });

  it('falls back to per-date all-day markers when a rental has no times', () => {
    const ics = rental({ start_time: null, end_time: null });
    expect(ics).toContain('DTSTART;VALUE=DATE:20260630');
    expect(ics).toContain('DTEND;VALUE=DATE:20260701');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260703');
    expect(ics).toContain('DTEND;VALUE=DATE:20260704');
  });

  it('emits only a pickup when the rental has no distinct return', () => {
    const ics = rental({ end_date: null, end_time: null, start_time: null });
    expect(ics).toContain('UID:transportation-rc1-pickup@wanderluxe.io');
    expect(ics).not.toContain('UID:transportation-rc1-return@wanderluxe.io');
  });

  it('bookends a same-day rental too — an all-day block is still a wrong "next stop"', () => {
    const ics = rental({ end_date: '2026-06-30', end_time: '18:00:00' });
    expect(ics).toContain('DTSTART:20260630T100000');
    expect(ics).toContain('DTEND:20260630T110000');
    expect(ics).toContain('DTSTART:20260630T180000');
    expect(ics).toContain('DTEND:20260630T183000');
  });

  it('badges each rental bookend with its own zone', () => {
    const ics = rental({ departure_timezone: 'Europe/Paris', arrival_timezone: 'Europe/Paris' });
    expect(ics).toContain('SUMMARY:Rental Car Pickup: Nice Airport (GMT+2)');
    expect(ics).toContain('SUMMARY:Rental Car Return: Nice Airport (GMT+2)');
  });

  it('leaves non-rental multi-day legs as a single timed event', () => {
    const ics = buildTripCalendarICS({
      ...input,
      transportation: [{ ...input.transportation[0], id: 'tn', type: 'train', start_date: '2026-07-01', start_time: '22:00', end_date: '2026-07-02', end_time: '08:00' }],
    });
    expect(ics).toContain('UID:transportation-tn@wanderluxe.io');
    expect(ics).toContain('DTSTART:20260701T220000');
    expect(ics).toContain('DTEND:20260702T080000');
  });
});

describe('isFeedAuthorized', () => {
  it('allows a matching enabled token', () => {
    expect(isFeedAuthorized({ calendar_feed_enabled: true, calendar_feed_token: 'abc' }, 'abc')).toBe(true);
  });
  it('rejects a wrong token', () => {
    expect(isFeedAuthorized({ calendar_feed_enabled: true, calendar_feed_token: 'abc' }, 'xyz')).toBe(false);
  });
  it('rejects when disabled even if the token matches', () => {
    expect(isFeedAuthorized({ calendar_feed_enabled: false, calendar_feed_token: 'abc' }, 'abc')).toBe(false);
  });
  it('rejects an empty token or a revoked (null) token', () => {
    expect(isFeedAuthorized({ calendar_feed_enabled: true, calendar_feed_token: 'abc' }, '')).toBe(false);
    expect(isFeedAuthorized({ calendar_feed_enabled: true, calendar_feed_token: null }, 'abc')).toBe(false);
  });
});
