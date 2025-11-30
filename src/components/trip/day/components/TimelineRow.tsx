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

      {/* Column 2: Timeline Rail - Node Only (line handled by parent) */}
      <div className="relative flex flex-col items-center">
        {/* White circle with colored border (3px) aligned with card center */}
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

      {/* Column 3: Event Card */}
      <div
        className="relative flex-1 min-w-0 bg-white rounded-xl shadow-sm hover:shadow-md p-4 cursor-pointer transition-all duration-200"
        onClick={handleItemClick}
      >
        {/* Top-right: Avatar Stack (Face Pile) */}
        <div className="absolute top-4 right-4">
          <TravelerAvatars
            tripId={tripId}
            eventType={item.type === 'hotel' ? 'accommodation' : item.type}
            eventId={item.type === 'hotel' ? item.data.stay_id : item.id}
            maxShow={3}
          />
        </div>

        {/* Main Content: Icon + Title/Subtitle */}
        <div className="flex items-start gap-4">
          {/* Icon Container: 48x48px rounded square with event-type background */}
          <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-white", colors.node)}>
            {item.type === 'transportation' && item.data?.type ? (
              React.createElement(getTransportationIconComponent(item.data.type), { className: 'h-5 w-5' })
            ) : (
              item.icon || <div className="h-5 w-5" />
            )}
          </div>

          {/* Text Content: Title + Subtitle */}
          <div className="flex-1 min-w-0">
            {/* Event Title - Bold */}
            <div className="text-sm font-semibold text-earth-800 hover:text-earth-900 transition-colors line-clamp-2">
              {item.title}
            </div>

            {/* Subtitle/Details - Smaller, Lighter Grey */}
            {item.description && (
              <div className="text-xs text-earth-600 mt-0.5 line-clamp-2">
                {item.description}
              </div>
            )}

            {/* End Time */}
            {item.endTime && (
              <div className="text-xs text-earth-500 mt-1">until {formatTime12(item.endTime)}</div>
            )}
          </div>
        </div>

        {/* Footer Section - Divider + Price + Action Link */}
        {(item.data?.cost || item.data?.hotel_website || item.data?.hotel_url) && (
          <>
            {/* Horizontal Divider */}
            <div className="border-t border-gray-200 mt-3 pt-3" />

            {/* Footer Row - Flexbox with space-between */}
            <div className="flex items-center justify-between">
              {/* Price on the left - Green and Bold */}
              {item.data?.cost ? (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span className="font-bold text-emerald-600">
                    {formatCurrencyWithSymbol(item.data.cost, item.data.currency || 'USD')}
                  </span>
                </div>
              ) : (
                <div />
              )}

              {/* Action Link on the right - Blue */}
              {item.data?.hotel_website && (
                <a
                  href={item.data.hotel_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                >
                  View Details
                </a>
              )}
              {item.data?.hotel_url && !item.data?.hotel_website && (
                <a
                  href={item.data.hotel_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                >
                  View Booking
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(TimelineRow);