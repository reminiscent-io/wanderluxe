import React from 'react';
import { ExternalLink, Star as StarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DayActivity, HotelStay, Transportation, RestaurantReservation } from '@/types/trip';
import HotelPhotoThumb from './HotelPhotoThumb';
import TravelerAvatars from '../../timeline/TravelerAvatars';
import {
  TimelineItem,
  formatTime12,
  formatTimeCompact,
  getEventCategory,
  getTimelineIcon,
  CATEGORY_ICON_CLASS,
  CATEGORY_ROW_CLASS,
  parseTimeToHM,
} from './timeline-utils';

type Props = {
  item: TimelineItem;
  idx: number;
  isLast: boolean;
  tripId: string;
  isPast?: boolean;
  /** First / last rail-bearing row in its run, so the line stops at the node. */
  railStart?: boolean;
  railEnd?: boolean;
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

/**
 * The single meta line under the title. Everything that used to be its own
 * badge row collapses into one clamped sentence joined by middots, so every
 * row is exactly two lines tall regardless of how much metadata it carries.
 */
const buildMetaParts = (item: TimelineItem): string[] => {
  const parts: string[] = [];
  if (item.description) parts.push(item.description);

  if (item.type === 'dining' && item.data?.address) parts.push(String(item.data.address));
  if (item.type === 'hotel' && item.data?.hotel_phone) parts.push(String(item.data.hotel_phone));
  if (item.type === 'transportation') {
    if (item.data?.provider) parts.push(String(item.data.provider));
    if (item.data?.confirmation_number) parts.push(String(item.data.confirmation_number));
  }

  const duration = computeDuration(
    item.time,
    item.endTime || (item.data?.__arrive_time_on_this_day as string | undefined),
  );
  if (duration) parts.push(duration);

  return parts;
};

/** Build footer links for any event type */
const getFooterLink = (item: TimelineItem): { href: string; label: string } | null => {
  if (item.type === 'hotel') {
    const url = item.data?.hotel_website || item.data?.hotel_url;
    if (url) return { href: String(url), label: 'Hotel Website' };
  }
  if (item.type === 'dining' && item.data?.website) {
    return { href: String(item.data.website), label: 'Website' };
  }
  return null;
};

const TimelineRow: React.FC<Props> = ({
  item, tripId, isPast, railStart, railEnd,
  onActivityClick, onHotelClick, onTransportationClick, onReservationClick
}) => {
  const handleItemClick = () => {
    if (item.type === 'activity' && onActivityClick && item.data) return onActivityClick(item.data);
    if (item.type === 'hotel' && onHotelClick && item.data) return onHotelClick(item.data);
    if (item.type === 'transportation' && onTransportationClick && item.data) return onTransportationClick(item.data);
    if (item.type === 'dining' && onReservationClick && item.data) return onReservationClick(item.data);
  };

  const footerLink = getFooterLink(item);
  const metaParts = buildMetaParts(item);
  const endValue = item.endTime || (item.data?.__arrive_time_on_this_day as string | undefined);
  const startLabel = formatTimeCompact(item.time);
  const endLabel = formatTimeCompact(endValue);
  // A single-row day needs a node, not a line to nowhere.
  const showRail = !(railStart && railEnd);
  const category = getEventCategory(item);
  const Icon = getTimelineIcon(item) as React.ComponentType<{ className?: string; strokeWidth?: number }>;
  const placeId =
    (item.type === 'hotel' && item.data?.hotel_place_id) ||
    (item.type === 'activity' && item.data?.location_place_id) ||
    (item.type === 'dining' && item.data?.place_id) ||
    null;

  return (
    <div
      className={cn(
        // The rail lives inside the row, so consecutive rows draw one
        // continuous line with no global offset to keep in sync.
        'group/row tl-row min-h-row cursor-pointer transition-colors duration-150',
        CATEGORY_ROW_CLASS[category],
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        'touch-manipulation',
      )}
      role="button"
      tabIndex={0}
      onClick={handleItemClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleItemClick(); } }}
    >
      {/* Gutter: start stacked over finish, right-aligned, tabular so digits stack.
          Weight carries the pair: bold start, quiet finish. An event with no
          finish time simply has no second line — a placeholder there reads as
          a broken value rather than as an open end.
          The compact labels ("6:23p") are spoken badly, so each one carries an
          unabbreviated screen-reader twin. */}
      <div className="py-3 text-right">
        {startLabel && (
          <>
            <div className="text-ui-base font-medium tabular-nums text-earth-600">
              <span className="sr-only">
                Starts {formatTime12(item.time)}{item.tzSuffix ? ` ${item.tzSuffix}` : ''}
              </span>
              <span aria-hidden>{startLabel}</span>
            </div>
            {item.tzSuffix && (
              <div aria-hidden className="text-ui-xs tabular-nums text-earth-500">{item.tzSuffix}</div>
            )}
            {endLabel && (
              <>
                <div className="text-ui-base tabular-nums text-earth-500">
                  <span className="sr-only">
                    Ends {formatTime12(endValue)}{item.endTzSuffix ? ` ${item.endTzSuffix}` : ''}
                  </span>
                  <span aria-hidden>{endLabel}</span>
                </div>
                {item.endTzSuffix && (
                  <div aria-hidden className="text-ui-xs tabular-nums text-earth-500">{item.endTzSuffix}</div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Rail: hairline with a filled node. The line stops at the first and
          last node of a run so the day doesn't appear to continue past its
          own ends. */}
      <div aria-hidden className="relative flex justify-center">
        {showRail && (
          <div
            className={cn(
              'absolute w-px bg-border',
              railStart ? 'top-[1.375rem]' : 'top-0',
              railEnd ? 'h-[1.375rem]' : 'bottom-0',
            )}
          />
        )}
        <div
          className={cn(
            'relative mt-[1.125rem] h-2 w-2 shrink-0 rounded-full ring-4 ring-background',
            isPast ? 'bg-earth-300' : 'bg-earth-400',
          )}
        />
      </div>

      {/* Content */}
      <div className="flex min-w-0 items-start gap-3 py-3 pr-1">
        {/* A past event recedes by dropping an ink level, not by fading the
            whole row: at 50% opacity the meta line fell to 2.1:1. */}
        <div className={cn('mt-0.5 shrink-0', isPast ? 'text-earth-400' : CATEGORY_ICON_CLASS[category])}>
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>

        <div className="min-w-0 flex-1">
          <div className={cn('text-ui-md font-medium line-clamp-1', isPast ? 'text-earth-500' : 'text-foreground')}>
            {item.title}
          </div>

          {/* Meta row: one clamped line, avatars pinned right */}
          <div className="mt-0.5 flex items-center gap-3">
            <div className="min-w-0 flex-1 text-ui-sm text-earth-500 line-clamp-1">
              {metaParts.join(' · ')}
              {item.type === 'dining' && item.data?.rating ? (
                <span className="ml-2 inline-flex items-center gap-1 align-baseline tabular-nums text-amber-600">
                  <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {String(item.data.rating)}
                </span>
              ) : null}
              {footerLink && (
                <a
                  href={footerLink.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="ml-2 inline-flex items-center gap-1 align-baseline font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {footerLink.label}
                  <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                </a>
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

        {placeId && (
          <div className="hidden shrink-0 sm:block">
            <HotelPhotoThumb placeId={String(placeId)} title={item.title} size="md" />
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(TimelineRow);
