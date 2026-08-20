import React from 'react';
import { Plane, Train, Car, Bus, Ship, Bed, Utensils, Mountain, Anchor } from 'lucide-react';
import { CURRENCY_SYMBOLS } from '@/utils/currencyConstants';

/** ----------------------------- Types & shapes ---------------------------- */

export type TimelineType = 'activity' | 'hotel' | 'transportation' | 'dining';

export interface TimelineRowData {
  __depart_time_on_this_day?: string;
  __arrive_time_on_this_day?: string;
  [key: string]: unknown;
}

export interface TimelineItem {
  type: TimelineType;
  time?: string;        // primary time (start on same-day rows; arrival on arrival-only rows)
  endTime?: string;     // optional "until" time (e.g., flight arrival on same-day)
  title: string;
  description?: string;
  icon: React.ReactNode;
  id: string;
  data?: TimelineRowData;
  tzSuffix?: string;      // zone abbrev for `time` ('' / absent = no badge)
  endTzSuffix?: string;   // zone abbrev for `endTime`
}

export type HintType = 'layover' | 'free-time' | 'overlap';

export type TimelineRenderRow =
  | { kind: 'item'; item: TimelineItem }
  | { kind: 'grouped'; id: string; items: TimelineItem[]; groupType: TimelineType; title: string; timeRange: string }
  | { kind: 'hint'; id: string; text: string; hintType?: HintType; airport?: string }
  | { kind: 'now'; id: string };

/** ------------------------------- Utilities ------------------------------- */

// "9:00 AM – 2:30 PM" or "9:20 AM → 11:45 AM" (arrow for transport).
// Optional per-endpoint zone suffixes: "11:00 PM EDT → 11:00 AM BST".
export const formatTimeRange = (
  startTime?: string,
  endTime?: string,
  useArrow?: boolean,
  startSuffix = '',
  endSuffix = '',
): string => {
  if (!startTime) return '';
  const start = formatTime12(startTime) + (startSuffix ? ` ${startSuffix}` : '');
  if (!endTime) return start;
  const end = formatTime12(endTime) + (endSuffix ? ` ${endSuffix}` : '');
  return useArrow ? `${start} → ${end}` : `${start} – ${end}`;
};

// Cost for a timeline row: no trailing ".00", cents kept when they carry
// meaning. Budget surfaces keep formatCurrencyWithSymbol's fixed 2 decimals;
// a row of prices reads faster without the dead zeros.
export const formatCostCompact = (amount: number, currency = 'USD'): string => {
  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? currency;
  const decimals = currency === 'JPY' || Number.isInteger(amount) ? 0 : 2;
  const value = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  return symbol === currency ? `${value} ${currency}` : `${symbol}${value}`;
};

// time -> "h:mm AM/PM"
export const formatTime12 = (time?: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

// time -> "9:30a" / "2:00p". The gutter shows a start time and nothing else,
// so it wants the shortest form that still reads unambiguously.
export const formatTimeCompact = (time?: string): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  if (Number.isNaN(hour)) return '';
  return `${hour % 12 || 12}:${minutes}${hour >= 12 ? 'p' : 'a'}`;
};

// time -> { time: "h:mm", meridiem: "AM/PM" } for stacked display
export const formatTime12Stacked = (time?: string) => {
  if (!time) return { time: '', meridiem: '' };
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return { time: `${displayHour}:${minutes}`, meridiem: ampm };
};

// normalize "YYYY-MM-DD" from many date string shapes
export const getNormalizedDay = (date: string) => {
  if (!date) return '';
  const m = date.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

// parse "09:00", "11:20:00", "9:05 AM", "12:30 pm" -> {h,m}
export const parseTimeToHM = (time: string): { h: number; m: number } | null => {
  if (!time) return null;
  const t = time.trim();

  const ampmMatch = t.match(/\s?(AM|PM)$/i);
  const base = t.replace(/\s?(AM|PM)$/i, '');

  const parts = base.split(':');
  if (parts.length < 2) return null;

  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;

  if (ampmMatch) {
    const ampm = ampmMatch[1].toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
  }
  return { h, m };
};

// robust local Date from YYYY-MM-DD + time
export const combineDateAndTime = (dateISO: string, time?: string) => {
  if (!dateISO || !time) return null;
  const dayMatch = dateISO.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dayMatch) return null;

  const [, yS, moS, dS] = dayMatch;
  const hm = parseTimeToHM(time);
  if (!hm) return null;

  const y = parseInt(yS, 10);
  const mo = parseInt(moS, 10) - 1;
  const d = parseInt(dS, 10);
  if ([y, mo, d].some(n => Number.isNaN(n))) return null;

  return new Date(y, mo, d, hm.h, hm.m, 0, 0);
};

// Try extracting an IATA code ("JFK") from free text; fall back to the string
export const extractIata = (loc?: string) => {
  if (!loc) return '';
  const m = loc.match(/\b([A-Z]{3})\b/);
  return m ? m[1] : loc;
};

export const diffMinutes = (a: Date, b: Date) => {
  if (!(a instanceof Date) || !(b instanceof Date)) return NaN;
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return NaN;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
};

export const humanizeMinutes = (mins: number) => {
  if (!Number.isFinite(mins)) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

// Categorize time into periods for grouping
export type TimePeriod = 'early-morning' | 'morning' | 'afternoon' | 'evening' | 'night' | 'no-time';

export const getTimePeriod = (time?: string): TimePeriod => {
  if (!time) return 'no-time';
  const hm = parseTimeToHM(time);
  if (!hm) return 'no-time';
  const hour = hm.h;

  if (hour < 9) return 'early-morning';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
};

export const getPeriodLabel = (period: TimePeriod): string => {
  const labels: Record<TimePeriod, string> = {
    'early-morning': 'Early Morning',
    'morning': 'Morning',
    'afternoon': 'Afternoon',
    'evening': 'Evening',
    'night': 'Night',
    'no-time': 'Unscheduled',
  };
  return labels[period];
};

export const getPeriodOrder = (period: TimePeriod): number => {
  const order: Record<TimePeriod, number> = {
    'early-morning': 0,
    'morning': 1,
    'afternoon': 2,
    'evening': 3,
    'night': 4,
    'no-time': 5,
  };
  return order[period];
};

// icon per transport
export const getTransportationIconComponent = (type: string): React.ComponentType<{ className?: string }> => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    flight: Plane,
    train: Train,
    car_service: Car,
    shuttle: Bus,
    ferry: Ship,
    rental_car: Car
  };
  return iconMap[type] || Bus;
};

export type EventCategory = 'ocean' | 'clay' | 'sage' | 'slate' | 'lodging';

/*
 * Water shows up in this product as ordinary activities and ferries, with no
 * column to distinguish it, so it is inferred from the title. The list is
 * deliberately narrow: a false positive only changes an icon and a 4% tint.
 * If activities ever gain a real category column, read that instead.
 */
const WATER_WORDS = /\b(boat|sail|sailing|cruise|kayak|snorkel|dive|diving|yacht|catamaran|ferry|paddle|surf|surfing|canoe|raft|rafting|marina|swim|swimming)\b/i;

export const getEventCategory = (item: Pick<TimelineItem, 'type' | 'title' | 'data'>): EventCategory => {
  if (item.type === 'hotel') return 'lodging';
  if (item.type === 'dining') return 'clay';
  if (item.type === 'transportation') {
    return item.data?.type === 'ferry' ? 'ocean' : 'slate';
  }
  return WATER_WORDS.test(item.title || '') ? 'ocean' : 'sage';
};

/** Icon colour per category. Shape already differentiates types, so colour
 *  is reinforcement rather than the only signal. */
export const CATEGORY_ICON_CLASS: Record<EventCategory, string> = {
  ocean: 'text-category-ocean',
  clay: 'text-category-clay',
  sage: 'text-category-sage',
  slate: 'text-category-slate',
  lodging: 'text-earth-500',
};

/**
 * Hover wash per category. There is deliberately no resting tint: at 4% over
 * cream these hues are too faint to read as colour and only muddy the paper.
 * Category is carried at full strength by the row icon instead.
 */
export const CATEGORY_ROW_CLASS: Record<EventCategory, string> = {
  ocean: 'hover:bg-category-ocean/[0.08]',
  clay: 'hover:bg-category-clay/[0.08]',
  sage: 'hover:bg-category-sage/[0.08]',
  slate: 'hover:bg-category-slate/[0.08]',
  lodging: 'hover:bg-secondary/40',
};

// icon per event type
export const getEventIconComponent = (eventType: TimelineType, transportType?: string): React.ComponentType<{ className?: string }> => {
  switch (eventType) {
    case 'transportation':
      return transportType ? getTransportationIconComponent(transportType) : Plane;
    case 'hotel':
      return Bed;
    case 'dining':
      return Utensils;
    case 'activity':
      return Mountain;
    default:
      return Mountain;
  }
};

/** Water activities get an anchor regardless of entity type. */
export const getTimelineIcon = (item: Pick<TimelineItem, 'type' | 'title' | 'data'>): React.ComponentType<{ className?: string }> => {
  if (item.type === 'activity' && getEventCategory(item) === 'ocean') return Anchor;
  return getEventIconComponent(item.type, item.data?.type as string | undefined);
};

// Group similar events that occur within a timeframe
export const groupSimilarEvents = (items: TimelineItem[], dateISO: string): TimelineItem[][] => {
  if (items.length === 0) return [];

  const groups: TimelineItem[][] = [];
  let currentGroup: TimelineItem[] = [items[0]];

  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const curr = items[i];

    // Check if events should be grouped
    const shouldGroup = shouldGroupEvents(prev, curr, dateISO);

    if (shouldGroup) {
      currentGroup.push(curr);
    } else {
      // Save current group and start new one
      groups.push([...currentGroup]);
      currentGroup = [curr];
    }
  }

  // Don't forget the last group
  groups.push(currentGroup);

  return groups;
};

// Determine if two consecutive events should be grouped together.
//
// Only transportation groups. A shared airport inside a few hours means one
// journey with a connection, which is worth folding into a single row. For every
// other type, closeness in time is coincidence rather than a relationship, so
// activities, dining and hotels always render as rows of their own.
const shouldGroupEvents = (prev: TimelineItem, curr: TimelineItem, dateISO: string): boolean => {
  if (prev.type !== 'transportation' || curr.type !== 'transportation') return false;

  // Both must have times
  if (!prev.time || !curr.time) return false;

  // Check time proximity (within 4 hours)
  const prevTime = combineDateAndTime(dateISO, prev.time);
  const currTime = combineDateAndTime(dateISO, curr.time);

  if (!prevTime || !currTime) return false;

  const timeDiffMinutes = diffMinutes(prevTime, currTime);
  const TIME_WINDOW_MINUTES = 4 * 60; // 4 hours

  if (timeDiffMinutes > TIME_WINDOW_MINUTES) return false;

  // Same transportation type (e.g., both flights)
  if (prev.data?.type !== curr.data?.type) return false;

  // Group only when they share an endpoint: same arrival, or same departure.
  const prevArrival = extractIata(prev.data?.arrival_location);
  const currArrival = extractIata(curr.data?.arrival_location);
  const prevDeparture = extractIata(prev.data?.departure_location);
  const currDeparture = extractIata(curr.data?.departure_location);

  return (!!prevArrival && prevArrival === currArrival) ||
         (!!prevDeparture && prevDeparture === currDeparture);
};

const transportTypeLabel = (transportType: unknown): string => {
  switch (transportType) {
    case 'flight': return 'Flights';
    case 'train': return 'Trains';
    case 'car': return 'Car Services';
    case 'bus': return 'Buses';
    default: return 'Transports';
  }
};

const generateTransportGroupTitle = (items: TimelineItem[]): string => {
  const typeLabel = transportTypeLabel(items[0].data?.type);

  const firstArrival = extractIata(items[0].data?.arrival_location);
  const allSameArrival = firstArrival && items.every(item =>
    extractIata(item.data?.arrival_location) === firstArrival
  );
  if (allSameArrival) return `${items.length} ${typeLabel.toLowerCase()} into ${firstArrival}`;

  const firstDeparture = extractIata(items[0].data?.departure_location);
  const allSameDeparture = firstDeparture && items.every(item =>
    extractIata(item.data?.departure_location) === firstDeparture
  );
  if (allSameDeparture) return `${items.length} ${typeLabel.toLowerCase()} out of ${firstDeparture}`;

  return `${items.length} ${typeLabel}`;
};

// Generate a group title for a set of grouped events. Only transportation groups,
// and every transport title leads with the count, so the title itself says how
// many rows are folded up.
export const generateGroupTitle = (items: TimelineItem[]): string => {
  if (items.length === 0) return '';
  return generateTransportGroupTitle(items);
};

// Generate time range for grouped events
export const generateGroupTimeRange = (items: TimelineItem[]): string => {
  if (items.length === 0) return '';

  const times = items.map(item => item.time).filter(Boolean) as string[];
  if (times.length === 0) return '';

  const firstTime = formatTime12(times[0]);
  const lastTime = formatTime12(times[times.length - 1]);

  if (firstTime === lastTime) return firstTime;
  return `${firstTime} - ${lastTime}`;
};
