import React from 'react';
import { DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DayActivity, HotelStay, Transportation, RestaurantReservation } from '@/types/trip';
import TravelerAvatars from '../../timeline/TravelerAvatars'; // adjust path if needed
import { TimelineItem, TimelineType, getEventColors, formatTime12, getTransportationIconComponent } from './timeline-utils';

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

  return (
    <div className="flex gap-4 pb-4 last:pb-0">
      {/* Time */}
      <div className="w-20 md:w-24 flex-shrink-0 text-right">
        <span className="text-sm font-semibold text-earth-700">
          {item.time ? formatTime12(item.time) : '—'}
        </span>
      </div>

      {/* Rail */}
      <div className="relative flex flex-col items-center">
        <div className={cn("w-3 h-3 rounded-full flex-shrink-0 mt-0.5 border-2 border-white shadow-sm", colors.node)} />
        {!isLast && (
          <div className={cn("absolute top-4 w-0.5 h-full rounded-full", colors.line)} />
        )}
      </div>

      {/* Card */}
      <div
        className="flex-1 min-w-0 cursor-pointer hover:bg-sand-50 rounded-lg p-3 -m-1 transition-all duration-200 hover:shadow-sm"
        onClick={handleItemClick}
      >
        <div className="flex items-start gap-3">
          <span className={cn("mt-0.5 flex-shrink-0", colors.icon)}>
            {item.type === 'transportation' && item.data?.type ? (
              React.createElement(getTransportationIconComponent(item.data.type), { className: 'h-3 w-3' })
            ) : (
              item.icon || <div className="h-3 w-3" />
            )}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-m font-semibold text-earth-800 hover:text-earth-900 transition-colors">
              {item.title}
            </div>
            {item.endTime && (
              <div className="text-sm text-earth-500 mt-1">until {formatTime12(item.endTime)}</div>
            )}
            {item.description && (
              <div className="text-xs text-earth-600 mt-1">{item.description}</div>
            )}
            {item.data?.cost && (
              <div className="flex items-center gap-1 mt-2">
                <DollarSign className="h-3 w-3 text-earth-500" />
                <span className="text-xs text-earth-600">
                  {item.data.currency || 'USD'} {item.data.cost}
                </span>
              </div>
            )}
          </div>
          <div className="flex-shrink-0 ml-2">
            <TravelerAvatars
              tripId={tripId}
              eventType={item.type === 'hotel' ? 'accommodation' : item.type}
              eventId={item.type === 'hotel' ? item.data.stay_id : item.id}
              maxShow={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TimelineRow);