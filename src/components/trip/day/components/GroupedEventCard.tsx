import React, { useId, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { DayActivity, HotelStay, Transportation, RestaurantReservation } from '@/types/trip';
import { TimelineItem, TimelineType, formatTimeCompact, getEventCategory, getTimelineIcon, CATEGORY_ICON_CLASS, CATEGORY_ROW_CLASS } from './timeline-utils';
import { cn } from '@/lib/utils';
import TravelerAvatars from '../../timeline/TravelerAvatars';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

type Props = {
  items: TimelineItem[];
  groupType: TimelineType;
  title: string;
  timeRange: string;
  tripId: string;
  /** First / last rail-bearing row in its run, so the line stops at the node. */
  railStart?: boolean;
  railEnd?: boolean;
  onActivityClick?: (a: DayActivity) => void;
  onHotelClick?: (h: HotelStay) => void;
  onTransportationClick?: (t: Transportation) => void;
  onReservationClick?: (r: RestaurantReservation) => void;
};

const GroupedEventCard: React.FC<Props> = ({
  items,
  groupType,
  title,
  timeRange,
  tripId,
  railStart,
  railEnd,
  onActivityClick,
  onHotelClick,
  onTransportationClick,
  onReservationClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const panelId = useId();
  const titleId = useId();
  const prefersReducedMotion = useReducedMotion();

  const handleEventClick = (item: TimelineItem) => {
    if (item.type === 'activity' && onActivityClick && item.data) {
      onActivityClick(item.data);
    } else if (item.type === 'hotel' && onHotelClick && item.data) {
      onHotelClick(item.data);
    } else if (item.type === 'transportation' && onTransportationClick && item.data) {
      onTransportationClick(item.data);
    } else if (item.type === 'dining' && onReservationClick && item.data) {
      onReservationClick(item.data);
    }
  };

  const firstItem = items[0];
  const category = firstItem ? getEventCategory(firstItem) : 'sage';
  const IconComponent = (firstItem ? getTimelineIcon(firstItem) : getTimelineIcon({ type: groupType, title: '' })) as React.ComponentType<{ className?: string; strokeWidth?: number }>;

  return (
    <div>
      {/* Group header row — same geometry as a plain event row */}
      <div
        className={cn(
          'group/row tl-row min-h-row cursor-pointer select-none transition-colors duration-150',
          CATEGORY_ROW_CLASS[category],
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        )}
        role="button"
        aria-expanded={isExpanded}
        aria-controls={panelId}
        tabIndex={0}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded(!isExpanded); } }}
      >
        {/* Gutter weight marks a top-level moment in the day, same as a plain row. */}
        <div className="py-3 text-right">
          {formatTimeCompact(firstItem?.time) && (
            <div className="text-ui-base font-medium tabular-nums text-earth-600 leading-5">
              {formatTimeCompact(firstItem?.time)}
            </div>
          )}
        </div>

        {/* Rail: hollow node, because this one contains other nodes. When the
            group is collapsed it is also the run's last node, so the line has
            to stop here rather than run past the folded-up children. */}
        <div aria-hidden className="relative flex justify-center">
          {!(railStart && railEnd && !isExpanded) && (
            <div
              className={cn(
                'absolute w-px bg-border',
                railStart ? 'top-[1.375rem]' : 'top-0',
                railEnd && !isExpanded ? 'h-[1.375rem]' : 'bottom-0',
              )}
            />
          )}
          <div className="relative mt-[1.0625rem] h-2.5 w-2.5 shrink-0 rounded-full border-2 border-earth-400 bg-background ring-4 ring-background" />
        </div>

        <div className="flex min-w-0 items-start gap-3 py-3 pr-1">
          <div className={cn('mt-0.5 shrink-0', CATEGORY_ICON_CLASS[category])}>
            <IconComponent className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            {/* The title already leads with the count ("2 flights into SXM"), so it
                carries the "there is more folded up here" cue on its own. */}
            <div id={titleId} className="text-ui-md font-medium text-foreground line-clamp-1">{title}</div>
            {timeRange && (
              <div className="mt-0.5 text-ui-sm tabular-nums text-earth-500 line-clamp-1">{timeRange}</div>
            )}
          </div>
          {/* One chevron that rotates: the movement is the affordance. */}
          <div
            aria-hidden
            className="-mr-1 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-earth-500 transition-colors duration-150 group-hover/row:bg-earth-100/70 group-hover/row:text-earth-700"
          >
            <ChevronRight
              className={cn(
                'h-4 w-4 transition-transform duration-200 ease-out motion-reduce:transition-none',
                isExpanded && 'rotate-90',
              )}
              strokeWidth={1.75}
            />
          </div>
        </div>
      </div>

      {/* Expanded children — text indented to sit under the parent title, not under its icon */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={panelId}
            role="group"
            aria-labelledby={titleId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {items.map((item, childIdx) => (
              <div key={item.id} className="tl-row">
                <div className="py-2 text-right text-ui-sm tabular-nums leading-5 text-earth-500">
                  {formatTimeCompact(item.time)}
                </div>
                <div aria-hidden className="relative flex justify-center">
                  <div
                    className={cn(
                      'absolute top-0 w-px bg-border',
                      railEnd && childIdx === items.length - 1 ? 'h-[1.125rem]' : 'bottom-0',
                    )}
                  />
                  <div className="relative mt-[0.9375rem] h-1.5 w-1.5 shrink-0 rounded-full bg-earth-300 ring-4 ring-background" />
                </div>
                <div
                  className="flex min-w-0 items-center gap-3 py-2 pl-8 pr-1 cursor-pointer transition-colors duration-150 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); handleEventClick(item); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleEventClick(item); } }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-ui-base font-medium text-foreground line-clamp-1">{item.title}</div>
                    {item.description && (
                      <div className="text-ui-sm text-earth-500 line-clamp-1">{item.description}</div>
                    )}
                  </div>
                  <div className="shrink-0">
                    <TravelerAvatars
                      tripId={tripId}
                      eventType={item.type === 'hotel' ? 'accommodation' : item.type}
                      eventId={item.type === 'hotel' ? (item.data?.stay_id as string) : item.id}
                      maxShow={3}
                    />
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(GroupedEventCard);
