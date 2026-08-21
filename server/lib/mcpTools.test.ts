import { describe, expect, it } from 'vitest';
import { timezoneField, GET_TRIP_SELECT } from './mcpTools';

describe('timezoneField', () => {
  it('accepts real IANA zone ids', () => {
    expect(timezoneField.safeParse('Europe/Paris').success).toBe(true);
    expect(timezoneField.safeParse('Asia/Tokyo').success).toBe(true);
  });

  it('rejects strings Intl cannot resolve as a zone', () => {
    expect(timezoneField.safeParse('Paris').success).toBe(false);
    expect(timezoneField.safeParse('Not/AZone').success).toBe(false);
    expect(timezoneField.safeParse('').success).toBe(false);
  });
});

describe('GET_TRIP_SELECT', () => {
  it('exposes timezone metadata on the trip and every timed entity', () => {
    expect(GET_TRIP_SELECT.trip.split(',')).toContain('timezone');
    expect(GET_TRIP_SELECT.activities.split(',')).toContain('timezone');
    expect(GET_TRIP_SELECT.dining.split(',')).toContain('timezone');
    expect(GET_TRIP_SELECT.accommodations.split(',')).toContain('timezone');
    expect(GET_TRIP_SELECT.transportation.split(',')).toContain('departure_timezone');
    expect(GET_TRIP_SELECT.transportation.split(',')).toContain('arrival_timezone');
  });

  it('reads the reservation end time back on get_trip', () => {
    // An explicit column list drops a new field silently — no type error, no
    // runtime error, just missing data.
    expect(GET_TRIP_SELECT.dining.split(',')).toContain('end_time');
  });
});
