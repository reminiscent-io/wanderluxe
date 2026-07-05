import React from 'react';
import { ExternalLink, MapPin, Phone, Clock, ShieldCheck, Star as StarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DayActivity, HotelStay, Transportation, RestaurantReservation } from '@/types/trip';
import HotelPhotoThumb from './HotelPhotoThumb';
import { formatCurrencyWithSymbol } from '../../budget/utils/budgetCalculations';
import TravelerAvatars from '../../timeline/TravelerAvatars';
import { TimelineItem, TimelineType, formatTimeRange, getEventIconComponent, parseTimeToHM } from './timeline-utils';

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
  const mins = (end.h * 60 + end.m) - (start.h * 60 + start.m);
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
          <span className="font-sans tabular-nums tracking-wide">{item.data.confirmation_number}</span>
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
  item, tripId, isPast,
  onActivityClick, onHotelClick, onTransportationClick, onReservationClick
}) => {
  const handleItemClick = () => {
    if (item.type === 'activity' && onActivityClick && item.data) return onActivityClick(item.data);
    if (item.type === 'hotel' && onHotelClick && item.data) return onHotelClick(item.data);
    if (item.type === 'transportation' && onTransportationClick && item.data) return onTransportationClick(item.data);
    if (item.type === 'dining' && onReservationClick && item.data) return onReservationClick(item.data);
  };

  const footerLink = getFooterLink(item);
  const hasFooter = !!(item.data?.cost || footerLink);

  // Build the time label
  const timeLabel = item.time
    ? formatTimeRange(item.time, item.endTime, item.type === 'transportation', item.tzSuffix ?? '', item.endTzSuffix ?? '')
    : '';

  return (
    <div className={cn("pb-3 sm:pb-4 last:pb-0", isPast && "opacity-50")}>
      {/* Unified Layout: Rail + Content */}
      <div className="grid grid-cols-[24px_1fr] sm:grid-cols-[40px_1fr] gap-2 sm:gap-3">
        {/* Column 1: Timeline Rail - Node */}
        <div className="relative flex flex-col items-center">
          <div className="relative w-3 h-3 rounded-full flex-shrink-0 mt-1 bg-card border-2 border-sand-500 z-10" />
        </div>

        {/* Column 2: Time Label + Event Card */}
        <div className="flex flex-col gap-1.5 min-w-0">
          {/* Time Range Label */}
          {timeLabel && (
            <span className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-[0.12em] leading-none">
              {timeLabel}
            </span>
          )}

          {/* Event Row */}
          <div
            className="group/row relative flex-1 min-w-0 -mx-2 px-2 py-1.5 sm:py-2 cursor-pointer rounded-md hover:bg-secondary/40 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            role="button"
            tabIndex={0}
            onClick={handleItemClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleItemClick(); } }}
          >
            {/* Top-right: Avatar Stack */}
            <div className="absolute top-1.5 right-2 sm:top-2 sm:right-2">
              <TravelerAvatars
                tripId={tripId}
                eventType={item.type === 'hotel' ? 'accommodation' : item.type}
                eventId={item.type === 'hotel' ? item.data.stay_id : item.id}
                maxShow={3}
              />
            </div>

            {/* Main Content: Icon + Title/Subtitle + Optional Hotel Thumb */}
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5 text-earth-600">
                {React.createElement(
                  getEventIconComponent(item.type as TimelineType, item.data?.type) as React.ComponentType<{ className?: string; strokeWidth?: number }>,
                  { className: 'h-5 w-5', strokeWidth: 1.5 }
                )}
              </div>

              {/* Text Content */}
              <div className="flex-1 min-w-0 pr-8">
                {/* Event Title */}
                <div className="text-base font-display font-normal text-foreground leading-snug line-clamp-2">
                  {item.title}
                </div>

                {/* Subtitle/Details */}
                {item.description && (
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </div>
                )}

                {/* Type-specific metadata */}
                <EventMetadata item={item} />
              </div>

              {/* Place photo thumbnail — hidden on mobile to prevent layout overflow */}
              <div className="hidden sm:block flex-shrink-0">
                {item.type === 'hotel' && item.data?.hotel_place_id && (
                  <HotelPhotoThumb placeId={item.data.hotel_place_id} title={item.data.hotel} size="md" />
                )}
                {item.type === 'activity' && item.data?.location_place_id && (
                  <HotelPhotoThumb placeId={item.data.location_place_id} title={item.title} size="md" />
                )}
                {item.type === 'dining' && item.data?.place_id && (
                  <HotelPhotoThumb placeId={item.data.place_id} title={item.title} size="md" />
                )}
              </div>
            </div>

            {/* Footer Section */}
            {hasFooter && (
              <div className="mt-2 pt-2 flex items-center justify-between">
                {item.data?.cost ? (
                  <span className="text-xs font-medium text-earth-600 tabular-nums">
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
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                  >
                    {footerLink.label}
                    <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TimelineRow);
