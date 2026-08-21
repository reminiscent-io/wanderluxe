import React from 'react';
import { ExternalLink, Star as StarIcon, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DayActivity, HotelStay, Transportation, RestaurantReservation } from '@/types/trip';
import { formatTransportationType } from '@/utils/transportationUtils';
import TravelerAvatars from '../../timeline/TravelerAvatars';
import HotelPhotoThumb from './HotelPhotoThumb';
import type { TimelineRowData } from './timeline-utils';
import {
  formatCostCompact,
  formatTime12,
  getEventCategory,
  getTimelineIcon,
  CATEGORY_ICON_CLASS,
} from './timeline-utils';

/** The four things a day can hold, tagged so one dialog can read all of them. */
export type EventDetail =
  | { kind: 'activity'; data: DayActivity }
  | { kind: 'hotel'; data: HotelStay }
  | { kind: 'transportation'; data: Transportation }
  | { kind: 'dining'; data: RestaurantReservation };

type Props = {
  event: EventDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  canEdit?: boolean;
  onEdit: (event: EventDetail) => void;
};

type Fact = { label: string; value: React.ReactNode };
type Link = { label: string; href: string };

/** Dates are floating wall-clock, so build them locally rather than via Date.parse. */
const formatDateLong = (iso?: string | null): string => {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d);
};

const joinParts = (...parts: (string | null | undefined)[]): string =>
  parts.filter(Boolean).join(' · ');

const money = (
  cost: number | null | undefined,
  currency: string | null | undefined,
  isPaid?: boolean,
): string => {
  if (typeof cost !== 'number') return '';
  return joinParts(formatCostCompact(cost, currency || 'USD'), isPaid ? 'Paid' : undefined);
};

const timeSpan = (start?: string | null, end?: string | null): string => {
  const s = formatTime12(start || undefined);
  const e = formatTime12(end || undefined);
  if (s && e) return `${s} – ${e}`;
  return s || e || '';
};

const rating = (value?: number | null): React.ReactNode =>
  typeof value === 'number' ? (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <StarIcon className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      {value}
    </span>
  ) : null;

/** Per-type field mapping. Empty values are dropped, so a sparse event stays short. */
const buildFacts = (event: EventDetail): { facts: Fact[]; notes?: string | null; links: Link[] } => {
  const links: Link[] = [];

  if (event.kind === 'activity') {
    const a = event.data;
    if (a.location_website) links.push({ label: 'Website', href: a.location_website });
    return {
      facts: [
        { label: 'Time', value: timeSpan(a.start_time, a.end_time) },
        { label: 'Address', value: a.location_address },
        { label: 'Phone', value: a.location_phone },
        { label: 'Rating', value: rating(a.location_rating) },
        { label: 'Cost', value: money(a.cost, a.currency, a.is_paid) },
        { label: 'Time zone', value: a.timezone },
      ],
      notes: a.description,
      links,
    };
  }

  if (event.kind === 'hotel') {
    const h = event.data;
    if (h.hotel_website) links.push({ label: 'Website', href: h.hotel_website });
    if (h.hotel_url && h.hotel_url !== h.hotel_website) {
      links.push({ label: 'Booking', href: h.hotel_url });
    }
    return {
      facts: [
        {
          label: 'Check in',
          value: joinParts(formatDateLong(h.hotel_checkin_date), formatTime12(h.checkin_time)),
        },
        {
          label: 'Check out',
          value: joinParts(formatDateLong(h.hotel_checkout_date), formatTime12(h.checkout_time)),
        },
        { label: 'Address', value: h.hotel_address },
        { label: 'Phone', value: h.hotel_phone },
        { label: 'Cost', value: money(h.cost, h.currency) },
        { label: 'Time zone', value: h.timezone },
      ],
      notes: h.hotel_details,
      links,
    };
  }

  if (event.kind === 'transportation') {
    const t = event.data;
    return {
      facts: [
        { label: 'Type', value: formatTransportationType(t.type) },
        { label: 'Provider', value: t.provider },
        { label: 'Confirmation', value: t.confirmation_number },
        {
          label: 'Departs',
          value: joinParts(
            t.departure_location,
            formatDateLong(t.start_date),
            formatTime12(t.start_time || undefined),
            t.departure_timezone,
          ),
        },
        {
          label: 'Arrives',
          value: joinParts(
            t.arrival_location,
            formatDateLong(t.end_date),
            formatTime12(t.end_time || undefined),
            t.arrival_timezone,
          ),
        },
        { label: 'Cost', value: money(t.cost, t.currency, t.is_paid) },
      ],
      notes: t.details,
      links,
    };
  }

  const r = event.data;
  return {
    facts: [
      {
        label: 'Time',
        value: r.reservation_time && r.end_time
          ? `${formatTime12(r.reservation_time)} – ${formatTime12(r.end_time)}`
          : formatTime12(r.reservation_time || r.end_time || undefined),
      },
      {
        label: 'Party',
        value: r.number_of_people
          ? `${r.number_of_people} ${r.number_of_people === 1 ? 'guest' : 'guests'}`
          : null,
      },
      { label: 'Address', value: r.address },
      { label: 'Phone', value: r.phone_number },
      { label: 'Rating', value: rating(r.rating) },
      { label: 'Confirmation', value: r.confirmation_number },
      { label: 'Cost', value: money(r.cost, r.currency, r.is_paid) },
      { label: 'Time zone', value: r.timezone },
    ],
    notes: r.notes,
    links,
  };
};

const describe = (event: EventDetail): { title: string; typeLabel: string; placeId?: string | null } => {
  switch (event.kind) {
    case 'activity':
      return { title: event.data.title, typeLabel: 'Activity', placeId: event.data.location_place_id };
    case 'hotel':
      return { title: event.data.hotel, typeLabel: 'Stay', placeId: event.data.hotel_place_id };
    case 'transportation':
      return {
        title:
          [event.data.departure_location, event.data.arrival_location].filter(Boolean).join(' → ') ||
          formatTransportationType(event.data.type),
        typeLabel: formatTransportationType(event.data.type),
      };
    case 'dining':
      return { title: event.data.restaurant_name, typeLabel: 'Dining', placeId: event.data.place_id };
  }
};

/** eventId/eventType the travelers junction tables are keyed on. */
type TravelerEventType = 'accommodation' | 'transportation' | 'activity' | 'dining';

const travelerTarget = (event: EventDetail): { eventType: TravelerEventType; eventId: string } =>
  event.kind === 'hotel'
    ? { eventType: 'accommodation', eventId: event.data.stay_id }
    : { eventType: event.kind, eventId: event.data.id };

const EventDetailDialog: React.FC<Props> = ({
  event,
  open,
  onOpenChange,
  tripId,
  canEdit = true,
  onEdit,
}) => {
  if (!event) return null;

  const { title, typeLabel, placeId } = describe(event);
  const { facts, notes, links } = buildFacts(event);
  const shown = facts.filter((f) => f.value !== null && f.value !== undefined && f.value !== '');
  const iconItem = { type: event.kind, title, data: event.data as unknown as TimelineRowData };
  const category = getEventCategory(iconItem);
  const Icon = getTimelineIcon(iconItem) as React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
  const { eventType, eventId } = travelerTarget(event);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-6 text-left">
            <div className={cn('mt-0.5 shrink-0', CATEGORY_ICON_CLASS[category])}>
              <Icon className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-ui-sm text-earth-500">{typeLabel}</div>
              <DialogTitle className="font-display text-xl leading-tight tracking-tight">
                {title}
              </DialogTitle>
            </div>
            {placeId && (
              <div className="hidden shrink-0 sm:block">
                <HotelPhotoThumb placeId={placeId} title={title} size="md" />
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {shown.length > 0 && (
            <dl className="divide-y divide-border">
              {shown.map((f) => (
                <div key={f.label} className="grid grid-cols-[6.5rem_1fr] gap-3 py-2.5">
                  <dt className="text-ui-sm text-earth-500">{f.label}</dt>
                  <dd className="min-w-0 break-words text-ui-base text-foreground">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {notes && (
            <div className="mt-4">
              <div className="text-ui-sm text-earth-500">Notes</div>
              <p className="mt-1 whitespace-pre-line text-ui-base leading-relaxed text-foreground">
                {notes}
              </p>
            </div>
          )}

          {links.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-4">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-ui-base font-medium text-primary transition-colors hover:text-primary/80"
                >
                  {l.label}
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
                </a>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <div className="text-ui-sm text-earth-500">Travelers</div>
            <TravelerAvatars tripId={tripId} eventType={eventType} eventId={eventId} maxShow={6} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canEdit && (
            <Button onClick={() => onEdit(event)}>
              <Pencil className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Edit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailDialog;
