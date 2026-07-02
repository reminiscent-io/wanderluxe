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

const CalendarEventChip: React.FC<{ arg: EventContentArg }> = ({ arg }) => {
  const { entityType, tzBadge } = arg.event.extendedProps as { entityType: CalendarEntityType; tzBadge?: string };
  const Icon = ICONS[entityType] ?? MapPin;
  return (
    <div className="flex items-center gap-1.5 px-1.5 py-0.5 min-w-0" data-entity-type={entityType}>
      <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden data-testid={`chip-icon-${entityType}`} />
      {!arg.event.allDay && arg.timeText && (
        <span className="text-[10px] font-medium tabular-nums opacity-70 shrink-0">
          {arg.timeText}{tzBadge ? ` ${tzBadge}` : ''}
        </span>
      )}
      <span className="truncate font-sans text-xs">{arg.event.title}</span>
    </div>
  );
};

export default CalendarEventChip;
