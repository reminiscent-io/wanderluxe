import { useMemo } from 'react';
import type { EventInput } from '@fullcalendar/core';
import { useTripDays } from '@/hooks/use-trip-days';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { useTransportationEvents } from '@/hooks/use-transportation-events';
import { useTripTimezone } from '@/hooks/useTripTimezone';
import { useTripReservations } from './useTripReservations';
import {
  mapActivityToEvent,
  mapReservationToEvent,
  mapAccommodationToEvent,
  mapTransportationToEvent,
} from './eventMapping';

export function useCalendarEvents(tripId: string): { events: EventInput[]; isLoading: boolean } {
  const { days } = useTripDays(tripId);
  const { events: stays } = useTimelineEvents(tripId);
  const { transportationData } = useTransportationEvents(tripId);
  const { data: reservations, isLoading: reservationsLoading } = useTripReservations(tripId);
  const { tripTimezone } = useTripTimezone(tripId);

  const events = useMemo(() => {
    const out: EventInput[] = [];
    const dayDate = new Map<string, string>();
    (days ?? []).forEach((day) => {
      dayDate.set(day.day_id, day.date);
      (day.activities ?? []).forEach((activity) => {
        const e = mapActivityToEvent(activity, day.date, tripTimezone);
        if (e) out.push(e);
      });
    });
    (reservations ?? []).forEach((reservation) => {
      const e = mapReservationToEvent(reservation, dayDate.get(reservation.day_id) ?? '', tripTimezone);
      if (e) out.push(e);
    });
    (stays ?? []).forEach((stay) => {
      const e = mapAccommodationToEvent(stay);
      if (e) out.push(e);
    });
    (transportationData ?? []).forEach((t) => {
      const e = mapTransportationToEvent(t, tripTimezone);
      if (e) out.push(e);
    });
    return out;
  }, [days, reservations, stays, transportationData, tripTimezone]);

  const isLoading = !days || reservationsLoading;
  return { events, isLoading };
}
