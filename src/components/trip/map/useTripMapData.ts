import { useMemo } from 'react';
import { useTripDays } from '@/hooks/use-trip-days';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { useTransportationEvents } from '@/hooks/use-transportation-events';
import { useTripReservations } from '../calendar/useTripReservations';
import { buildDayFrames, buildTripStops, tripDatesFrom } from './buildStops';
import type { DayFrame, LatLng, MapStop } from './stopModel';

export interface TripMapData {
  /** Every stop, chronologically ordered across the whole trip. */
  stops: MapStop[];
  /** Per-day slices with lead/trail ghosts. */
  frames: DayFrame[];
  /** Ordered YYYY-MM-DD list for the day scrubber. */
  dates: string[];
  isLoading: boolean;
}

/**
 * Composes the same five sources the calendar reads, then projects them through
 * the pure ordering engine. Mirrors `useCalendarEvents` — including the
 * day_id → date join, since reservations and activities carry a day_id rather
 * than a date.
 */
export function useTripMapData(tripId: string, destinationBias?: LatLng | null): TripMapData {
  const { days } = useTripDays(tripId);
  const { events: stays } = useTimelineEvents(tripId);
  const { transportationData } = useTransportationEvents(tripId);
  const { data: reservations, isLoading: reservationsLoading } = useTripReservations(tripId);

  const stops = useMemo(
    () =>
      buildTripStops({
        days: days ?? [],
        reservations: reservations ?? [],
        stays: stays ?? [],
        transportation: transportationData ?? [],
        destinationBias,
      }),
    [days, reservations, stays, transportationData, destinationBias],
  );

  const dates = useMemo(() => tripDatesFrom(days ?? [], stops), [days, stops]);
  const frames = useMemo(() => buildDayFrames(stops, dates), [stops, dates]);

  return { stops, frames, dates, isLoading: !days || reservationsLoading };
}
