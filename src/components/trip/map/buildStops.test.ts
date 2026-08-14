import { describe, it, expect } from 'vitest';
import type {
  DayActivity,
  HotelStay,
  RestaurantReservation,
  Transportation,
  TripDay,
} from '@/types/trip';
import { buildTripStops, buildDayFrames, toMinutes, tripDatesFrom } from './buildStops';
import type { BuildStopsInput } from './buildStops';
import { TIER_ANCHOR_END, TIER_ANCHOR_START } from './stopModel';

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

function day(day_id: string, date: string, activities: DayActivity[] = []): TripDay {
  return {
    day_id,
    trip_id: 'trip-1',
    date,
    title: null,
    description: null,
    image_url: null,
    created_at: '',
    activities,
  };
}

function activity(over: Partial<DayActivity> & { id: string; day_id: string }): DayActivity {
  return {
    trip_id: 'trip-1',
    title: 'Activity',
    cost: null,
    currency: null,
    order_index: 0,
    created_at: '',
    is_paid: false,
    location_place_id: 'place-act',
    ...over,
  } as DayActivity;
}

function dining(
  over: Partial<RestaurantReservation> & { id: string; day_id: string },
): RestaurantReservation {
  return {
    trip_id: 'trip-1',
    restaurant_name: 'Restaurant',
    reservation_time: null,
    number_of_people: null,
    notes: null,
    confirmation_number: null,
    cost: null,
    currency: null,
    is_paid: false,
    address: null,
    phone_number: null,
    place_id: 'place-dine',
    rating: null,
    created_at: '',
    order_index: 0,
    ...over,
  } as RestaurantReservation;
}

function stay(over: Partial<HotelStay> & { stay_id: string }): HotelStay {
  return {
    trip_id: 'trip-1',
    hotel: 'Hotel',
    hotel_checkin_date: '2026-05-04',
    hotel_checkout_date: '2026-05-08',
    checkin_time: '',
    checkout_time: '',
    hotel_details: null,
    hotel_url: null,
    cost: null,
    currency: null,
    hotel_address: null,
    hotel_phone: null,
    hotel_place_id: 'place-hotel',
    hotel_website: null,
    created_at: '',
    ...over,
  } as HotelStay;
}

function transport(over: Partial<Transportation> & { id: string }): Transportation {
  return {
    trip_id: 'trip-1',
    type: 'flight',
    provider: null,
    details: null,
    confirmation_number: null,
    start_date: '2026-05-04',
    start_time: null,
    end_date: null,
    end_time: null,
    departure_location: null,
    arrival_location: null,
    cost: null,
    currency: null,
    is_paid: false,
    created_at: '',
    ...over,
  } as Transportation;
}

function build(over: Partial<BuildStopsInput> = {}) {
  return buildTripStops({
    days: [],
    reservations: [],
    stays: [],
    transportation: [],
    ...over,
  });
}

const titlesOn = (stops: ReturnType<typeof build>, date: string) =>
  stops.filter((s) => s.date === date).map((s) => s.title);

/* ------------------------------------------------------------------ */

describe('toMinutes', () => {
  it('parses HH:mm and HH:mm:ss without converting zones', () => {
    expect(toMinutes('09:30')).toBe(570);
    expect(toMinutes('09:30:00')).toBe(570);
    expect(toMinutes('00:00')).toBe(0);
    expect(toMinutes('23:59')).toBe(1439);
  });

  it('rejects empty and malformed values', () => {
    expect(toMinutes(null)).toBeNull();
    expect(toMinutes('')).toBeNull();
    expect(toMinutes('not a time')).toBeNull();
    expect(toMinutes('25:00')).toBeNull();
    expect(toMinutes('10:75')).toBeNull();
  });
});

describe('buildTripStops — the driving scenario', () => {
  it('puts a 3pm hotel check-in immediately after a noon reservation', () => {
    const stops = build({
      days: [day('d1', '2026-05-06')],
      reservations: [
        dining({ id: 'r1', day_id: 'd1', restaurant_name: 'Le Comptoir', reservation_time: '12:00' }),
      ],
      stays: [
        stay({
          stay_id: 's1',
          hotel: 'Hotel Danieli',
          hotel_checkin_date: '2026-05-06',
          hotel_checkout_date: '2026-05-09',
          checkin_time: '15:00',
        }),
      ],
    });

    const onDay = stops.filter((s) => s.date === '2026-05-06');
    expect(onDay.map((s) => s.title)).toEqual(['Le Comptoir', 'Hotel Danieli']);
    expect(onDay.map((s) => s.sequence)).toEqual([1, 2]);
    expect(onDay[1].kind).toBe('accommodation-checkin');
    expect(onDay[1].timed).toBe(true);
  });
});

describe('buildTripStops — flights split into two stops', () => {
  it('emits a departure and an arrival sharing one record', () => {
    const stops = build({
      transportation: [
        transport({
          id: 't1',
          departure_location: 'Charles de Gaulle Airport (CDG)',
          arrival_location: 'John F Kennedy Airport (JFK)',
          start_date: '2026-05-04',
          start_time: '10:00',
          end_time: '13:00',
        }),
      ],
    });

    expect(stops).toHaveLength(2);
    expect(stops[0].kind).toBe('transport-departure');
    expect(stops[1].kind).toBe('transport-arrival');
    expect(stops[0].recordId).toBe(stops[1].recordId);
    expect(stops[0].id).not.toBe(stops[1].id);
  });

  it('orders departure before arrival even when no arrival time is stored', () => {
    const stops = build({
      transportation: [
        transport({
          id: 't1',
          departure_location: 'Gare de Lyon',
          arrival_location: 'Gare de Nice',
          start_date: '2026-05-04',
          start_time: '08:00',
          type: 'train',
        }),
      ],
    });

    expect(stops.map((s) => s.kind)).toEqual(['transport-departure', 'transport-arrival']);
    expect(stops[1].timed).toBe(false);
  });

  it('splits an overnight red-eye across two dates', () => {
    const stops = build({
      transportation: [
        transport({
          id: 't1',
          departure_location: 'LAX',
          arrival_location: 'LHR',
          start_date: '2026-05-04',
          start_time: '23:00',
          end_date: '2026-05-05',
          end_time: '02:00',
        }),
      ],
    });

    expect(stops[0].date).toBe('2026-05-04');
    expect(stops[1].date).toBe('2026-05-05');
    expect(stops[0].sequence).toBe(1);
    expect(stops[1].sequence).toBe(1);
  });

  it('lands an arriving flight before a departing one at the same minute', () => {
    const stops = build({
      transportation: [
        transport({ id: 'out', departure_location: 'LHR', start_date: '2026-05-04', start_time: '09:00' }),
        transport({ id: 'in', arrival_location: 'CDG', start_date: '2026-05-04', end_time: '09:00' }),
      ],
    });

    expect(stops.map((s) => s.kind)).toEqual(['transport-arrival', 'transport-departure']);
  });
});

describe('buildTripStops — hotel anchors', () => {
  const stays = [
    stay({
      stay_id: 's1',
      hotel: 'Hotel Danieli',
      hotel_checkin_date: '2026-05-04',
      hotel_checkout_date: '2026-05-07',
    }),
  ];

  it('does not anchor the start of the check-in day', () => {
    const stops = build({
      days: [day('d1', '2026-05-04', [activity({ id: 'a1', day_id: 'd1', title: 'Museum', start_time: '10:00' })])],
      stays,
    });

    const onDay = stops.filter((s) => s.date === '2026-05-04');
    expect(onDay[0].title).toBe('Museum');
    expect(onDay.some((s) => s.sortTier === TIER_ANCHOR_START)).toBe(false);
  });

  it('brackets an intermediate day with both anchors', () => {
    const stops = build({
      days: [day('d2', '2026-05-05', [activity({ id: 'a1', day_id: 'd2', title: 'Museum', start_time: '10:00' })])],
      stays,
    });

    const onDay = stops.filter((s) => s.date === '2026-05-05');
    expect(onDay.map((s) => s.title)).toEqual(['Hotel Danieli', 'Museum', 'Hotel Danieli']);
    expect(onDay[0].sortTier).toBe(TIER_ANCHOR_START);
    expect(onDay[2].sortTier).toBe(TIER_ANCHOR_END);
  });

  it('leaves anchors out of the sequence numbering', () => {
    const stops = build({
      days: [
        day('d2', '2026-05-05', [
          activity({ id: 'a1', day_id: 'd2', title: 'Museum', start_time: '10:00' }),
          activity({ id: 'a2', day_id: 'd2', title: 'Park', start_time: '14:00' }),
        ]),
      ],
      stays,
    });

    const onDay = stops.filter((s) => s.date === '2026-05-05');
    expect(onDay.map((s) => s.sequence)).toEqual([null, 1, 2, null]);
    expect(onDay.filter((s) => s.synthetic)).toHaveLength(2);
  });

  it('starts the checkout day at the hotel and ends it elsewhere', () => {
    const stops = build({
      days: [day('d4', '2026-05-07', [activity({ id: 'a1', day_id: 'd4', title: 'Airport run', start_time: '14:00' })])],
      stays,
    });

    const onDay = stops.filter((s) => s.date === '2026-05-07');
    // The day starts at the hotel via the check-out stop itself — an extra
    // start anchor would stack a second star on the same coordinate.
    expect(onDay[0].kind).toBe('accommodation-checkout');
    expect(onDay[0].title).toBe('Hotel Danieli');
    expect(onDay.some((s) => s.sortTier === TIER_ANCHOR_START)).toBe(false);
    expect(onDay.some((s) => s.sortTier === TIER_ANCHOR_END)).toBe(false);
    expect(onDay[onDay.length - 1].title).toBe('Airport run');
  });

  it('suppresses the end anchor when the day already ends at that hotel', () => {
    const stops = build({
      days: [day('d1', '2026-05-04')],
      stays,
    });

    const onDay = stops.filter((s) => s.date === '2026-05-04');
    expect(onDay).toHaveLength(1);
    expect(onDay[0].kind).toBe('accommodation-checkin');
  });

  it('shows one star, not two, for a day spent entirely at the hotel', () => {
    const stops = build({ stays });
    const onDay = stops.filter((s) => s.date === '2026-05-05');
    expect(onDay).toHaveLength(1);
    expect(onDay[0].sortTier).toBe(TIER_ANCHOR_START);
  });

  it('gives every stop a unique id across the whole trip', () => {
    // A stay anchors every night it covers, so anchor ids must carry the date —
    // otherwise whole-trip mode renders the same id once per night.
    const stops = build({
      days: [day('d1', '2026-05-04'), day('d2', '2026-05-05'), day('d3', '2026-05-06')],
      stays: [
        stay({
          stay_id: 's1',
          hotel: 'Hotel Danieli',
          hotel_checkin_date: '2026-05-04',
          hotel_checkout_date: '2026-05-07',
        }),
      ],
    });

    const ids = stops.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(stops.filter((s) => s.synthetic).length).toBeGreaterThan(1);
  });

  it('handles back-to-back stays checking out and in on the same day', () => {
    const stops = build({
      days: [day('d1', '2026-05-07')],
      stays: [
        stay({ stay_id: 's1', hotel: 'First', hotel_checkin_date: '2026-05-04', hotel_checkout_date: '2026-05-07' }),
        stay({ stay_id: 's2', hotel: 'Second', hotel_checkin_date: '2026-05-07', hotel_checkout_date: '2026-05-10' }),
      ],
    });

    // No anchors: both ends of the day are already real hotel stops.
    expect(titlesOn(stops, '2026-05-07')).toEqual(['First', 'Second']);
    const real = stops.filter((s) => s.date === '2026-05-07' && !s.synthetic);
    expect(real.map((s) => s.kind)).toEqual(['accommodation-checkout', 'accommodation-checkin']);
    expect(stops.filter((s) => s.date === '2026-05-07' && s.synthetic)).toEqual([]);
  });

  it('defaults a missing check-in time to mid-afternoon but marks it inferred', () => {
    const stops = build({
      days: [day('d1', '2026-05-04', [activity({ id: 'a1', day_id: 'd1', title: 'Lunch', start_time: '12:00' })])],
      stays: [stay({ stay_id: 's1', hotel: 'Hotel', hotel_checkin_date: '2026-05-04', hotel_checkout_date: '2026-05-06' })],
    });

    const checkin = stops.find((s) => s.kind === 'accommodation-checkin')!;
    expect(checkin.sortMinutes).toBe(15 * 60);
    expect(checkin.timed).toBe(false);
    expect(checkin.time).toBeNull();
    expect(titlesOn(stops, '2026-05-04')).toEqual(['Lunch', 'Hotel']);
  });
});

describe('buildTripStops — untimed items', () => {
  it('sorts untimed items after every timed one, by order_index', () => {
    const stops = build({
      days: [
        day('d1', '2026-05-04', [
          activity({ id: 'a1', day_id: 'd1', title: 'Untimed B', order_index: 1 }),
          activity({ id: 'a2', day_id: 'd1', title: 'Timed', start_time: '18:00', order_index: 9 }),
          activity({ id: 'a3', day_id: 'd1', title: 'Untimed A', order_index: 0 }),
        ]),
      ],
    });

    expect(titlesOn(stops, '2026-05-04')).toEqual(['Timed', 'Untimed A', 'Untimed B']);
  });

  it('degrades a fully untimed day to plain order_index order', () => {
    const stops = build({
      days: [
        day('d1', '2026-05-04', [
          activity({ id: 'a1', day_id: 'd1', title: 'Third', order_index: 2 }),
          activity({ id: 'a2', day_id: 'd1', title: 'First', order_index: 0 }),
          activity({ id: 'a3', day_id: 'd1', title: 'Second', order_index: 1 }),
        ]),
      ],
    });

    expect(titlesOn(stops, '2026-05-04')).toEqual(['First', 'Second', 'Third']);
  });
});

describe('buildTripStops — locations', () => {
  it('keeps the sequence number of a stop with no resolvable location', () => {
    const stops = build({
      days: [
        day('d1', '2026-05-04', [
          activity({ id: 'a1', day_id: 'd1', title: 'Museum', start_time: '09:00' }),
          activity({
            id: 'a2',
            day_id: 'd1',
            title: 'Beach day',
            start_time: '12:00',
            location_place_id: null,
            location_address: null,
          }),
          activity({ id: 'a3', day_id: 'd1', title: 'Dinner spot', start_time: '19:00' }),
        ]),
      ],
    });

    const onDay = stops.filter((s) => s.date === '2026-05-04');
    expect(onDay.map((s) => s.sequence)).toEqual([1, 2, 3]);
    expect(onDay[1].locator).toBeNull();
    expect(onDay[0].locator).not.toBeNull();
    expect(onDay[2].locator).not.toBeNull();
  });

  it('numbers identically no matter which locations exist', () => {
    const withLocations = build({
      days: [
        day('d1', '2026-05-04', [
          activity({ id: 'a1', day_id: 'd1', title: 'One', start_time: '09:00' }),
          activity({ id: 'a2', day_id: 'd1', title: 'Two', start_time: '12:00' }),
        ]),
      ],
    });
    const withNone = build({
      days: [
        day('d1', '2026-05-04', [
          activity({ id: 'a1', day_id: 'd1', title: 'One', start_time: '09:00', location_place_id: null }),
          activity({ id: 'a2', day_id: 'd1', title: 'Two', start_time: '12:00', location_place_id: null }),
        ]),
      ],
    });

    expect(withNone.map((s) => [s.id, s.sequence])).toEqual(
      withLocations.map((s) => [s.id, s.sequence]),
    );
  });

  it('prefers place_id over address', () => {
    const stops = build({
      days: [
        day('d1', '2026-05-04', [
          activity({
            id: 'a1',
            day_id: 'd1',
            start_time: '09:00',
            location_place_id: 'ChIJ123',
            location_address: '5 Rue de Rivoli',
          }),
        ]),
      ],
    });

    expect(stops[0].locator).toEqual({ kind: 'place', placeId: 'ChIJ123' });
  });
});

describe('buildTripStops — edge cases', () => {
  it('returns nothing for an empty trip', () => {
    expect(build()).toEqual([]);
  });

  it('handles transportation on a date with no trip_days row', () => {
    const stops = build({
      days: [day('d1', '2026-05-04')],
      transportation: [
        transport({ id: 't1', departure_location: 'CDG', start_date: '2026-06-01', start_time: '10:00' }),
      ],
    });

    expect(stops).toHaveLength(1);
    expect(stops[0].date).toBe('2026-06-01');
  });

  it('drops a reservation whose day_id has no matching day', () => {
    const stops = build({
      days: [day('d1', '2026-05-04')],
      reservations: [dining({ id: 'r1', day_id: 'ghost-day', reservation_time: '12:00' })],
    });

    expect(stops).toEqual([]);
  });

  it('ignores transportation with no start_date', () => {
    const stops = build({
      transportation: [
        transport({ id: 't1', departure_location: 'CDG', start_date: '' as unknown as string }),
      ],
    });

    expect(stops).toEqual([]);
  });
});

describe('buildDayFrames', () => {
  const stays = [
    stay({
      stay_id: 's1',
      hotel: 'Hotel Danieli',
      hotel_checkin_date: '2026-05-04',
      hotel_checkout_date: '2026-05-06',
    }),
  ];

  it('leaves ghosts off a day that already has anchors', () => {
    const stops = build({
      days: [day('d2', '2026-05-05', [activity({ id: 'a1', day_id: 'd2', title: 'Museum', start_time: '10:00' })])],
      stays,
    });
    const frames = buildDayFrames(stops, tripDatesFrom([], stops));
    const mid = frames.find((f) => f.date === '2026-05-05')!;

    expect(mid.lead).toBeNull();
    expect(mid.trail).toBeNull();
  });

  it('ghosts in the previous and next stop when a day has no anchors', () => {
    const stops = build({
      days: [
        day('d1', '2026-05-04', [activity({ id: 'a1', day_id: 'd1', title: 'Arrive', start_time: '10:00' })]),
        day('d2', '2026-05-05', [activity({ id: 'a2', day_id: 'd2', title: 'Middle', start_time: '10:00' })]),
        day('d3', '2026-05-06', [activity({ id: 'a3', day_id: 'd3', title: 'Depart', start_time: '10:00' })]),
      ],
    });
    const frames = buildDayFrames(stops, tripDatesFrom([], stops));
    const mid = frames.find((f) => f.date === '2026-05-05')!;

    expect(mid.lead?.title).toBe('Arrive');
    expect(mid.trail?.title).toBe('Depart');
  });

  it('produces an empty frame for a day with nothing on it', () => {
    const stops = build({
      days: [day('d1', '2026-05-04', [activity({ id: 'a1', day_id: 'd1', start_time: '10:00' })]), day('d2', '2026-05-05')],
    });
    const frames = buildDayFrames(stops, ['2026-05-04', '2026-05-05']);

    expect(frames).toHaveLength(2);
    expect(frames[1].stops).toEqual([]);
    expect(frames[1].lead?.date).toBe('2026-05-04');
  });
});
