import React from 'react';
import { Plane, Train, Car, Bus, Ship, Hotel, Utensils, Star } from 'lucide-react';

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

// time -> "h:mm AM/PM"
export const formatTime12 = (time?: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
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
  
  if (hour >= 5 && hour < 9) return 'early-morning';
  if (hour >= 9 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

export const getPeriodLabel = (period: TimePeriod): string => {
  const labels: Record<TimePeriod, string> = {
    'early-morning': '🌅 Early Morning',
    'morning': '☀️ Morning',
    'afternoon': '🌤️ Afternoon',
    'evening': '🌆 Evening',
    'night': '🌙 Night',
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

// icon per event type
export const getEventIconComponent = (eventType: TimelineType, transportType?: string): React.ComponentType<{ className?: string }> => {
  switch (eventType) {
    case 'transportation':
      return transportType ? getTransportationIconComponent(transportType) : Plane;
    case 'hotel':
      return Hotel;
    case 'dining':
      return Utensils;
    case 'activity':
      return Star;
    default:
      return Star;
  }
};

// Unified warm neutral for all event types.
// The icon shape (Hotel, Plane, Star, Utensils) already differentiates types visually.
export const getEventColors = (_type: TimelineType) => {
  return { node: 'bg-earth-400', line: 'bg-earth-200', icon: 'text-earth-600' };
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

// Determine if two consecutive events should be grouped together
const shouldGroupEvents = (prev: TimelineItem, curr: TimelineItem, dateISO: string): boolean => {
  // Must be same type
  if (prev.type !== curr.type) return false;

  // Both must have times
  if (!prev.time || !curr.time) return false;

  // Check time proximity (within 4 hours)
  const prevTime = combineDateAndTime(dateISO, prev.time);
  const currTime = combineDateAndTime(dateISO, curr.time);

  if (!prevTime || !currTime) return false;

  const timeDiffMinutes = diffMinutes(prevTime, currTime);
  const TIME_WINDOW_MINUTES = 4 * 60; // 4 hours

  if (timeDiffMinutes > TIME_WINDOW_MINUTES) return false;

  // For transportation events, check if same type and similar location pattern
  if (prev.type === 'transportation' && curr.type === 'transportation') {
    const prevData = prev.data;
    const currData = curr.data;

    // Same transportation type (e.g., both flights)
    if (prevData?.type !== currData?.type) return false;

    // Check if arrivals at same location or departures from same location
    const prevArrival = extractIata(prevData?.arrival_location);
    const currArrival = extractIata(currData?.arrival_location);
    const prevDeparture = extractIata(prevData?.departure_location);
    const currDeparture = extractIata(currData?.departure_location);

    // Group if arriving at same place or departing from same place
    return (prevArrival && prevArrival === currArrival) ||
           (prevDeparture && prevDeparture === currDeparture);
  }

  // For activities and dining, just group by type and time
  return true;
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
  if (allSameArrival) return `Group Arrivals: ${firstArrival}`;

  const firstDeparture = extractIata(items[0].data?.departure_location);
  const allSameDeparture = firstDeparture && items.every(item =>
    extractIata(item.data?.departure_location) === firstDeparture
  );
  if (allSameDeparture) return `Group Departures: ${firstDeparture}`;

  return `${items.length} ${typeLabel}`;
};

const summarizeNames = (items: TimelineItem[]): string => {
  const names = items.map(i => i.title).filter(Boolean);
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 2).join(', ')}, +${names.length - 2} more`;
};

// Generate a group title for a set of grouped events
export const generateGroupTitle = (items: TimelineItem[]): string => {
  if (items.length === 0) return '';

  const type = items[0].type;

  switch (type) {
    case 'transportation': return generateTransportGroupTitle(items);
    case 'activity': return summarizeNames(items);
    case 'dining': return summarizeNames(items);
    case 'hotel': return `${items.length} Hotel Events`;
    default: return `${items.length} Events`;
  }
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
