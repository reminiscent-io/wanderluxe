import { describe, it, expect } from 'vitest';
import {
  isClientTrip,
  splitClientTrips,
  isValidClientEmail,
  clientFieldsForInsert,
  clientInviteDefaults,
  clientAlreadyOnTrip,
} from './clientTrips';

describe('clientTrips', () => {
  it('a blank or missing client_name is not a client trip', () => {
    expect(isClientTrip({ client_name: null })).toBe(false);
    expect(isClientTrip({ client_name: '   ' })).toBe(false);
    expect(isClientTrip({})).toBe(false);
    expect(isClientTrip(null)).toBe(false);
    expect(isClientTrip({ client_name: 'Jane Doe' })).toBe(true);
  });

  it('splits owned trips into personal and client, keeping order', () => {
    const trips = [
      { id: 1, client_name: null },
      { id: 2, client_name: 'Hendersons' },
      { id: 3 },
      { id: 4, client_name: 'Jane Doe' },
    ];
    const { personal, clients } = splitClientTrips(trips);
    expect(personal.map(t => t.id)).toEqual([1, 3]);
    expect(clients.map(t => t.id)).toEqual([2, 4]);
  });

  it('accepts a blank email, rejects a malformed one', () => {
    expect(isValidClientEmail('')).toBe(true);
    expect(isValidClientEmail(' jane@example.com ')).toBe(true);
    expect(isValidClientEmail('jane@')).toBe(false);
  });

  describe('clientFieldsForInsert', () => {
    it('blank input is a personal trip', () => {
      expect(clientFieldsForInsert('  ', '')).toEqual({ client_name: null, client_email: null });
    });

    it('trims the name and normalizes the email', () => {
      expect(clientFieldsForInsert(' Jane Doe ', ' Jane@Example.com ')).toEqual({
        client_name: 'Jane Doe',
        client_email: 'jane@example.com',
      });
    });

    it('an email alone still marks the trip, named by the email', () => {
      expect(clientFieldsForInsert('', 'jane@example.com')).toEqual({
        client_name: 'jane@example.com',
        client_email: 'jane@example.com',
      });
    });
  });

  describe('clientInviteDefaults', () => {
    it('splits the name for the traveler form', () => {
      expect(clientInviteDefaults({ client_name: 'Jane van der Berg', client_email: 'jane@example.com' })).toEqual({
        first_name: 'Jane',
        last_name: 'van der Berg',
        shared_with_email: 'jane@example.com',
      });
    });

    it('does not put an email-as-name into the first name field', () => {
      expect(clientInviteDefaults({ client_name: 'jane@example.com', client_email: 'jane@example.com' })).toEqual({
        first_name: '',
        last_name: '',
        shared_with_email: 'jane@example.com',
      });
    });
  });

  describe('clientAlreadyOnTrip', () => {
    const owner = { first_name: 'Kevin', last_name: 'Advisor', shared_with_email: 'kevin@example.com' };

    it('matches on email, ignoring case', () => {
      const defaults = { first_name: 'Jane', last_name: 'Doe', shared_with_email: 'jane@example.com' };
      expect(clientAlreadyOnTrip(defaults, [owner])).toBe(false);
      expect(clientAlreadyOnTrip(defaults, [owner, { first_name: 'J', shared_with_email: 'Jane@Example.com' }])).toBe(true);
    });

    it('falls back to the full name when there is no email', () => {
      const defaults = { first_name: 'Jane', last_name: 'Doe', shared_with_email: '' };
      expect(clientAlreadyOnTrip(defaults, [owner])).toBe(false);
      expect(clientAlreadyOnTrip(defaults, [owner, { first_name: 'jane', last_name: 'doe' }])).toBe(true);
    });

    it('never matches on an empty name and email', () => {
      expect(clientAlreadyOnTrip({ first_name: '', last_name: '', shared_with_email: '' }, [{ first_name: '', last_name: '' }])).toBe(false);
    });
  });
});
