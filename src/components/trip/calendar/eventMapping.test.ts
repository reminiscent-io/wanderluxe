import { describe, it, expect } from 'vitest';
import {
  makeEventId,
  parseEventId,
  mapActivityToEvent,
  mapReservationToEvent,
  mapAccommodationToEvent,
  mapTransportationToEvent,
  transportationTitle,
  buildDropPatch,
  isDateWithinTripRange,
} from './eventMapping';
import type { DayActivity, RestaurantReservation, HotelStay, Transportation } from '@/types/trip';

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

describe('mapAccommodationToEvent', () => {
  const stay: HotelStay = {
    stay_id: 's1', trip_id: 't1', hotel: 'Hotel Lutetia',
    hotel_checkin_date: '2026-06-30', hotel_checkout_date: '2026-07-03',
    checkin_time: '15:00', checkout_time: '11:00',
    hotel_details: null, hotel_url: null, cost: null, currency: null,
    hotel_address: null, hotel_phone: null, hotel_place_id: null, hotel_website: null, created_at: '',
  };
  it('spans check-in to check-out inclusive via exclusive end (+1 day)', () => {
    const e = mapAccommodationToEvent(stay);
    expect(e).toMatchObject({ id: 'accommodation:s1', title: 'Hotel Lutetia', allDay: true, start: '2026-06-30', end: '2026-07-04' });
    expect(e?.extendedProps).toMatchObject({ entityType: 'accommodation', record: stay });
  });
  it('returns null when dates are missing', () => {
    expect(mapAccommodationToEvent({ ...stay, hotel_checkin_date: '' })).toBeNull();
  });
});

describe('mapTransportationToEvent', () => {
  const base: Transportation = {
    id: 'tr1', trip_id: 't1', type: 'flight', provider: 'AF',
    details: null, confirmation_number: null,
    start_date: '2026-06-30', start_time: '09:00:00',
    end_date: '2026-06-30', end_time: '11:30:00',
    departure_location: 'JFK', arrival_location: 'CDG',
    cost: null, currency: null, is_paid: false, created_at: '',
  };
  it('renders a same-day timed flight as a time block', () => {
    const e = mapTransportationToEvent(base);
    expect(e).toMatchObject({ id: 'transportation:tr1', allDay: false, start: '2026-06-30T09:00:00', end: '2026-06-30T11:30:00' });
    expect(e?.title).toBe('Flight: JFK to CDG');
  });
  it('renders a multi-day trip as an all-day span with exclusive end', () => {
    const e = mapTransportationToEvent({ ...base, end_date: '2026-07-02' });
    expect(e).toMatchObject({ allDay: true, start: '2026-06-30', end: '2026-07-03' });
  });
  it('renders an all-day span when a same-day item has no start time', () => {
    const e = mapTransportationToEvent({ ...base, start_time: null, end_time: null });
    expect(e).toMatchObject({ allDay: true, start: '2026-06-30', end: '2026-07-01' });
  });
  it('titles by provider when locations are absent', () => {
    expect(transportationTitle({ ...base, departure_location: null, arrival_location: null })).toBe('Flight · AF');
  });
});

describe('buildDropPatch', () => {
  it('retimes a timed activity and re-derives its date', () => {
    const patch = buildDropPatch({
      eventId: 'activity:a1',
      newStart: new Date(2026, 6, 2, 9, 15),   // 2026-07-02 09:15 local
      newEnd: new Date(2026, 6, 2, 10, 0),
      allDay: false,
    });
    expect(patch).toEqual({ entityType: 'activity', recordId: 'a1', date: '2026-07-02', startTime: '09:15', endTime: '10:00' });
  });
  it('moves an untimed activity to a new date with null times', () => {
    const patch = buildDropPatch({ eventId: 'activity:a1', newStart: new Date(2026, 6, 5), newEnd: null, allDay: true });
    expect(patch).toEqual({ entityType: 'activity', recordId: 'a1', date: '2026-07-05', startTime: null, endTime: null });
  });
  it('retimes dining to a point in time', () => {
    const patch = buildDropPatch({ eventId: 'dining:r1', newStart: new Date(2026, 6, 2, 19, 30), newEnd: null, allDay: false });
    expect(patch).toEqual({ entityType: 'dining', recordId: 'r1', date: '2026-07-02', time: '19:30' });
  });
  it('converts an all-day accommodation span back to inclusive checkout (exclusive end - 1)', () => {
    const patch = buildDropPatch({
      eventId: 'accommodation:s1',
      newStart: new Date(2026, 6, 1),
      newEnd: new Date(2026, 6, 5),   // exclusive
      allDay: true,
    });
    expect(patch).toEqual({ entityType: 'accommodation', recordId: 's1', checkinDate: '2026-07-01', checkoutDate: '2026-07-04' });
  });
  it('moves a multi-day transportation span (exclusive end - 1)', () => {
    const patch = buildDropPatch({ eventId: 'transportation:tr1', newStart: new Date(2026, 6, 1), newEnd: new Date(2026, 6, 3), allDay: true });
    expect(patch).toEqual({ entityType: 'transportation', recordId: 'tr1', startDate: '2026-07-01', startTime: null, endDate: '2026-07-02', endTime: null });
  });
});

describe('isDateWithinTripRange', () => {
  it('accepts dates on or within the inclusive range', () => {
    expect(isDateWithinTripRange('2026-06-30', '2026-06-30', '2026-07-06')).toBe(true);
    expect(isDateWithinTripRange('2026-07-06', '2026-06-30', '2026-07-06')).toBe(true);
    expect(isDateWithinTripRange('2026-07-03', '2026-06-30', '2026-07-06')).toBe(true);
  });
  it('rejects dates before or after the range', () => {
    expect(isDateWithinTripRange('2026-06-29', '2026-06-30', '2026-07-06')).toBe(false);
    expect(isDateWithinTripRange('2026-07-07', '2026-06-30', '2026-07-06')).toBe(false);
  });
});
