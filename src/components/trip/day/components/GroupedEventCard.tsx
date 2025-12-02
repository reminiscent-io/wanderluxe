import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DayActivity, HotelStay, Transportation, RestaurantReservation } from '@/types/trip';
import { TimelineItem, TimelineType, getEventColors, formatTime12Stacked, getEventIconComponent } from './timeline-utils';
import TimelineRow from './TimelineRow';
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
  const colors = getEventColors(groupType);

  // Get the first item's time for display
  const firstItem = items[0];
  const timeData = formatTime12Stacked(firstItem?.time);

  // Get icon component based on event type
  const IconComponent = getEventIconComponent(groupType, firstItem?.data?.type);

  return (
    <div className="grid grid-cols-[60px_40px_1fr] gap-0 pb-3 sm:pb-4">
      {/* Column 1: Time */}
      <div className="flex-shrink-0 pr-2 text-right">
        <div className="font-bold text-earth-900 text-sm">
          {timeData.time || '—'}
        </div>
        {timeData.meridiem && (
          <div className="font-bold text-earth-700 text-xs">
            {timeData.meridiem}
          </div>
        )}
      </div>

      {/* Column 2: Timeline Rail - Node Only */}
      <div className="relative flex flex-col items-center">
        <div
          className="relative w-5 h-5 rounded-full flex-shrink-0 mt-2 bg-white shadow-md z-10"
          style={{
            borderWidth: '3px',
            borderStyle: 'solid',
            borderColor: colors.node === 'bg-amber-500' ? '#f59e0b' :
                        colors.node === 'bg-sky-500' ? '#0ea5e9' :
                        colors.node === 'bg-emerald-500' ? '#10b981' :
                        colors.node === 'bg-rose-500' ? '#f43f5e' :
                        '#94a3b8'
          }}
        />
      </div>

      {/* Column 3: Grouped Event Card */}
      <div className="relative flex-1 min-w-0">
        <div
          className="bg-white rounded-xl shadow-sm hover:shadow-md p-4 cursor-pointer transition-all duration-200"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* Main Content: Icon + Title */}
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Icon Container: Responsive size */}
            <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white", colors.node)}>
              {React.createElement(IconComponent, { className: 'h-4 w-4 sm:h-5 sm:w-5' })}
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              {/* Group Title - Bold */}
              <div className="text-sm font-bold text-earth-900 hover:text-earth-950 transition-colors">
                {title}
              </div>

              {/* Count and Time Range */}
              <div className="text-xs text-earth-500 mt-1">
                {items.length} {groupType === 'transportation' ? 'flights' : 'events'} • {timeRange}
              </div>
            </div>

            {/* Expand/Collapse Icon */}
            <div className="flex-shrink-0 ml-2">
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-earth-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-earth-400" />
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
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden mt-2"
            >
              <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                {items.map((item, idx) => (
                  <div key={item.id} className="relative">
                    {/* Individual event card - simplified version */}
                    <div
                      className="bg-sand-50 rounded-lg shadow-sm hover:shadow-md p-3 cursor-pointer transition-all duration-200 border border-sand-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.type === 'activity' && onActivityClick && item.data) {
                          onActivityClick(item.data);
                        } else if (item.type === 'hotel' && onHotelClick && item.data) {
                          onHotelClick(item.data);
                        } else if (item.type === 'transportation' && onTransportationClick && item.data) {
                          onTransportationClick(item.data);
                        } else if (item.type === 'dining' && onReservationClick && item.data) {
                          onReservationClick(item.data);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Time */}
                        <div className="flex-shrink-0 text-xs font-medium text-earth-700 w-14">
                          {item.time ? formatTime12Stacked(item.time).time : '—'}
                          {item.time && (
                            <span className="text-[10px] ml-0.5">{formatTime12Stacked(item.time).meridiem}</span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-earth-900 line-clamp-1">
                            {item.title}
                          </div>
                          {item.description && (
                            <div className="text-xs text-earth-500 mt-0.5 line-clamp-1">
                              {item.description}
                            </div>
                          )}
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
  );
};

export default React.memo(GroupedEventCard);
