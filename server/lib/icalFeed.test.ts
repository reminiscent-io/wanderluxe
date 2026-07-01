import { describe, it, expect } from 'vitest';
import { buildTripCalendarICS, isFeedAuthorized, type FeedInput } from './icalFeed';

const input: FeedInput = {
  trip: { destination: 'Paris' },
  activities: [{ id: 'a1', title: 'Louvre', date: '2026-06-30', start_time: '14:30:00', end_time: '16:00:00', description: 'Tickets booked', location_address: 'Rue de Rivoli' }],
  reservations: [{ id: 'r1', restaurant_name: 'Septime', date: '2026-07-01', reservation_time: '20:00:00', address: '80 Rue de Charonne', notes: null }],
  accommodations: [{ stay_id: 's1', hotel: 'Hotel Lutetia', hotel_checkin_date: '2026-06-30', hotel_checkout_date: '2026-07-03', hotel_address: '45 Bd Raspail', hotel_details: 'Deluxe room, breakfast included' }],
  transportation: [{ id: 't1', type: 'flight', start_date: '2026-06-30', start_time: '09:00:00', end_date: '2026-06-30', end_time: '11:30:00', departure_location: 'JFK', arrival_location: 'CDG', provider: 'Air France', details: 'AF17, seat 12A' }],
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
