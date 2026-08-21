import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCalendarEvents } from './useCalendarEvents';

vi.mock('@/hooks/use-trip-days', () => ({
  useTripDays: () => ({ days: [{ day_id: 'd1', trip_id: 't1', date: '2026-06-30', title: null, description: null, image_url: null, created_at: '', activities: [{ id: 'a1', day_id: 'd1', trip_id: 't1', title: 'Louvre', start_time: '14:30:00', end_time: '16:00:00', cost: null, currency: null, order_index: 0, created_at: '', is_paid: false }] }] }),
}));
vi.mock('@/hooks/use-timeline-events', () => ({
  useTimelineEvents: () => ({ events: [{ stay_id: 's1', trip_id: 't1', hotel: 'Lutetia', hotel_checkin_date: '2026-06-30', hotel_checkout_date: '2026-07-02', checkin_time: '15:00', checkout_time: '11:00', hotel_details: null, hotel_url: null, cost: null, currency: null, hotel_address: null, hotel_phone: null, hotel_place_id: null, hotel_website: null, created_at: '' }] }),
}));
vi.mock('@/hooks/use-transportation-events', () => ({
  useTransportationEvents: () => ({ transportationData: [{ id: 'tr1', trip_id: 't1', type: 'flight', provider: null, details: null, confirmation_number: null, start_date: '2026-06-30', start_time: '09:00:00', end_date: '2026-06-30', end_time: '11:00:00', departure_location: 'JFK', arrival_location: 'CDG', cost: null, currency: null, is_paid: false, created_at: '' }] }),
}));
vi.mock('./useTripReservations', () => ({
  useTripReservations: () => ({ data: [{ id: 'r1', day_id: 'd1', trip_id: 't1', restaurant_name: 'Septime', reservation_time: '20:00:00', end_time: null, number_of_people: 2, notes: null, confirmation_number: null, cost: null, currency: null, is_paid: false, address: null, phone_number: null, place_id: null, rating: null, created_at: '', order_index: 0 }], isLoading: false }),
}));
// useCalendarEvents calls useTripTimezone internally (Task 12). It's backed by
// useQuery/useTripPermissions which need a QueryClientProvider this test doesn't
// set up, so mock it directly — assertions below are unaffected by tripTimezone.
vi.mock('@/hooks/useTripTimezone', () => ({
  useTripTimezone: () => ({ tripTimezone: null, isLoading: false }),
}));

describe('useCalendarEvents', () => {
  it('flattens all four entity sources into namespaced events', () => {
    const { result } = renderHook(() => useCalendarEvents('t1'));
    const ids = result.current.events.map((e) => e.id).sort();
    expect(ids).toEqual(['accommodation:s1', 'activity:a1', 'dining:r1', 'transportation:tr1']);
    const dining = result.current.events.find((e) => e.id === 'dining:r1');
    expect(dining).toMatchObject({ start: '2026-06-30T20:00:00', allDay: false });
  });
});
