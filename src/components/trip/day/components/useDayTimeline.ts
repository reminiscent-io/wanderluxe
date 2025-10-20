import { useMemo } from 'react';
import { format, parseISO, isToday } from 'date-fns';
import { DayActivity, HotelStay, Transportation, RestaurantReservation } from '@/types/trip';
import {
  TimelineItem,
  TimelineRenderRow,
  TimelineType,
  getTransportationIconComponent,
  getNormalizedDay,
  combineDateAndTime,
  extractIata,
  diffMinutes,
  humanizeMinutes,
} from './timeline-utils';

type UseDayTimelineInput = {
  dateISO: string;
  activities: DayActivity[];
  hotelStays: HotelStay[];
  transportations: Transportation[];
  reservations: RestaurantReservation[];
};

type UseDayTimelineOutput = {
  normalizedDay: string;
  formattedDate: string;
  isTodayFlag: boolean;
  filteredHotelStays: HotelStay[];
  allDayHotels: HotelStay[];
  timelineItems: TimelineItem[];
  rows: TimelineRenderRow[];        // items + subtle layover hints
  summary: string;
  isCheckInDay: boolean;
  isCheckOutDay: boolean;
  isTravelDay: boolean;
  totalEvents: number;              // hints don’t count
};

export function useDayTimeline({
  dateISO,
  activities,
  hotelStays,
  transportations,
  reservations,
}: UseDayTimelineInput): UseDayTimelineOutput {

  const normalizedDay = useMemo(() => getNormalizedDay(dateISO), [dateISO]);
  const formattedDate = useMemo(() => format(parseISO(dateISO), 'MMM d'), [dateISO]);
  const isTodayFlag = isToday(parseISO(dateISO));

  // Filter hotel stays for this day
  const filteredHotelStays = useMemo(() => {
    return hotelStays.filter((stay) => {
      if (!stay.hotel_checkin_date || !stay.hotel_checkout_date) return false;
      const dayDate = new Date(normalizedDay);
      return dayDate >= new Date(stay.hotel_checkin_date) &&
             dayDate <= new Date(stay.hotel_checkout_date);
    });
  }, [hotelStays, normalizedDay]);

  const allDayHotels = useMemo(() => {
    return filteredHotelStays.filter(stay => 
      stay.hotel_checkin_date !== normalizedDay && stay.hotel_checkout_date !== normalizedDay
    );
  }, [filteredHotelStays, normalizedDay]);

  // Filter transportations for this day
  const filteredTransportations = useMemo(() => {
    const list = transportations || [];
    return list.filter((t) => {
      const start = t.start_date;
      const end = t.end_date ? t.end_date : start;
      const dayDate = new Date(normalizedDay);
      return dayDate >= new Date(start) && dayDate <= new Date(end);
    });
  }, [transportations, normalizedDay]);

  // Build timeline items
  const timelineItems: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];

    // Activities
    for (const activity of activities) {
      if (!activity.id) continue;
      items.push({
        type: 'activity',
        time: activity.start_time || undefined,
        endTime: activity.end_time || undefined,
        title: activity.title,
        description: activity.description || undefined,
        icon: <span className="inline-block" />, // icon injected in row via CSS color
        id: activity.id,
        data: activity,
      });
    }

    // Hotels (check-in/out)
    for (const stay of filteredHotelStays) {
      if (stay.hotel_checkin_date === normalizedDay && stay.checkin_time) {
        items.push({
          type: 'hotel',
          time: stay.checkin_time,
          title: `Check-in: ${stay.hotel}`,
          description: stay.hotel_address,
          icon: <span className="inline-block" />,
          id: `checkin-${stay.stay_id}`,
          data: stay,
        });
      }
      if (stay.hotel_checkout_date === normalizedDay && stay.checkout_time) {
        items.push({
          type: 'hotel',
          time: stay.checkout_time,
          title: `Check-out: ${stay.hotel}`,
          icon: <span className="inline-block" />,
          id: `checkout-${stay.stay_id}`,
          data: stay,
        });
      }
    }

    // Transportation
    for (const t of filteredTransportations) {
      const typeLabel =
        t.type === 'flight' ? 'Flight' :
        t.type === 'train' ? 'Train' :
        t.type === 'car' ? 'Car' :
        t.type === 'bus' ? 'Bus' : 'Transport';

      const startDate = t.start_date;
      const endDate   = t.end_date || startDate;
      const isStartDay = normalizedDay === startDate;
      const isEndDay   = normalizedDay === endDate;
      const isMultiDay = startDate !== endDate;

      let displayTime: string | undefined;
      let title: string;

      if (isMultiDay) {
        if (isStartDay) {
          displayTime = t.start_time || undefined;
          title = `${typeLabel} Departure: ${t.departure_location || 'Departure'}`;
        } else if (isEndDay) {
          displayTime = t.end_time || undefined;
          title = `${typeLabel} Arrival: ${t.arrival_location || 'Arrival'}`;
        } else {
          displayTime = undefined;
          title = `${typeLabel} (In Transit): ${t.departure_location || 'Departure'} → ${t.arrival_location || 'Arrival'}`;
        }
      } else {
        displayTime = t.start_time || undefined;
        title = `${typeLabel}: ${t.departure_location || 'Departure'} → ${t.arrival_location || 'Arrival'}`;
      }

      const departTimeOnThisDay = isStartDay ? t.start_time : undefined;
      const arriveTimeOnThisDay = isEndDay ? t.end_time : (isStartDay && !isMultiDay ? t.end_time : undefined);

      items.push({
        type: 'transportation',
        time: displayTime,
        endTime: departTimeOnThisDay && arriveTimeOnThisDay ? arriveTimeOnThisDay : undefined,
        title,
        description: t.details,
        icon: getTransportationIconComponent(t.type),
        id: t.id,
        data: {
          ...t,
          __depart_time_on_this_day: departTimeOnThisDay,
          __arrive_time_on_this_day: arriveTimeOnThisDay,
        },
      });
    }

    // Dining
    for (const r of reservations || []) {
      if (!r.reservation_time) continue;
      items.push({
        type: 'dining',
        time: r.reservation_time,
        title: r.restaurant_name,
        description: r.notes || undefined,
        icon: <span className="inline-block" />,
        id: r.id,
        data: r,
      });
    }

    // Sort by time (items without time go last)
    items.sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });

    return items;
  }, [activities, filteredHotelStays, filteredTransportations, reservations, normalizedDay]);

  // Compute rows with subtle layover hints
  const rows: TimelineRenderRow[] = useMemo(() => {
    const result: TimelineRenderRow[] = [];
    for (let i = 0; i < timelineItems.length; i++) {
      const curr = timelineItems[i];
      result.push({ kind: 'item', item: curr });

      const next = timelineItems[i + 1];
      if (!next) continue;

      const currIsFlight = curr.type === 'transportation' && curr.data?.type === 'flight';
      const nextIsFlight = next.type === 'transportation' && next.data?.type === 'flight';
      if (!currIsFlight || !nextIsFlight) continue;

      const currArrive = curr.data.__arrive_time_on_this_day;
      const nextDepart = next.data.__depart_time_on_this_day;
      if (!currArrive || !nextDepart) continue;

      const currArriveAirport = extractIata(curr.data?.arrival_location);
      const nextDepartAirport = extractIata(next.data?.departure_location);
      if (!currArriveAirport || currArriveAirport !== nextDepartAirport) continue;

      const arriveAt = combineDateAndTime(normalizedDay, currArrive);
      const departAt = combineDateAndTime(normalizedDay, nextDepart);
      if (!arriveAt || !departAt) continue;

      const mins = diffMinutes(arriveAt, departAt);
      if (!(mins > 0)) continue;

      const text = `Layover • ${humanizeMinutes(mins)}`;
      result.push({ kind: 'hint', id: `layover-${curr.id}-${next.id}`, text });
    }
    return result;
  }, [timelineItems, normalizedDay]);

  // Summary & badges
  const activityCount = activities.length;
  const hotelCount = filteredHotelStays.length;
  const transportCount = filteredTransportations.length;
  const diningCount = (reservations || []).length;

  const summary = useMemo(() => {
    const parts: string[] = [];
    if (activityCount > 0) parts.push(`${activityCount} ${activityCount === 1 ? 'activity' : 'activities'}`);
    if (hotelCount > 0) parts.push(`${hotelCount} hotel`);
    if (transportCount > 0) parts.push(`${transportCount} transport`);
    if (diningCount > 0) parts.push(`${diningCount} dining`);
    return parts.length > 0 ? parts.join(' • ') : 'No plans yet';
  }, [activityCount, hotelCount, transportCount, diningCount]);

  const isCheckInDay  = filteredHotelStays.some(stay => stay.hotel_checkin_date === normalizedDay);
  const isCheckOutDay = filteredHotelStays.some(stay => stay.hotel_checkout_date === normalizedDay);
  const isTravelDay   = filteredTransportations.length > 0;
  const totalEvents   = timelineItems.length; // hints don't count

  return {
    normalizedDay,
    formattedDate,
    isTodayFlag,
    filteredHotelStays,
    allDayHotels,
    timelineItems,
    rows,
    summary,
    isCheckInDay,
    isCheckOutDay,
    isTravelDay,
    totalEvents,
  };
}
