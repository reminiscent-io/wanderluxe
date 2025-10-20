import React from 'react';
import { Plane, Train, Car, Bus, Ship } from 'lucide-react';

/** ----------------------------- Types & shapes ---------------------------- */

export type TimelineType = 'activity' | 'hotel' | 'transportation' | 'dining';

export interface TimelineItem {
  type: TimelineType;
  time?: string;        // primary time (start on same-day rows; arrival on arrival-only rows)
  endTime?: string;     // optional "until" time (e.g., flight arrival on same-day)
  title: string;
  description?: string;
  icon: React.ReactNode;
  id: string;
  data?: any & {
    __depart_time_on_this_day?: string | undefined;
    __arrive_time_on_this_day?: string | undefined;
  };
}

export type TimelineRenderRow =
  | { kind: 'item'; item: TimelineItem }
  | { kind: 'hint'; id: string; text: string };

/** ------------------------------- Utilities ------------------------------- */

// time -> "h:mm AM/PM"
export const formatTime12 = (time?: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
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

// icon per transport
export const getTransportationIconComponent = (type: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    flight: <Plane className="h-3 w-3" />,
    train: <Train className="h-3 w-3" />,
    car_service: <Car className="h-3 w-3" />,
    shuttle: <Bus className="h-3 w-3" />,
    ferry: <Ship className="h-3 w-3" />,
    rental_car: <Car className="h-3 w-3" />
  };
  return iconMap[type] || <Bus className="h-3 w-3" />;
};

// color scheme per event type
export const getEventColors = (type: TimelineType) => {
  switch (type) {
    case 'hotel':
      return { node: 'bg-amber-500', line: 'bg-amber-200', icon: 'text-amber-600' };
    case 'transportation':
      return { node: 'bg-sky-500', line: 'bg-sky-200', icon: 'text-sky-600' };
    case 'activity':
      return { node: 'bg-emerald-500', line: 'bg-emerald-200', icon: 'text-emerald-600' };
    case 'dining':
      return { node: 'bg-rose-500', line: 'bg-rose-200', icon: 'text-rose-600' };
    default:
      return { node: 'bg-earth-400', line: 'bg-earth-200', icon: 'text-earth-600' };
  }
};
