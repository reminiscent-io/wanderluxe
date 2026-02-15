import React from 'react';
import { ExternalLink, MapPin, Phone, Clock, ShieldCheck, Star as StarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DayActivity, HotelStay, Transportation, RestaurantReservation } from '@/types/trip';
import { formatCurrencyWithSymbol } from '../../budget/utils/budgetCalculations';
import TravelerAvatars from '../../timeline/TravelerAvatars';
import { TimelineItem, TimelineType, getEventColors, formatTime12, formatTime12Stacked, getEventIconComponent, parseTimeToHM } from './timeline-utils';

type Props = {
  item: TimelineItem;
  idx: number;
  isLast: boolean;
  tripId: string;
  isPast?: boolean;
  onActivityClick?: (a: DayActivity) => void;
  onHotelClick?: (h: HotelStay) => void;
  onTransportationClick?: (t: Transportation) => void;
  onReservationClick?: (r: RestaurantReservation) => void;
};

/** Compute duration string from start_time/end_time like "2h 30m" */
const computeDuration = (startTime?: string, endTime?: string): string | null => {
  if (!startTime || !endTime) return null;
  const start = parseTimeToHM(startTime);
  const end = parseTimeToHM(endTime);
  if (!start || !end) return null;
  let mins = (end.h * 60 + end.m) - (start.h * 60 + start.m);
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

/** Type-specific metadata badges rendered between description and footer */
const EventMetadata: React.FC<{ item: TimelineItem }> = ({ item }) => {
  const badges: React.ReactNode[] = [];

  if (item.type === 'dining') {
    if (item.data?.address) {
      badges.push(
        <div key="address" className="flex items-center gap-1 text-xs text-earth-500">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="line-clamp-1">{item.data.address}</span>
        </div>
      );
    }
    if (item.data?.rating) {
      badges.push(
        <div key="rating" className="flex items-center gap-1 text-xs text-amber-600">
          <StarIcon className="h-3 w-3 flex-shrink-0 fill-amber-400 text-amber-400" />
          <span>{item.data.rating}</span>
        </div>
      );
    }
  }

  if (item.type === 'activity') {
    const duration = computeDuration(item.data?.start_time, item.data?.end_time);
    if (duration) {
      badges.push(
        <div key="duration" className="flex items-center gap-1 text-xs text-earth-500">
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span>{duration}</span>
        </div>
      );
    }
  }

  if (item.type === 'transportation') {
    if (item.data?.confirmation_number) {
      badges.push(
        <div key="confirmation" className="flex items-center gap-1 text-xs text-earth-500">
          <ShieldCheck className="h-3 w-3 flex-shrink-0" />
          <span className="font-mono">{item.data.confirmation_number}</span>
        </div>
      );
    }
    if (item.data?.provider) {
      badges.push(
        <div key="provider" className="text-xs text-earth-500">
          {item.data.provider}
        </div>
      );
    }
  }

  if (item.type === 'hotel') {
    if (item.data?.hotel_phone) {
      badges.push(
        <div key="phone" className="flex items-center gap-1 text-xs text-earth-500">
          <Phone className="h-3 w-3 flex-shrink-0" />
          <span>{item.data.hotel_phone}</span>
        </div>
      );
    }
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
      {badges}
    </div>
  );
};

/** Build footer links for any event type */
const getFooterLink = (item: TimelineItem): { href: string; label: string } | null => {
  if (item.type === 'hotel') {
    const url = item.data?.hotel_website || item.data?.hotel_url;
    if (url) return { href: url, label: 'Hotel Website' };
  }
  if (item.type === 'dining' && item.data?.website) {
    return { href: item.data.website, label: 'Website' };
  }
  return null;
};

const TimelineRow: React.FC<Props> = ({
  item, idx, isLast, tripId, isPast,
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
  const footerLink = getFooterLink(item);
  const hasFooter = !!(item.data?.cost || footerLink);

  return (
    <div className={cn("pb-3 sm:pb-4 last:pb-0", isPast && "opacity-50")}>
      {/* Mobile Layout */}
      <div className="sm:hidden">
        {/* Node and Event Card */}
        <div className="grid grid-cols-[24px_1fr] gap-2">
          {/* Timeline Rail - Small Subtle Dot */}
          <div className="relative flex flex-col items-center">
            <div
              className="relative w-3 h-3 rounded-full flex-shrink-0 mt-2 bg-white z-10"
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: colors.node === 'bg-amber-500' ? '#f59e0b' :
                            colors.node === 'bg-sky-500' ? '#0ea5e9' :
                            colors.node === 'bg-emerald-500' ? '#10b981' :
                            colors.node === 'bg-rose-500' ? '#f43f5e' :
                            '#d1d5db',
              }}
            />
          </div>

          {/* Event Card */}
          <div
            className="relative flex-1 min-w-0 bg-white rounded-lg shadow-sm hover:shadow-md p-3 cursor-pointer transition-all duration-200 border border-gray-100"
            onClick={handleItemClick}
          >
            {/* Top-right: Avatar Stack (Face Pile) */}
            <div className="absolute top-3 right-3">
              <TravelerAvatars
                tripId={tripId}
                eventType={item.type === 'hotel' ? 'accommodation' : item.type}
                eventId={item.type === 'hotel' ? item.data.stay_id : item.id}
                maxShow={3}
              />
            </div>

            {/* Main Content: Icon + Title/Subtitle */}
            <div className="flex items-start gap-3">
              {/* Icon - Outline, no background */}
              <div className={cn("flex-shrink-0 mt-0.5", colors.node.replace('bg-', 'text-'))}>
                {React.createElement(
                  getEventIconComponent(item.type as TimelineType, item.data?.type),
                  { className: 'h-5 w-5', strokeWidth: 1.5 }
                )}
              </div>

              {/* Text Content: Title + Time + Subtitle */}
              <div className="flex-1 min-w-0 pr-8">
                {/* Event Title with inline time */}
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-earth-900 hover:text-earth-950 transition-colors">
                    {item.title}
                  </span>
                  {item.time && (
                    <span className="text-xs font-medium text-earth-500 whitespace-nowrap">
                      {formatTime12(item.time)}
                    </span>
                  )}
                </div>

                {/* Subtitle/Details */}
                {item.description && (
                  <div className="text-xs text-earth-500 mt-1 line-clamp-2">
                    {item.description}
                  </div>
                )}

                {/* End Time */}
                {item.endTime && (
                  <div className="text-xs text-earth-400 mt-1">until {formatTime12(item.endTime)}</div>
                )}

                {/* Type-specific metadata */}
                <EventMetadata item={item} />
              </div>
            </div>

            {/* Footer Section - Divider + Price + Action Link */}
            {hasFooter && (
              <>
                <div className="border-t border-gray-200 mt-3 pt-3" />
                <div className="flex items-center justify-between">
                  {item.data?.cost ? (
                    <span className="text-xs font-semibold text-emerald-600">
                      {formatCurrencyWithSymbol(item.data.cost, item.data.currency || 'USD')}
                    </span>
                  ) : (
                    <div />
                  )}
                  {footerLink && (
                    <a
                      href={footerLink.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors flex items-center gap-1"
                    >
                      {footerLink.label}
                      <ExternalLink className="h-3 w-3" strokeWidth={2} />
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout: Time on left (original layout) */}
      <div className="hidden sm:grid sm:grid-cols-[60px_40px_1fr] gap-0">
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
            className="relative w-5 h-5 rounded-full flex-shrink-0 mt-2 bg-white z-10"
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
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Icon Container: Responsive size with event-type background */}
            <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white", colors.node)}>
              {React.createElement(
                getEventIconComponent(item.type as TimelineType, item.data?.type),
                { className: 'h-4 w-4 sm:h-5 sm:w-5' }
              )}
            </div>

            {/* Text Content: Title + Subtitle */}
            <div className="flex-1 min-w-0">
              {/* Event Title - Bold, slightly reduced size */}
              <div className="text-sm font-bold text-earth-900 hover:text-earth-950 transition-colors line-clamp-2">
                {item.title}
              </div>

              {/* Subtitle/Details */}
              {item.description && (
                <div className="text-xs text-earth-500 mt-1 line-clamp-2">
                  {item.description}
                </div>
              )}

              {/* End Time */}
              {item.endTime && (
                <div className="text-xs text-earth-400 mt-1">until {formatTime12(item.endTime)}</div>
              )}

              {/* Type-specific metadata */}
              <EventMetadata item={item} />
            </div>
          </div>

          {/* Footer Section - Divider + Price + Action Link */}
          {hasFooter && (
            <>
              <div className="border-t border-gray-200 mt-3 pt-3" />
              <div className="flex items-center justify-between">
                {item.data?.cost ? (
                  <span className="text-xs font-semibold text-emerald-600">
                    {formatCurrencyWithSymbol(item.data.cost, item.data.currency || 'USD')}
                  </span>
                ) : (
                  <div />
                )}
                {footerLink && (
                  <a
                    href={footerLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors flex items-center gap-1"
                  >
                    {footerLink.label}
                    <ExternalLink className="h-3 w-3" strokeWidth={2} />
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(TimelineRow);
