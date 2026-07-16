import { format, parse } from 'date-fns';
import { formatCostWithCurrency } from '@/utils/costUtils';
import type { DayActivity, RestaurantReservation, HotelStay, Transportation } from '@/types/trip';
import type { CalendarEntityType } from './eventMapping';

export type FactIcon = 'clock' | 'pin' | 'star' | 'users' | 'ticket' | 'dates' | 'cost';
export interface PeekFact { icon: FactIcon; text: string }

/** Format a floating HH:MM(:SS) wall-clock time as h:mm a. Never converts zones. */
function fmtTime(time: string | null | undefined): string {
  if (!time) return '';
  return format(parse(time.slice(0, 5), 'HH:mm', new Date()), 'h:mm a');
}

function fmtDay(date: string): string {
  return format(parse(date, 'yyyy-MM-dd', new Date()), 'MMM d');
}

function timeRange(start: string | null | undefined, end: string | null | undefined, tzBadge?: string): string {
  if (!start) return '';
  const range = end ? `${fmtTime(start)} – ${fmtTime(end)}` : fmtTime(start);
  return tzBadge ? `${range} ${tzBadge}` : range;
}

function costFact(cost: number | null, currency: string | null | undefined): PeekFact | null {
  return cost != null ? { icon: 'cost', text: formatCostWithCurrency(cost, currency ?? 'USD') } : null;
}

function activityFacts(r: DayActivity, tzBadge?: string): (PeekFact | null)[] {
  return [
    r.start_time ? { icon: 'clock', text: timeRange(r.start_time, r.end_time, tzBadge) } : null,
    r.location_address ? { icon: 'pin', text: r.location_address } : null,
    r.location_rating != null ? { icon: 'star', text: r.location_rating.toFixed(1) } : null,
    costFact(r.cost, r.currency),
  ];
}

function diningFacts(r: RestaurantReservation, tzBadge?: string): (PeekFact | null)[] {
  return [
    r.reservation_time ? { icon: 'clock', text: timeRange(r.reservation_time, null, tzBadge) } : null,
    r.number_of_people ? { icon: 'users', text: `Party of ${r.number_of_people}` } : null,
    r.address ? { icon: 'pin', text: r.address } : null,
    r.rating != null ? { icon: 'star', text: r.rating.toFixed(1) } : null,
    costFact(r.cost, r.currency),
  ];
}

function stayFacts(r: HotelStay): (PeekFact | null)[] {
  const times = [
    r.checkin_time && `Check-in ${fmtTime(r.checkin_time)}`,
    r.checkout_time && `Check-out ${fmtTime(r.checkout_time)}`,
  ].filter(Boolean).join(' · ');
  return [
    r.hotel_checkin_date && r.hotel_checkout_date
      ? { icon: 'dates', text: `${fmtDay(r.hotel_checkin_date)} – ${fmtDay(r.hotel_checkout_date)}` }
      : null,
    times ? { icon: 'clock', text: times } : null,
    r.hotel_address ? { icon: 'pin', text: r.hotel_address } : null,
    costFact(r.cost, r.currency),
  ];
}

function transportFacts(r: Transportation, tzBadge?: string): (PeekFact | null)[] {
  const booking = [r.provider, r.confirmation_number].filter(Boolean).join(' · ');
  return [
    r.start_time ? { icon: 'clock', text: timeRange(r.start_time, r.end_time, tzBadge) } : null,
    booking ? { icon: 'ticket', text: booking } : null,
    costFact(r.cost, r.currency),
  ];
}

/** Glance essentials per entity type; rows with no data are simply omitted. */
export function buildPeekFacts(entityType: CalendarEntityType, record: Record<string, unknown>, tzBadge?: string): PeekFact[] {
  const builders: Record<CalendarEntityType, () => (PeekFact | null)[]> = {
    activity: () => activityFacts(record as unknown as DayActivity, tzBadge),
    dining: () => diningFacts(record as unknown as RestaurantReservation, tzBadge),
    accommodation: () => stayFacts(record as unknown as HotelStay),
    transportation: () => transportFacts(record as unknown as Transportation, tzBadge),
  };
  return (builders[entityType]?.() ?? []).filter(Boolean) as PeekFact[];
}

