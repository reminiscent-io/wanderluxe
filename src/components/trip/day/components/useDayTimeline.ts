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
  getTimePeriod,
  getPeriodLabel,
  getPeriodOrder,
  TimePeriod,
  groupSimilarEvents,
  generateGroupTitle,
  generateGroupTimeRange,
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
  periodGroups: TimelinePeriodGroup[]; // grouped by time period
  summary: string;
  isCheckInDay: boolean;
  isCheckOutDay: boolean;
  isTravelDay: boolean;
  totalEvents: number;              // hints don't count
};

export interface TimelinePeriodGroup {
  period: TimePeriod;
  label: string;
  rows: TimelineRenderRow[];
}

function buildActivityItems(activities: DayActivity[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const activity of activities) {
    if (!activity.id) continue;
    items.push({
      type: 'activity',
      time: activity.start_time || undefined,
      endTime: activity.end_time || undefined,
      title: activity.title,
      description: activity.description || undefined,
      icon: null,
      id: activity.id,
      data: activity,
    });
  }
  return items;
}

function buildHotelItems(hotelStays: HotelStay[], normalizedDay: string): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const stay of hotelStays) {
    if (stay.hotel_checkin_date === normalizedDay && stay.checkin_time) {
      items.push({
        type: 'hotel',
        time: stay.checkin_time,
        title: `Check-in: ${stay.hotel}`,
        description: stay.hotel_address,
        icon: null,
        id: `checkin-${stay.stay_id}`,
        data: stay,
      });
    }
    if (stay.hotel_checkout_date === normalizedDay && stay.checkout_time) {
      items.push({
        type: 'hotel',
        time: stay.checkout_time,
        title: `Check-out: ${stay.hotel}`,
        icon: null,
        id: `checkout-${stay.stay_id}`,
        data: stay,
      });
    }
  }
  return items;
}

function getTransportTypeLabel(type: string): string {
  switch (type) {
    case 'flight': return 'Flight';
    case 'train': return 'Train';
    case 'car': return 'Car';
    case 'bus': return 'Bus';
    default: return 'Transport';
  }
}

function getTransportDisplayInfo(
  t: Transportation,
  normalizedDay: string,
): { displayTime: string | undefined; title: string; isStartDay: boolean; isEndDay: boolean; isMultiDay: boolean } {
  const startDate = t.start_date;
  const endDate = t.end_date || startDate;
  const isStartDay = normalizedDay === startDate;
  const isEndDay = normalizedDay === endDate;
  const isMultiDay = startDate !== endDate;

  if (!isMultiDay) {
    return {
      displayTime: t.start_time || undefined,
      title: `${t.departure_location || 'Departure'} → ${t.arrival_location || 'Arrival'}`,
      isStartDay,
      isEndDay,
      isMultiDay,
    };
  }

  if (isStartDay) {
    return {
      displayTime: t.start_time || undefined,
      title: `${t.departure_location || 'Departure'} →`,
      isStartDay,
      isEndDay,
      isMultiDay,
    };
  }

  if (isEndDay) {
    return {
      displayTime: t.end_time || undefined,
      title: `→ ${t.arrival_location || 'Arrival'}`,
      isStartDay,
      isEndDay,
      isMultiDay,
    };
  }

  const typeLabel = getTransportTypeLabel(t.type);
  return {
    displayTime: undefined,
    title: `${typeLabel} (In Transit): ${t.departure_location || 'Departure'} → ${t.arrival_location || 'Arrival'}`,
    isStartDay,
    isEndDay,
    isMultiDay,
  };
}

function buildTransportationItems(transportations: Transportation[], normalizedDay: string): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const t of transportations) {
    const { displayTime, title, isStartDay, isEndDay, isMultiDay } = getTransportDisplayInfo(t, normalizedDay);

    const departTimeOnThisDay = isStartDay ? t.start_time : undefined;
    const arriveTimeOnThisDay = isEndDay ? t.end_time : (isStartDay && !isMultiDay ? t.end_time : undefined);

    items.push({
      type: 'transportation',
      time: displayTime,
      endTime: departTimeOnThisDay && arriveTimeOnThisDay ? arriveTimeOnThisDay : undefined,
      title,
      description: t.details,
      icon: null,
      id: t.id,
      data: {
        ...t,
        __depart_time_on_this_day: departTimeOnThisDay,
        __arrive_time_on_this_day: arriveTimeOnThisDay,
      },
    });
  }
  return items;
}

function buildDiningItems(reservations: RestaurantReservation[] | undefined | null): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const r of reservations || []) {
    if (!r.reservation_time) continue;
    items.push({
      type: 'dining',
      time: r.reservation_time,
      title: r.restaurant_name,
      description: r.notes || undefined,
      icon: null,
      id: r.id,
      data: r,
    });
  }
  return items;
}

function sortTimelineItems(items: TimelineItem[]): void {
  items.sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });
}

function getGroupEndTime(group: TimelineItem[]): string | undefined {
  for (let i = group.length - 1; i >= 0; i--) {
    const item = group[i];
    if (item.data?.__arrive_time_on_this_day) return item.data.__arrive_time_on_this_day;
    if (item.endTime) return item.endTime;
    if (item.time) return item.time;
  }
  return undefined;
}

function getGroupStartTime(group: TimelineItem[]): string | undefined {
  const first = group[0];
  if (first?.data?.__depart_time_on_this_day) return first.data.__depart_time_on_this_day;
  return first?.time;
}

function buildGroupRow(group: TimelineItem[]): TimelineRenderRow {
  if (group.length >= 2) {
    return {
      kind: 'grouped',
      id: `group-${group[0].id}`,
      items: group,
      groupType: group[0].type,
      title: generateGroupTitle(group),
      timeRange: generateGroupTimeRange(group),
    };
  }
  return { kind: 'item', item: group[0] };
}

function buildLayoverHint(
  lastItem: TimelineItem,
  nextFirst: TimelineItem,
  currEnd: Date,
  nextStart: Date,
): TimelineRenderRow | null {
  const lastIsFlight = lastItem.type === 'transportation' && lastItem.data?.type === 'flight';
  const nextIsFlight = nextFirst.type === 'transportation' && nextFirst.data?.type === 'flight';
  if (!lastIsFlight || !nextIsFlight) return null;

  const currArriveAirport = extractIata(lastItem.data?.arrival_location);
  const nextDepartAirport = extractIata(nextFirst.data?.departure_location);
  if (!currArriveAirport || currArriveAirport !== nextDepartAirport) return null;

  const mins = diffMinutes(currEnd, nextStart);
  if (mins <= 0) return null;

  return {
    kind: 'hint',
    id: `layover-${lastItem.id}-${nextFirst.id}`,
    text: `Layover at ${currArriveAirport} • ${humanizeMinutes(mins)}`,
    hintType: 'layover' as const,
    airport: currArriveAirport,
  };
}

function buildGapHint(
  groupIdx: number,
  currEnd: Date,
  nextStart: Date,
): TimelineRenderRow | null {
  const gapMs = nextStart.getTime() - currEnd.getTime();
  const gapMins = Math.round(gapMs / 60000);

  if (gapMins >= 90) {
    return {
      kind: 'hint',
      id: `gap-${groupIdx}`,
      text: `${humanizeMinutes(gapMins)} free`,
      hintType: 'free-time' as const,
    };
  }

  if (gapMins < -5) {
    return {
      kind: 'hint',
      id: `overlap-${groupIdx}`,
      text: `Overlaps by ${humanizeMinutes(Math.abs(gapMins))}`,
      hintType: 'overlap' as const,
    };
  }

  return null;
}

function buildGapOrLayoverHint(
  group: TimelineItem[],
  nextGroup: TimelineItem[],
  groupIdx: number,
  normalizedDay: string,
): TimelineRenderRow | null {
  if (!nextGroup || nextGroup.length === 0) return null;

  const currEndTimeStr = getGroupEndTime(group);
  const nextStartTimeStr = getGroupStartTime(nextGroup);
  if (!currEndTimeStr || !nextStartTimeStr) return null;

  const currEnd = combineDateAndTime(normalizedDay, currEndTimeStr);
  const nextStart = combineDateAndTime(normalizedDay, nextStartTimeStr);
  if (!currEnd || !nextStart) return null;

  const lastItem = group[group.length - 1];
  const nextFirst = nextGroup[0];

  const layover = buildLayoverHint(lastItem, nextFirst, currEnd, nextStart);
  if (layover) return layover;

  return buildGapHint(groupIdx, currEnd, nextStart);
}

function insertNowIndicator(result: TimelineRenderRow[]): void {
  const nowDate = new Date();
  const nowTimeStr = `${String(nowDate.getHours()).padStart(2, '0')}:${String(nowDate.getMinutes()).padStart(2, '0')}`;

  let insertIdx = result.length;
  for (let i = 0; i < result.length; i++) {
    const row = result[i];
    let rowTime: string | undefined;
    if (row.kind === 'item') rowTime = row.item.time;
    else if (row.kind === 'grouped') rowTime = row.items[0]?.time;

    if (rowTime && rowTime > nowTimeStr) {
      insertIdx = i;
      break;
    }
  }

  result.splice(insertIdx, 0, { kind: 'now', id: 'now-indicator' });
}

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
    const items: TimelineItem[] = [
      ...buildActivityItems(activities),
      ...buildHotelItems(filteredHotelStays, normalizedDay),
      ...buildTransportationItems(filteredTransportations, normalizedDay),
      ...buildDiningItems(reservations),
    ];
    sortTimelineItems(items);
    return items;
  }, [activities, filteredHotelStays, filteredTransportations, reservations, normalizedDay]);

  // Compute rows with grouping, layover hints, and gap detection
  const rows: TimelineRenderRow[] = useMemo(() => {
    const result: TimelineRenderRow[] = [];
    const eventGroups = groupSimilarEvents(timelineItems, normalizedDay);

    for (let groupIdx = 0; groupIdx < eventGroups.length; groupIdx++) {
      const group = eventGroups[groupIdx];
      result.push(buildGroupRow(group));

      const hint = buildGapOrLayoverHint(group, eventGroups[groupIdx + 1], groupIdx, normalizedDay);
      if (hint) result.push(hint);
    }

    if (isTodayFlag) {
      insertNowIndicator(result);
    }

    return result;
  }, [timelineItems, normalizedDay, isTodayFlag]);

  // Group rows by time period
  const periodGroups: TimelinePeriodGroup[] = useMemo(() => {
    const groupMap = new Map<TimePeriod, TimelineRenderRow[]>();
    const periodOrder = ['early-morning', 'morning', 'afternoon', 'evening', 'night', 'no-time'] as const;

    // Initialize all periods
    periodOrder.forEach(period => {
      groupMap.set(period as TimePeriod, []);
    });

    // Distribute rows to periods
    let lastItemPeriod: TimePeriod = 'no-time';
    rows.forEach(row => {
      if (row.kind === 'hint' || row.kind === 'now') {
        // Attach hint/now to the period of the last item
        groupMap.get(lastItemPeriod)?.push(row);
      } else if (row.kind === 'grouped') {
        // For grouped items, use the time of the first item
        const firstTime = row.items[0]?.time;
        const period = getTimePeriod(firstTime);
        lastItemPeriod = period;
        groupMap.get(period)?.push(row);
      } else {
        const period = getTimePeriod(row.item.time);
        lastItemPeriod = period;
        groupMap.get(period)?.push(row);
      }
    });

    // Build result with only non-empty periods
    const result: TimelinePeriodGroup[] = [];
    periodOrder.forEach(period => {
      const period_rows = groupMap.get(period as TimePeriod) || [];
      if (period_rows.length > 0) {
        result.push({
          period: period as TimePeriod,
          label: getPeriodLabel(period as TimePeriod),
          rows: period_rows,
        });
      }
    });

    return result;
  }, [rows]);

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
    periodGroups,
    summary,
    isCheckInDay,
    isCheckOutDay,
    isTravelDay,
    totalEvents,
  };
}
