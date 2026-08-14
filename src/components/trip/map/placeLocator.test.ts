import { describe, it, expect } from 'vitest';
import type { DayActivity, HotelStay, RestaurantReservation, Transportation } from '@/types/trip';
import {
  activityLocator,
  diningLocator,
  extractIata,
  locatorKey,
  normalizeQuery,
  stayLocator,
  transportLocator,
  transportQuery,
} from './placeLocator';

const BIAS = { lat: 48.8566, lng: 2.3522 };

describe('normalizeQuery', () => {
  it('collapses case and whitespace so variants share one cache entry', () => {
    expect(normalizeQuery('Gare de Lyon')).toBe('gare de lyon');
    expect(normalizeQuery('  Gare   de  Lyon  ')).toBe('gare de lyon');
    expect(normalizeQuery('GARE DE LYON')).toBe('gare de lyon');
  });

  it('is idempotent', () => {
    const once = normalizeQuery('  Charles de Gaulle  (CDG) ');
    expect(normalizeQuery(once)).toBe(once);
  });

  it('normalizes unicode width', () => {
    expect(normalizeQuery('ＣＤＧ')).toBe('cdg');
  });
});

describe('extractIata', () => {
  it('reads the parenthesised suffix the flight lookup writes', () => {
    expect(extractIata('Charles de Gaulle Airport (CDG)')).toBe('CDG');
    expect(extractIata('John F Kennedy Airport (JFK)  ')).toBe('JFK');
  });

  it('accepts a bare code', () => {
    expect(extractIata('LHR')).toBe('LHR');
  });

  it('rejects anything that is not a code', () => {
    expect(extractIata('Paris')).toBeNull();
    expect(extractIata('Gare de Lyon')).toBeNull();
    expect(extractIata('Hotel (the good one)')).toBeNull();
    expect(extractIata('cdg')).toBeNull();
  });
});

describe('transportQuery', () => {
  it('prefers the IATA code, which geocodes far more reliably', () => {
    expect(transportQuery('Charles de Gaulle Airport (CDG)')).toBe('CDG airport');
  });

  it('passes non-airport locations through as typed', () => {
    expect(transportQuery('  Gare de Lyon ')).toBe('Gare de Lyon');
  });
});

describe('entity locators', () => {
  it('prefers place_id over address for activities', () => {
    const a = { location_place_id: 'ChIJ123', location_address: '5 Rue de Rivoli' } as DayActivity;
    expect(activityLocator(a)).toEqual({ kind: 'place', placeId: 'ChIJ123' });
  });

  it('falls back to the address, carrying the destination bias', () => {
    const a = { location_place_id: null, location_address: '5 Rue de Rivoli' } as DayActivity;
    expect(activityLocator(a, BIAS)).toEqual({
      kind: 'text',
      query: '5 Rue de Rivoli',
      bias: BIAS,
    });
  });

  it('returns null rather than guessing from a name alone', () => {
    const a = { location_place_id: null, location_address: null, title: 'Beach day' } as DayActivity;
    expect(activityLocator(a, BIAS)).toBeNull();
  });

  it('treats blank strings as absent', () => {
    const a = { location_place_id: '  ', location_address: '' } as unknown as DayActivity;
    expect(activityLocator(a)).toBeNull();
  });

  it('resolves dining and stays the same way', () => {
    const r = { place_id: 'ChIJdine', address: 'somewhere' } as RestaurantReservation;
    expect(diningLocator(r)).toEqual({ kind: 'place', placeId: 'ChIJdine' });

    const s = { hotel_place_id: null, hotel_address: '4196 Riva' } as HotelStay;
    expect(stayLocator(s)).toEqual({ kind: 'text', query: '4196 Riva' });
  });
});

describe('transportLocator', () => {
  const flight = {
    type: 'flight',
    departure_location: 'Charles de Gaulle Airport (CDG)',
    arrival_location: 'John F Kennedy Airport (JFK)',
  } as Transportation;

  it('never biases a flight — nudging CDG toward the trip centre only hurts', () => {
    expect(transportLocator(flight, 'departure', BIAS)).toEqual({
      kind: 'text',
      query: 'CDG airport',
    });
    expect(transportLocator(flight, 'arrival', BIAS)).toEqual({
      kind: 'text',
      query: 'JFK airport',
    });
  });

  it('biases ground transport, where the name really is ambiguous', () => {
    const train = {
      type: 'train',
      departure_location: 'Gare de Lyon',
      arrival_location: 'Gare de Nice',
    } as Transportation;

    expect(transportLocator(train, 'departure', BIAS)).toEqual({
      kind: 'text',
      query: 'Gare de Lyon',
      bias: BIAS,
    });
  });

  it('skips the bias for a ground row whose endpoint is an airport code', () => {
    const car = {
      type: 'car_service',
      departure_location: 'LHR',
      arrival_location: 'Soho',
    } as Transportation;

    expect(transportLocator(car, 'departure', BIAS)).toEqual({ kind: 'text', query: 'LHR airport' });
    expect(transportLocator(car, 'arrival', BIAS)).toEqual({
      kind: 'text',
      query: 'Soho',
      bias: BIAS,
    });
  });

  it('returns null for a missing endpoint', () => {
    const oneWay = { type: 'flight', departure_location: 'CDG', arrival_location: null } as Transportation;
    expect(transportLocator(oneWay, 'arrival')).toBeNull();
  });
});

describe('locatorKey', () => {
  it('namespaces place and text lookups', () => {
    expect(locatorKey({ kind: 'place', placeId: 'ChIJ123' })).toBe('place:ChIJ123');
    expect(locatorKey({ kind: 'text', query: 'Gare de Lyon' })).toBe('text:gare de lyon');
  });

  it('collapses text variants onto one key', () => {
    expect(locatorKey({ kind: 'text', query: '  GARE  de Lyon ' })).toBe(
      locatorKey({ kind: 'text', query: 'Gare de Lyon' }),
    );
  });

  it('ignores the bias, which does not change what is being looked up', () => {
    expect(locatorKey({ kind: 'text', query: 'Soho', bias: BIAS })).toBe(
      locatorKey({ kind: 'text', query: 'Soho' }),
    );
  });
});
