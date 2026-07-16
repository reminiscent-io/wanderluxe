import { describe, it, expect } from 'vitest';
import { buildPeekFacts } from './peekFacts';

describe('buildPeekFacts', () => {
  it('builds time, location, rating, and cost rows for an activity', () => {
    const facts = buildPeekFacts('activity', {
      start_time: '14:30:00', end_time: '16:00:00',
      location_address: '12 Rue de Rivoli, Paris',
      location_rating: 4.7, cost: 60, currency: 'EUR',
    });
    expect(facts.map((f) => f.text)).toEqual([
      '2:30 PM – 4:00 PM',
      '12 Rue de Rivoli, Paris',
      '4.7',
      '€60',
    ]);
  });

  it('appends the timezone badge to the time row', () => {
    const facts = buildPeekFacts('activity', { start_time: '09:00:00' }, 'EEST');
    expect(facts[0].text).toBe('9:00 AM EEST');
  });

  it('omits rows with no data — a title-only card is valid', () => {
    expect(buildPeekFacts('activity', {})).toEqual([]);
    expect(buildPeekFacts('dining', { restaurant_name: 'Rizes' })).toEqual([]);
  });

  it('builds party size and reservation time for dining', () => {
    const facts = buildPeekFacts('dining', {
      reservation_time: '21:00:00', number_of_people: 6, rating: 4.5,
    });
    expect(facts.map((f) => f.text)).toEqual(['9:00 PM', 'Party of 6', '4.5']);
  });

  it('builds date range and check-in/out times for a stay', () => {
    const facts = buildPeekFacts('accommodation', {
      hotel_checkin_date: '2026-08-06', hotel_checkout_date: '2026-08-11',
      checkin_time: '15:00:00', checkout_time: '11:00:00',
    });
    expect(facts.map((f) => f.text)).toEqual([
      'Aug 6 – Aug 11',
      'Check-in 3:00 PM · Check-out 11:00 AM',
    ]);
  });

  it('combines provider and confirmation number for transport', () => {
    const facts = buildPeekFacts('transportation', {
      start_time: '08:15:00', provider: 'Delta', confirmation_number: 'ABC123',
    });
    expect(facts.map((f) => f.text)).toEqual(['8:15 AM', 'Delta · ABC123']);
  });
});
