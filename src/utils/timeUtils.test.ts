import { describe, it, expect } from 'vitest';
import {
  toHHMM,
  explicitReservationEnd,
  toMinutesOfDay,
  addMinutesToTime,
  defaultReservationEnd,
  effectiveReservationEnd,
  durationMinutes,
  formatDurationShort,
  DEFAULT_RESERVATION_DURATION_MINUTES,
} from './timeUtils';

describe('toHHMM', () => {
  it('accepts what Postgres returns and what the app writes', () => {
    expect(toHHMM('19:30:00')).toBe('19:30');
    expect(toHHMM('19:30')).toBe('19:30');
    expect(toHHMM('9:05')).toBe('09:05');
    expect(toHHMM(' 19:30 ')).toBe('19:30');
  });

  it('returns null for anything that is not a wall-clock time', () => {
    expect(toHHMM(null)).toBeNull();
    expect(toHHMM(undefined)).toBeNull();
    expect(toHHMM('')).toBeNull();
    expect(toHHMM('not a time')).toBeNull();
    expect(toHHMM('24:00')).toBeNull();
    expect(toHHMM('19:60')).toBeNull();
  });
});

describe('toMinutesOfDay', () => {
  it('counts from midnight', () => {
    expect(toMinutesOfDay('00:00')).toBe(0);
    expect(toMinutesOfDay('19:30:00')).toBe(19 * 60 + 30);
    expect(toMinutesOfDay('23:59')).toBe(1439);
    expect(toMinutesOfDay('bad')).toBeNull();
  });
});

describe('addMinutesToTime', () => {
  it('adds within the day', () => {
    expect(addMinutesToTime('19:30', 90)).toBe('21:00');
    expect(addMinutesToTime('19:30:00', 90)).toBe('21:00');
    expect(addMinutesToTime('08:45', 30)).toBe('09:15');
  });

  it('clamps at 23:59 instead of wrapping past midnight', () => {
    // Wrapping would produce an end that sorts before its start, and nothing in
    // the schema carries an end date to disambiguate.
    expect(addMinutesToTime('23:00', 90)).toBe('23:59');
    expect(addMinutesToTime('22:45', 90)).toBe('23:59');
  });

  it('returns null when clamping leaves no room to move', () => {
    expect(addMinutesToTime('23:59', 90)).toBeNull();
    expect(addMinutesToTime('19:30', 0)).toBeNull();
    expect(addMinutesToTime(null, 90)).toBeNull();
  });
});

describe('defaultReservationEnd', () => {
  it('is 90 minutes after the start', () => {
    expect(DEFAULT_RESERVATION_DURATION_MINUTES).toBe(90);
    expect(defaultReservationEnd('19:30')).toBe('21:00');
    expect(defaultReservationEnd('12:00:00')).toBe('13:30');
  });

  it('has nothing to offer without a start', () => {
    expect(defaultReservationEnd(null)).toBeNull();
    expect(defaultReservationEnd('')).toBeNull();
  });
});

describe('explicitReservationEnd', () => {
  it('returns only an end the user actually entered', () => {
    expect(explicitReservationEnd('19:30', '23:00')).toBe('23:00');
    expect(explicitReservationEnd('19:30:00', '23:00:00')).toBe('23:00');
  });

  it('is null when there is no end, so readers omit it rather than inventing one', () => {
    expect(explicitReservationEnd('19:30', null)).toBeNull();
    expect(explicitReservationEnd('19:30', '')).toBeNull();
    expect(explicitReservationEnd(null, '21:00')).toBeNull();
  });

  it('rejects an end that is not after the start', () => {
    expect(explicitReservationEnd('19:30', '19:30')).toBeNull();
    expect(explicitReservationEnd('20:00', '00:30')).toBeNull();
  });
});

describe('effectiveReservationEnd', () => {
  it('prefers an explicit end', () => {
    expect(effectiveReservationEnd('19:30', '23:00')).toBe('23:00');
    expect(effectiveReservationEnd('19:30:00', '23:00:00')).toBe('23:00');
  });

  it('falls back to the 90-minute default when no end was stated', () => {
    expect(effectiveReservationEnd('19:30', null)).toBe('21:00');
    expect(effectiveReservationEnd('19:30', '')).toBe('21:00');
  });

  it('falls back to the default when the stored end is unusable', () => {
    expect(effectiveReservationEnd('19:30', '19:30')).toBe('21:00');
    expect(effectiveReservationEnd('20:00', '00:30')).toBe('21:30');
  });

  it('is null without a start, so callers emit no end at all', () => {
    expect(effectiveReservationEnd(null, '21:00')).toBeNull();
  });
});

describe('durationMinutes', () => {
  it('measures a wall-clock span, in either stored shape', () => {
    expect(durationMinutes('19:30', '21:00')).toBe(90);
    expect(durationMinutes('19:30:00', '21:00:00')).toBe(90);
    expect(durationMinutes('12:00', '12:45')).toBe(45);
  });

  it('is null when the pair cannot describe a duration', () => {
    expect(durationMinutes('19:30', '19:30')).toBeNull();
    expect(durationMinutes('20:00', '00:30')).toBeNull();
    expect(durationMinutes('19:30', null)).toBeNull();
    expect(durationMinutes(null, '21:00')).toBeNull();
    expect(durationMinutes('19:30', '')).toBeNull();
  });
});

describe('formatDurationShort', () => {
  it('drops the empty half of the label', () => {
    expect(formatDurationShort(45)).toBe('45m');
    expect(formatDurationShort(60)).toBe('1h');
    expect(formatDurationShort(120)).toBe('2h');
    expect(formatDurationShort(95)).toBe('1h 35m');
    expect(formatDurationShort(DEFAULT_RESERVATION_DURATION_MINUTES)).toBe('1h 30m');
  });
});
