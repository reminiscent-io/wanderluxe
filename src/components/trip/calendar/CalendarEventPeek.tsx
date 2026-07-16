import React from 'react';
import type { EventContentArg } from '@fullcalendar/core';
import { Clock, MapPin, Star, Users, Ticket, CalendarRange, Banknote } from 'lucide-react';
import * as HoverCardPrimitive from '@radix-ui/react-hover-card';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import CalendarEventChip from './CalendarEventChip';
import type { CalendarEntityType } from './eventMapping';
import { buildPeekFacts, type FactIcon } from './peekFacts';

const TYPE_LABELS: Record<CalendarEntityType, string> = {
  activity: 'Activity',
  dining: 'Dining',
  accommodation: 'Stay',
  transportation: 'Transport',
};

const FACT_ICONS: Record<FactIcon, React.ComponentType<{ className?: string }>> = {
  clock: Clock, pin: MapPin, star: Star, users: Users, ticket: Ticket, dates: CalendarRange, cost: Banknote,
};

function supportsHover(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/**
 * Desktop-only hover preview wrapping the event chip. Pure peek: no actions,
 * clicking the event still opens the edit dialog. Suppressed on touch devices
 * and while the event is being dragged, resized, or mirrored.
 */
const CalendarEventPeek: React.FC<{ arg: EventContentArg }> = ({ arg }) => {
  const chip = <CalendarEventChip arg={arg} />;
  if (!supportsHover() || arg.isMirror || arg.isDragging || arg.isResizing) return chip;

  const { entityType, tzBadge } = arg.event.extendedProps as { entityType: CalendarEntityType; tzBadge?: string };
  const record = (arg.event.extendedProps as { record?: Record<string, unknown> }).record ?? {};
  const facts = buildPeekFacts(entityType, record, tzBadge);

  return (
    <HoverCard openDelay={350} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className="h-full min-w-0">{chip}</div>
      </HoverCardTrigger>
      {/* Portal so the card escapes FullCalendar's per-event stacking contexts (sibling events would paint over it). */}
      <HoverCardPrimitive.Portal>
      <HoverCardContent
        side="right"
        align="start"
        collisionPadding={8}
        aria-hidden
        className="w-72 rounded-card border-border bg-background p-4 shadow-warm-lg"
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{TYPE_LABELS[entityType] ?? 'Event'}</p>
        <p className="mt-1 text-sm font-medium leading-snug text-foreground">{arg.event.title}</p>
        {facts.length > 0 && (
          <ul className="mt-2.5 space-y-1.5">
            {facts.map((fact) => {
              const Icon = FACT_ICONS[fact.icon];
              return (
                <li key={`${fact.icon}-${fact.text}`} className="flex items-start gap-2 text-xs leading-snug text-muted-foreground">
                  <Icon className="mt-0.5 h-3 w-3 shrink-0 opacity-70" aria-hidden />
                  <span className="min-w-0">{fact.text}</span>
                </li>
              );
            })}
          </ul>
        )}
      </HoverCardContent>
      </HoverCardPrimitive.Portal>
    </HoverCard>
  );
};

export default CalendarEventPeek;
