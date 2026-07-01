import { describe, it, expect } from 'vitest';
import {
  makeEventId,
  parseEventId,
  mapActivityToEvent,
  mapReservationToEvent,
} from './eventMapping';
import type { DayActivity, RestaurantReservation } from '@/types/trip';

const baseActivity: DayActivity = {
  id: 'a1', day_id: 'd1', trip_id: 't1', title: 'Louvre',
  start_time: '14:30:00', end_time: '16:00:00',
  cost: null, currency: null, order_index: 0, created_at: '', is_paid: false,
};

describe('event ids', () => {
  it('round-trips a namespaced id', () => {
    const id = makeEventId('activity', 'a1');
    expect(id).toBe('activity:a1');
    expect(parseEventId(id)).toEqual({ entityType: 'activity', recordId: 'a1' });
  });
  it('keeps colons that appear inside the record id', () => {
    expect(parseEventId('dining:x:y')).toEqual({ entityType: 'dining', recordId: 'x:y' });
  });
});

describe('mapActivityToEvent', () => {
  it('maps a timed activity to a floating time block', () => {
    const e = mapActivityToEvent(baseActivity, '2026-06-30');
    expect(e).toMatchObject({
      id: 'activity:a1', title: 'Louvre', allDay: false,
      start: '2026-06-30T14:30:00', end: '2026-06-30T16:00:00',
    });
    expect(e?.extendedProps).toMatchObject({ entityType: 'activity', record: baseActivity });
  });
  it('maps an untimed activity to an all-day chip', () => {
    const e = mapActivityToEvent({ ...baseActivity, start_time: undefined, end_time: undefined }, '2026-06-30');
    expect(e).toMatchObject({ id: 'activity:a1', start: '2026-06-30', allDay: true });
    expect(e?.end).toBeUndefined();
  });
  it('returns null when the day date is missing', () => {
    expect(mapActivityToEvent(baseActivity, '')).toBeNull();
  });
});

describe('mapReservationToEvent', () => {
  const res: RestaurantReservation = {
    id: 'r1', day_id: 'd1', trip_id: 't1', restaurant_name: 'Septime',
    reservation_time: '20:00:00', number_of_people: 2, notes: null,
    confirmation_number: null, cost: null, currency: null, is_paid: false,
    address: null, phone_number: null, place_id: null, rating: null,
    created_at: '', order_index: 0,
  };
  it('maps a timed reservation to a point-in-time block', () => {
    const e = mapReservationToEvent(res, '2026-07-01');
    expect(e).toMatchObject({ id: 'dining:r1', title: 'Septime', allDay: false, start: '2026-07-01T20:00:00' });
    expect(e?.end).toBeUndefined();
  });
  it('maps an untimed reservation to an all-day chip', () => {
    const e = mapReservationToEvent({ ...res, reservation_time: null }, '2026-07-01');
    expect(e).toMatchObject({ id: 'dining:r1', start: '2026-07-01', allDay: true });
  });
});
