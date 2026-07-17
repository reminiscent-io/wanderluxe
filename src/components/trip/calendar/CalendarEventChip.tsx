import React from 'react';
import type { EventContentArg } from '@fullcalendar/core';
import { MapPin, UtensilsCrossed, BedDouble, Plane } from 'lucide-react';
import type { CalendarEntityType } from './eventMapping';

const ICONS: Record<CalendarEntityType, React.ComponentType<{ className?: string }>> = {
  activity: MapPin,
  dining: UtensilsCrossed,
  accommodation: BedDouble,
  transportation: Plane,
};

/** Timed timegrid events at least this long get the stacked (title over time) layout — at the dense slot height (~42px/hour) anything shorter can't fit two lines. */
const STACK_MIN_MINUTES = 60;

const CalendarEventChip: React.FC<{ arg: EventContentArg }> = ({ arg }) => {
  const { entityType, tzBadge } = arg.event.extendedProps as { entityType: CalendarEntityType; tzBadge?: string };
  const Icon = ICONS[entityType] ?? MapPin;
  const isTimeGrid = Boolean(arg.view?.type?.startsWith('timeGrid'));
  // Month cells and list rows already show time elsewhere (or are too narrow for it) — title wins.
  const timeText = isTimeGrid && !arg.event.allDay && arg.timeText ? `${arg.timeText}${tzBadge ? ` ${tzBadge}` : ''}` : '';
  const minutes = arg.event.start && arg.event.end
    ? (arg.event.end.getTime() - arg.event.start.getTime()) / 60000
    : 0;
  const stacked = isTimeGrid && !arg.event.allDay && minutes >= STACK_MIN_MINUTES;

  if (stacked) {
    return (
      <div className="wl-chip-stacked flex h-full min-w-0 flex-col gap-0.5 px-2 py-1" data-entity-type={entityType}>
        <span className="flex min-w-0 items-center gap-1.5">
          <Icon className="wl-chip-icon h-3 w-3 shrink-0 opacity-70" aria-hidden data-testid={`chip-icon-${entityType}`} />
          <span className="truncate font-sans text-xs font-medium leading-tight">{arg.event.title}</span>
        </span>
        {timeText && <span className="wl-chip-time truncate text-[10px] leading-tight tabular-nums opacity-60">{timeText}</span>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-1.5 py-0.5 min-w-0" data-entity-type={entityType}>
      <Icon className="wl-chip-icon h-3 w-3 shrink-0 opacity-80" aria-hidden data-testid={`chip-icon-${entityType}`} />
      {timeText && (
        <span className="wl-chip-time text-[10px] font-medium tabular-nums opacity-70 shrink-0">{timeText}</span>
      )}
      <span className="truncate font-sans text-xs">{arg.event.title}</span>
    </div>
  );
};

export default CalendarEventChip;
