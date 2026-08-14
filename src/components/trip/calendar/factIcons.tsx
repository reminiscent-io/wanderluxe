import React from 'react';
import { Clock, MapPin, Star, Users, Ticket, CalendarRange, Banknote } from 'lucide-react';
import type { CalendarEntityType } from './eventMapping';
import type { FactIcon } from './peekFacts';

/**
 * Shared by the calendar's hover peek and the map's marker popup so both
 * surfaces label and illustrate the same entity identically.
 */
export const TYPE_LABELS: Record<CalendarEntityType, string> = {
  activity: 'Activity',
  dining: 'Dining',
  accommodation: 'Stay',
  transportation: 'Transport',
};

export const FACT_ICONS: Record<FactIcon, React.ComponentType<{ className?: string }>> = {
  clock: Clock,
  pin: MapPin,
  star: Star,
  users: Users,
  ticket: Ticket,
  dates: CalendarRange,
  cost: Banknote,
};
