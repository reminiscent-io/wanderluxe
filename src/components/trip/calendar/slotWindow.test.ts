import { describe, it, expect } from 'vitest';
import type { EventInput } from '@fullcalendar/core';
import { computeSlotMinTime, DEFAULT_SLOT_MIN_TIME } from './slotWindow';

function timed(start: string): EventInput {
  return { id: `activity:${start}`, title: 'x', start, allDay: false };
}

function allDay(date: string): EventInput {
  return { id: `accommodation:${date}`, title: 'x', start: date, allDay: true };
}

const RANGE = { start: '2030-03-01', end: '2030-03-04' }; // end exclusive (FullCalendar datesSet semantics)

describe('computeSlotMinTime', () => {
  it('defaults to 7am with no events', () => {
    expect(computeSlotMinTime([], RANGE.start, RANGE.end)).toBe('07:00:00');
    expect(DEFAULT_SLOT_MIN_TIME).toBe('07:00:00');
  });

  it('keeps 7am when all timed events start at or after 7am', () => {
    const events = [timed('2030-03-01T07:00:00'), timed('2030-03-02T14:30:00')];
    expect(computeSlotMinTime(events, RANGE.start, RANGE.end)).toBe('07:00:00');
  });

  it('lowers the start to the floor hour of the earliest pre-7am event in range', () => {
    const events = [timed('2030-03-02T05:45:00'), timed('2030-03-01T14:30:00')];
    expect(computeSlotMinTime(events, RANGE.start, RANGE.end)).toBe('05:00:00');
  });

  it('ignores pre-7am events outside the visible range', () => {
    // 03-04 is the exclusive end; 02-28 is before the range.
    const events = [timed('2030-03-04T05:00:00'), timed('2030-02-28T04:00:00')];
    expect(computeSlotMinTime(events, RANGE.start, RANGE.end)).toBe('07:00:00');
  });

  it('ignores all-day events', () => {
    const events = [allDay('2030-03-01'), allDay('2030-03-02')];
    expect(computeSlotMinTime(events, RANGE.start, RANGE.end)).toBe('07:00:00');
  });

  it('goes all the way to midnight for a very early event', () => {
    const events = [timed('2030-03-01T00:30:00')];
    expect(computeSlotMinTime(events, RANGE.start, RANGE.end)).toBe('00:00:00');
  });

  it('skips events whose start is not a datetime string', () => {
    const events: EventInput[] = [{ id: 'x', title: 'x', start: new Date('2030-03-01T05:00:00'), allDay: false }];
    expect(computeSlotMinTime(events, RANGE.start, RANGE.end)).toBe('07:00:00');
  });
});
