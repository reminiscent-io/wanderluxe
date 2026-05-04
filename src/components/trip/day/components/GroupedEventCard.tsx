import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { DayActivity, HotelStay, Transportation, RestaurantReservation } from '@/types/trip';
import { TimelineItem, TimelineType, formatTimeRange, getEventIconComponent } from './timeline-utils';
import TravelerAvatars from '../../timeline/TravelerAvatars';
import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  items: TimelineItem[];
  groupType: TimelineType;
  title: string;
  timeRange: string;
  tripId: string;
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
  onActivityClick,
  onHotelClick,
  onTransportationClick,
  onReservationClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleEventClick = (item: typeof items[0]) => {
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

  // Get icon component based on event type
  const IconComponent = getEventIconComponent(groupType, firstItem?.data?.type) as React.ComponentType<{ className?: string; size?: number | string }>;

  return (
    <div className="pb-3 sm:pb-4">
      {/* Unified Layout: Rail + Content */}
      <div className="grid grid-cols-[24px_1fr] sm:grid-cols-[40px_1fr] gap-2 sm:gap-3">
        {/* Column 1: Timeline Rail - Node */}
        <div className="relative flex flex-col items-center">
          <div className="relative w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 bg-card border-2 border-sand-500/60 z-10" />
        </div>

        {/* Column 2: Time Label + Grouped Card */}
        <div className="flex flex-col gap-1.5 min-w-0">
          {/* Time Range Label */}
          {timeRange && (
            <span className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-[0.12em] leading-none">
              {timeRange}
            </span>
          )}

          {/* Grouped Event Card */}
          <div className="relative flex-1 min-w-0">
            <div
              className="bg-card rounded-card shadow-warm-sm hover:shadow-warm p-3 sm:p-4 cursor-pointer transition-shadow duration-200 border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              role="button"
              tabIndex={0}
              onClick={() => setIsExpanded(!isExpanded)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded(!isExpanded); } }}
            >
              {/* Main Content: Icon + Title */}
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5 text-earth-600">
                  <IconComponent className="h-5 w-5" strokeWidth={1.5} />
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0">
                  {/* Group Title */}
                  <div className="text-base font-display font-normal text-foreground leading-snug">
                    {title}
                  </div>

                  {/* Count */}
                  <div className="text-xs text-muted-foreground mt-1">
                    {items.length} {groupType === 'transportation' ? 'flights' : 'events'}
                  </div>
                </div>

                {/* Expand/Collapse Icon */}
                <div className="flex-shrink-0 ml-2 text-muted-foreground">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Individual Events */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden mt-2"
                >
                  <div className="space-y-2 pl-4 border-l border-border">
                    {items.map((item) => (
                      <div key={item.id} className="relative">
                        {/* Individual event card - simplified version */}
                        <div
                          className="bg-secondary/50 rounded-md shadow-warm-sm hover:shadow-warm p-3 cursor-pointer transition-shadow duration-200 border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); handleEventClick(item); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleEventClick(item); } }}
                        >
                          <div>
                            {/* Time range on one row */}
                            {item.time && (
                              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.12em] mb-1">
                                {formatTimeRange(item.time, item.endTime, item.type === 'transportation')}
                              </div>
                            )}

                            {/* Title + Avatars */}
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-foreground line-clamp-1">
                                  {item.title}
                                </div>
                                {item.description && (
                                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                    {item.description}
                                  </div>
                                )}
                              </div>

                              {/* Traveler Avatars */}
                              <div className="flex-shrink-0">
                                <TravelerAvatars
                                  tripId={tripId}
                                  eventType={item.type === 'hotel' ? 'accommodation' : item.type}
                                  eventId={item.type === 'hotel' ? item.data?.stay_id : item.id}
                                  maxShow={3}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(GroupedEventCard);
