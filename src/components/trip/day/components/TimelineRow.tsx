import React from 'react';
import { DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DayActivity, HotelStay, Transportation, RestaurantReservation } from '@/types/trip';
import { formatCurrencyWithSymbol } from '../../budget/utils/budgetCalculations';
import TravelerAvatars from '../../timeline/TravelerAvatars'; // adjust path if needed
import { TimelineItem, TimelineType, getEventColors, formatTime12, formatTime12Stacked, getTransportationIconComponent } from './timeline-utils';

type Props = {
  item: TimelineItem;
  idx: number;
  isLast: boolean;
  tripId: string;
  onActivityClick?: (a: DayActivity) => void;
  onHotelClick?: (h: HotelStay) => void;
  onTransportationClick?: (t: Transportation) => void;
  onReservationClick?: (r: RestaurantReservation) => void;
};

const TimelineRow: React.FC<Props> = ({
  item, idx, isLast, tripId,
  onActivityClick, onHotelClick, onTransportationClick, onReservationClick
}) => {
  const colors = getEventColors(item.type as TimelineType);

  const handleItemClick = () => {
    if (item.type === 'activity' && onActivityClick && item.data) return onActivityClick(item.data);
    if (item.type === 'hotel' && onHotelClick && item.data) return onHotelClick(item.data);
    if (item.type === 'transportation' && onTransportationClick && item.data) return onTransportationClick(item.data);
    if (item.type === 'dining' && onReservationClick && item.data) return onReservationClick(item.data);
  };

  const timeData = formatTime12Stacked(item.time);

  return (
    <div className="grid grid-cols-[60px_40px_1fr] gap-0 pb-3 sm:pb-4 last:pb-0">
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

      {/* Column 2: Timeline Rail */}
      <div className="relative flex flex-col items-center">
        {/* Continuous blue line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-blue-500 -translate-x-1/2" />
        {/* Colored dot aligned with card center */}
        <div className={cn("relative w-4 h-4 rounded-full flex-shrink-0 mt-2 border-2 border-white shadow-md z-10", colors.node)} />
      </div>

      {/* Column 3: Event Card */}
      <div
        className="flex-1 min-w-0 bg-white rounded-xl shadow-sm hover:shadow-md p-4 cursor-pointer transition-all duration-200"
        onClick={handleItemClick}
      >
        <div className="flex items-start gap-2 sm:gap-3">
          <span className={cn("mt-0.5 flex-shrink-0", colors.icon)}>
            {item.type === 'transportation' && item.data?.type ? (
              React.createElement(getTransportationIconComponent(item.data.type), { className: 'h-3 w-3 sm:h-3.5 sm:w-3.5' })
            ) : (
              item.icon || <div className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            )}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm sm:text-base font-semibold text-earth-800 hover:text-earth-900 transition-colors line-clamp-2">
              {item.title}
            </div>
            {item.endTime && (
              <div className="text-xs sm:text-sm text-earth-500 mt-1">until {formatTime12(item.endTime)}</div>
            )}
            {item.description && (
              <div className="text-xs text-earth-600 mt-1 line-clamp-3">{item.description}</div>
            )}
            {item.data?.cost && (
              <div className="flex items-center gap-1 mt-1.5 sm:mt-2">
                <DollarSign className="h-3 w-3 text-earth-500" />
                <span className="text-xs text-earth-600">
                  {formatCurrencyWithSymbol(item.data.cost, item.data.currency || 'USD')}
                </span>
              </div>
            )}
          </div>
          <div className="flex-shrink-0 ml-1 sm:ml-2">
            <TravelerAvatars
              tripId={tripId}
              eventType={item.type === 'hotel' ? 'accommodation' : item.type}
              eventId={item.type === 'hotel' ? item.data.stay_id : item.id}
              maxShow={2}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TimelineRow);