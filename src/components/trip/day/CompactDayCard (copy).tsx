import React, { useMemo, useState } from 'react';
import { format, parseISO, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Hotel, 
  Plane, 
  MapPin, 
  Utensils,
  ChevronDown,
  Calendar,
  DollarSign,
  Train,
  Car,
  Bus,
  Ship
} from 'lucide-react';
import { DayActivity, HotelStay, Transportation, RestaurantReservation } from '@/types/trip';
import { useReservationsRealtime } from '@/hooks/useReservationsRealtime';
import { useTransportationEvents } from '@/hooks/use-transportation-events';
import { useActivitiesRealtime } from '@/hooks/useActivitiesRealtime';
import { useAccommodationsRealtime } from '@/hooks/useAccommodationsRealtime';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DayActivityManager from './components/DayActivityManager';
import { cn } from '@/lib/utils';
import TravelerAvatars from '../timeline/TravelerAvatars';

/* ----------------------------- Pure utilities ----------------------------- */

// time -> "h:mm AM/PM"
const formatTime12 = (time?: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

// normalize "YYYY-MM-DD" from many day string shapes
const getNormalizedDay = (date: string) => {
  if (!date) return '';
  // if it already starts with YYYY-MM-DD, use that prefix
  const m = date.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  // last-resort parse; use UTC slice to avoid TZ shifts
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

// parse time strings like "09:00", "11:20:00", "9:05 AM", "12:30 pm"
const parseTimeToHM = (time: string): { h: number; m: number } | null => {
  if (!time) return null;
  const t = time.trim();

  // extract & strip AM/PM if present
  const ampmMatch = t.match(/\s?(AM|PM)$/i);
  const base = t.replace(/\s?(AM|PM)$/i, '');

  const parts = base.split(':');
  if (parts.length < 2) return null;

  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);

  if (Number.isNaN(h) || Number.isNaN(m)) return null;

  if (ampmMatch) {
    const ampm = ampmMatch[1].toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
  }
  return { h, m };
};

// robust local Date constructor from YYYY-MM-DD + time ("HH:mm" | "HH:mm:ss" | "h:mm AM")
const combineDateAndTime = (dateISO: string, time?: string) => {
  if (!dateISO || !time) return null;
  const dayMatch = dateISO.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dayMatch) return null;

  const [, yS, moS, dS] = dayMatch;
  const hm = parseTimeToHM(time);
  if (!hm) return null;

  const y = parseInt(yS, 10);
  const mo = parseInt(moS, 10) - 1;
  const d = parseInt(dS, 10);
  if ([y, mo, d].some(n => Number.isNaN(n))) return null;

  return new Date(y, mo, d, hm.h, hm.m, 0, 0);
};

// Try extracting an IATA ("JFK") from free text; fall back to the string
const extractIata = (loc?: string) => {
  if (!loc) return '';
  const m = loc.match(/\b([A-Z]{3})\b/);
  return m ? m[1] : loc;
};

const diffMinutes = (a: Date, b: Date) => Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
const humanizeMinutes = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

// Icons per transport type
const getTransportationIconComponent = (type: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    flight: <Plane className="h-3 w-3" />,
    train: <Train className="h-3 w-3" />,
    car_service: <Car className="h-3 w-3" />,
    shuttle: <Bus className="h-3 w-3" />,
    ferry: <Ship className="h-3 w-3" />,
    rental_car: <Car className="h-3 w-3" />
  };
  return iconMap[type] || <Bus className="h-3 w-3" />;
};

// color scheme per event type
const getEventColors = (type: TimelineType) => {
  switch (type) {
    case 'hotel':
      return { node: 'bg-amber-500', line: 'bg-amber-200', icon: 'text-amber-600' };
    case 'transportation':
      return { node: 'bg-sky-500', line: 'bg-sky-200', icon: 'text-sky-600' };
    case 'activity':
      return { node: 'bg-emerald-500', line: 'bg-emerald-200', icon: 'text-emerald-600' };
    case 'dining':
      return { node: 'bg-rose-500', line: 'bg-rose-200', icon: 'text-rose-600' };
    default:
      return { node: 'bg-earth-400', line: 'bg-earth-200', icon: 'text-earth-600' };
  }
};

/* ----------------------------- Types & shape ------------------------------ */

type TimelineType = 'activity' | 'hotel' | 'transportation' | 'dining';

interface TimelineItem {
  type: TimelineType;
  time?: string;     // primary time to show (start for same-day items, arrival for arrival-only rows)
  endTime?: string;  // optional secondary "until" time
  title: string;
  description?: string;
  icon: React.ReactNode;
  id: string;
  data?: any & {
    __depart_time_on_this_day?: string | undefined;
    __arrive_time_on_this_day?: string | undefined;
  };
}

/* ------------------------------ Subcomponents ----------------------------- */

interface DayHeaderProps {
  dayTitle: string;
  formattedDate: string;
  index: number;
  isTodayFlag: boolean;
  isTravelDay: boolean;
  isCheckInDay: boolean;
  isCheckOutDay: boolean;
  totalEvents: number;
  summary: string;
  isExpanded: boolean;
  onToggle: () => void;
}
const DayHeader: React.FC<DayHeaderProps> = ({
  dayTitle,
  formattedDate,
  index,
  isTodayFlag,
  isTravelDay,
  isCheckInDay,
  isCheckOutDay,
  totalEvents,
  summary,
  isExpanded,
  onToggle
}) => {
  return (
    <motion.div 
      className="p-4 md:p-6 cursor-pointer hover:bg-sand-25 transition-colors duration-200"
      onClick={onToggle}
      whileHover={{ backgroundColor: "rgba(250, 245, 235, 0.5)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-lg md:text-xl font-bold text-earth-800">
                {dayTitle} {formattedDate}
              </span>
              <div className="text-sm md:text-base text-earth-600 font-medium">
                Day {index}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {isTodayFlag && (
                <Badge className="bg-emerald-500 text-white text-xs px-2 py-1">
                  Today
                </Badge>
              )}
              {isTravelDay && (
                <Badge className="bg-sky-500 text-white text-xs px-2 py-1">
                  Travel Day
                </Badge>
              )}
              {isCheckInDay && (
                <Badge className="bg-amber-500 text-white text-xs px-2 py-1">
                  Check-in
                </Badge>
              )}
              {isCheckOutDay && (
                <Badge className="bg-amber-600 text-white text-xs px-2 py-1">
                  Check-out
                </Badge>
              )}
              {totalEvents > 0 && (
                <Badge className="bg-earth-200 text-earth-800 text-xs px-2 py-1">
                  {totalEvents} event{totalEvents > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-earth-500 hidden lg:inline font-medium">
            {summary}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 hover:bg-earth-100 transition-colors"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-5 w-5 text-earth-600" />
            </motion.div>
          </Button>
        </div>
      </div>

      {/* Mobile summary */}
      <div className="text-sm text-earth-500 mt-2 lg:hidden">
        {summary}
      </div>
    </motion.div>
  );
};

const AllDayHotelsSection: React.FC<{
  stays: HotelStay[];
  onHotelClick?: (h: HotelStay) => void;
  tripId: string;
}> = ({ stays, onHotelClick, tripId }) => {
  if (stays.length === 0) return null;
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">All Day</span>
      </div>
      {stays.map(stay => (
        <div 
          key={`allday-${stay.stay_id}`}
          className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 rounded p-2 -m-1 transition-colors"
          onClick={() => onHotelClick && onHotelClick(stay)}
        >
          <Hotel className="h-3 w-3 text-gray-500" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
              Staying at {stay.hotel}
            </div>
            {stay.hotel_address && (
              <div className="text-xs text-gray-600">
                {stay.hotel_address}
              </div>
            )}
          </div>
          <div className="flex-shrink-0 ml-2">
            <TravelerAvatars 
              tripId={tripId}
              eventType="accommodation"
              eventId={stay.stay_id}
              maxShow={3}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const TimelineRow: React.FC<{
  item: TimelineItem;
  idx: number;
  isLast: boolean;
  onActivityClick?: (a: DayActivity) => void;
  onHotelClick?: (h: HotelStay) => void;
  onTransportationClick?: (t: Transportation) => void;
  onReservationClick?: (r: RestaurantReservation) => void;
  tripId: string;
}> = ({ item, idx, isLast, onActivityClick, onHotelClick, onTransportationClick, onReservationClick, tripId }) => {
  const colors = getEventColors(item.type);

  const handleItemClick = () => {
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

  return (
    <motion.div 
      key={item.id} 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.1, duration: 0.3 }}
      className="flex gap-4 pb-4 last:pb-0"
    >
      {/* Time column */}
      <div className="w-20 md:w-24 flex-shrink-0 text-right">
        <span className="text-sm font-semibold text-earth-700">
          {item.time ? formatTime12(item.time) : '—'}
        </span>
      </div>

      {/* Rail */}
      <div className="relative flex flex-col items-center">
        <div className={cn(
          "w-3 h-3 rounded-full flex-shrink-0 mt-0.5 border-2 border-white shadow-sm",
          colors.node
        )} />
        {!isLast && (
          <div className={cn(
            "absolute top-4 w-0.5 h-full rounded-full",
            colors.line
          )} />
        )}
      </div>

      {/* Content */}
      <motion.div 
        className="flex-1 min-w-0 cursor-pointer hover:bg-sand-50 rounded-lg p-3 -m-1 transition-all duration-200 hover:shadow-sm"
        onClick={handleItemClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-start gap-3">
          <span className={cn("mt-0.5 flex-shrink-0", colors.icon)}>
            {item.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-earth-800 hover:text-earth-900 transition-colors">
              {item.title}
            </div>
            {item.endTime && (
              <div className="text-xs text-earth-500 mt-1">
                until {formatTime12(item.endTime)}
              </div>
            )}
            {item.description && (
              <div className="text-xs text-earth-600 mt-1">
                {item.description}
              </div>
            )}
            {item.data?.cost && (
              <div className="flex items-center gap-1 mt-2">
                <DollarSign className="h-3 w-3 text-earth-500" />
                <span className="text-xs text-earth-600 font-medium">
                  {item.data.currency || 'USD'} {item.data.cost}
                </span>
              </div>
            )}
          </div>
          <div className="flex-shrink-0 ml-2">
            <TravelerAvatars
              tripId={tripId}
              eventType={item.type === "hotel" ? "accommodation" : item.type}
              eventId={item.type === "hotel" ? item.data.stay_id : item.id}
              maxShow={3}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Light-weight, italic hint shown *between* two flight rows
const LayoverHintRow: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="flex gap-4 pb-3 -mt-1">
      {/* time column spacer */}
      <div className="w-20 md:w-24 flex-shrink-0" />
      {/* keep the rail aligned; faint line to preserve continuity */}
      <div className="relative flex flex-col items-center">
        <div className="w-3 h-3 rounded-full opacity-0 mt-0.5" />
        <div className="absolute top-0 w-0.5 h-full rounded-full bg-sky-100" />
      </div>
      {/* hint text */}
      <div className="flex-1 min-w-0">
        <div className="text-xs italic text-earth-500">
          {text}
        </div>
      </div>
    </div>
  );
};

const QuickAddBar: React.FC<{
  canEdit: boolean;
  onAddActivity: () => void;
  onHotelAdd?: () => void;
  onTransportationAdd?: () => void;
  onReservationAdd?: () => void;
}> = ({ canEdit, onAddActivity, onHotelAdd, onTransportationAdd, onReservationAdd }) => {
  if (!canEdit) return null;
  return (
    <div className="flex gap-2 pt-4 border-t border-sand-200">
      <Button
        variant="outline"
        size="sm"
        onClick={onAddActivity}
        className="text-xs px-3 py-2 h-8 flex-1 min-w-0 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all"
      >
        <span className="truncate">Activity</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onHotelAdd}
        className="text-xs px-3 py-2 h-8 flex-1 min-w-0 bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-all"
      >
        <span className="truncate">Hotel</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onTransportationAdd}
        className="text-xs px-3 py-2 h-8 flex-1 min-w-0 bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 hover:border-sky-300 transition-all"
      >
        <span className="truncate">Travel</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onReservationAdd}
        className="text-xs px-3 py-2 h-8 flex-1 min-w-0 bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-all"
      >
        <span className="truncate">Dining</span>
      </Button>
    </div>
  );
};

/* -------------------------------- Component -------------------------------- */

interface CompactDayCardProps {
  id: string;
  tripId: string;
  date: string;
  title?: string;
  activities: DayActivity[];
  index: number;
  hotelStays: HotelStay[];
  /** pass context so dialog can preselect the day */
  onActivityAdd?: (opts: { dayId: string; date: string }) => void;
  onHotelAdd?: () => void;
  onTransportationAdd?: () => void;
  onReservationAdd?: () => void;
  onActivityClick?: (activity: DayActivity) => void;
  onHotelClick?: (hotel: HotelStay) => void;
  onTransportationClick?: (transportation: Transportation) => void;
  onReservationClick?: (reservation: RestaurantReservation) => void;
  canEdit?: boolean;
}

const CompactDayCard: React.FC<CompactDayCardProps> = ({
  id,
  tripId,
  date,
  title,
  activities: _activitiesProp,
  index,
  hotelStays: _hotelStaysProp,
  onActivityAdd,
  onHotelAdd,
  onTransportationAdd,
  onReservationAdd,
  onActivityClick,
  onHotelClick,
  onTransportationClick,
  onReservationClick,
  canEdit = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // live data
  const { reservations } = useReservationsRealtime(id, tripId);
  const { transportations } = useTransportationEvents(tripId);
  useActivitiesRealtime(id, tripId);
  useAccommodationsRealtime(tripId);

  // activities for this day
  const { data: activities = [] } = useQuery({
    queryKey: ['activities', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('day_activities')
        .select(`
          *,
          trip_days!inner(date)
        `)
        .eq('day_id', id)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching activities:', error);
        throw error;
      }

      return (data || []).map(activity => ({
        ...activity,
        date: activity.trip_days?.date || date.split('T')[0]
      })) as DayActivity[];
    },
    enabled: !!id,
  });

  // accommodations for this trip
  const { data: hotelStays = [] } = useQuery({
    queryKey: ['accommodations', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accommodations')
        .select('*')
        .eq('trip_id', tripId)
        .order('order_index');

      if (error) {
        console.error('Error fetching accommodations:', error);
        throw error;
      }
      return data as HotelStay[];
    },
    enabled: !!tripId,
  });

  const { handleAddActivity } = DayActivityManager({ id, tripId, activities });

  const normalizedDay = useMemo(() => getNormalizedDay(date), [date]);
  const dayOfWeek = useMemo(() => format(parseISO(date), 'EEEE'), [date]);
  const formattedDate = useMemo(() => format(parseISO(date), 'MMM d'), [date]);
  const dayTitle = title || dayOfWeek;
  const isTodayFlag = isToday(parseISO(date));

  /* ----------------------------- Derived filters ---------------------------- */

  const filteredHotelStays = useMemo(() => {
    return hotelStays.filter((stay) => {
      if (!stay.hotel_checkin_date || !stay.hotel_checkout_date) return false;
      const dayDate = new Date(normalizedDay);
      return dayDate >= new Date(stay.hotel_checkin_date) &&
             dayDate <= new Date(stay.hotel_checkout_date);
    });
  }, [hotelStays, normalizedDay]);

  const allDayHotels = useMemo(() => {
    return filteredHotelStays.filter(stay => 
      stay.hotel_checkin_date !== normalizedDay && stay.hotel_checkout_date !== normalizedDay
    );
  }, [filteredHotelStays, normalizedDay]);

  const filteredTransportations = useMemo(() => {
    const safeTransportations = transportations || [];
    return safeTransportations.filter((t) => {
      const start = t.start_date;
      const end = t.end_date ? t.end_date : start;
      const dayDate = new Date(normalizedDay);
      return dayDate >= new Date(start) && dayDate <= new Date(end);
    });
  }, [transportations, normalizedDay]);

  /* ----------------------------- Build timeline ---------------------------- */

  const timelineItems: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];

    // activities
    for (const activity of activities) {
      if (!activity.id) continue;
      items.push({
        type: 'activity',
        time: activity.start_time || undefined,
        endTime: activity.end_time || undefined,
        title: activity.title,
        description: activity.description || undefined,
        icon: <MapPin className="h-3 w-3" />,
        id: activity.id,
        data: activity
      });
    }

    // hotels (check-in/out)
    for (const stay of filteredHotelStays) {
      if (stay.hotel_checkin_date === normalizedDay && stay.checkin_time) {
        items.push({
          type: 'hotel',
          time: stay.checkin_time,
          title: `Check-in: ${stay.hotel}`,
          description: stay.hotel_address,
          icon: <Hotel className="h-3 w-3" />,
          id: `checkin-${stay.stay_id}`,
          data: stay
        });
      }
      if (stay.hotel_checkout_date === normalizedDay && stay.checkout_time) {
        items.push({
          type: 'hotel',
          time: stay.checkout_time,
          title: `Check-out: ${stay.hotel}`,
          icon: <Hotel className="h-3 w-3" />,
          id: `checkout-${stay.stay_id}`,
          data: stay
        });
      }
    }

    // transport
    for (const transport of filteredTransportations) {
      const typeLabel =
        transport.type === 'flight' ? 'Flight' :
        transport.type === 'train' ? 'Train' :
        transport.type === 'car' ? 'Car' :
        transport.type === 'bus' ? 'Bus' : 'Transport';

      const startDate = transport.start_date;
      const endDate   = transport.end_date || startDate;
      const isStartDay = normalizedDay === startDate;
      const isEndDay   = normalizedDay === endDate;
      const isMultiDay = startDate !== endDate;

      let displayTime: string | undefined;
      let title: string;

      if (isMultiDay) {
        if (isStartDay) {
          displayTime = transport.start_time || undefined;
          title = `${typeLabel} Departure: ${transport.departure_location || 'Departure'}`;
        } else if (isEndDay) {
          displayTime = transport.end_time || undefined;
          title = `${typeLabel} Arrival: ${transport.arrival_location || 'Arrival'}`;
        } else {
          displayTime = undefined;
          title = `${typeLabel} (In Transit): ${transport.departure_location || 'Departure'} → ${transport.arrival_location || 'Arrival'}`;
        }
      } else {
        displayTime = transport.start_time || undefined;
        title = `${typeLabel}: ${transport.departure_location || 'Departure'} → ${transport.arrival_location || 'Arrival'}`;
      }

      const departTimeOnThisDay = isStartDay ? transport.start_time : undefined;
      // if same-day, arrival is end_time; if arrival day of multi-day, it's end_time too
      const arriveTimeOnThisDay = isEndDay ? transport.end_time : (isStartDay && !isMultiDay ? transport.end_time : undefined);

      items.push({
        type: 'transportation',
        time: displayTime,
        endTime: departTimeOnThisDay && arriveTimeOnThisDay ? arriveTimeOnThisDay : undefined, // "until" for same-day legs
        title,
        description: transport.details,
        icon: getTransportationIconComponent(transport.type),
        id: transport.id,
        data: {
          ...transport,
          __depart_time_on_this_day: departTimeOnThisDay,
          __arrive_time_on_this_day: arriveTimeOnThisDay
        }
      });
    }

    // dining
    if (reservations) {
      for (const reservation of reservations) {
        if (!reservation.reservation_time) continue;
        items.push({
          type: 'dining',
          time: reservation.reservation_time,
          title: reservation.restaurant_name,
          description: reservation.notes || undefined,
          icon: <Utensils className="h-3 w-3" />,
          id: reservation.id,
          data: reservation
        });
      }
    }

    // sort by time; items without time to bottom
    items.sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });

    return items;
  }, [activities, filteredHotelStays, filteredTransportations, reservations, normalizedDay]);

  /* --------------------------- Summary & badges ---------------------------- */

  const activityCount = activities.length;
  const hotelCount = filteredHotelStays.length;
  const transportCount = filteredTransportations.length;
  const diningCount = reservations?.length || 0;

  const summary = useMemo(() => {
    const parts: string[] = [];
    if (activityCount > 0) parts.push(`${activityCount} ${activityCount === 1 ? 'activity' : 'activities'}`);
    if (hotelCount > 0) parts.push(`${hotelCount} hotel`);
    if (transportCount > 0) parts.push(`${transportCount} transport`);
    if (diningCount > 0) parts.push(`${diningCount} dining`);
    return parts.length > 0 ? parts.join(' • ') : 'No plans yet';
  }, [activityCount, hotelCount, transportCount, diningCount]);

  const hasContent = timelineItems.length > 0 || allDayHotels.length > 0;
  const isCheckInDay  = filteredHotelStays.some(stay => stay.hotel_checkin_date === normalizedDay);
  const isCheckOutDay = filteredHotelStays.some(stay => stay.hotel_checkout_date === normalizedDay);
  const isTravelDay   = filteredTransportations.length > 0;
  const totalEvents   = timelineItems.length; // layover hints do not affect counts

  /* ------------------------- Layover hint computation ---------------------- */

  const computeLayoverHint = (curr: TimelineItem, next: TimelineItem): string | null => {
    // both flights?
    const currIsFlight = curr.type === 'transportation' && curr.data?.type === 'flight';
    const nextIsFlight = next.type === 'transportation' && next.data?.type === 'flight';
    if (!currIsFlight || !nextIsFlight) return null;

    // must have arrival time for curr and departure time for next on this day
    const currArrive = curr.data.__arrive_time_on_this_day;
    const nextDepart = next.data.__depart_time_on_this_day;
    if (!currArrive || !nextDepart) return null;

    // same airport?
    const currArriveAirport = extractIata(curr.data?.arrival_location);
    const nextDepartAirport = extractIata(next.data?.departure_location);
    if (!currArriveAirport || currArriveAirport !== nextDepartAirport) return null;

    // positive gap
    const arriveAt = combineDateAndTime(normalizedDay, currArrive);
    const departAt = combineDateAndTime(normalizedDay, nextDepart);
    if (!arriveAt || !departAt) return null;

    const mins = diffMinutes(arriveAt, departAt);
    if (mins <= 0) return null;

    // subtle, italic text only
    return `Layover • ${humanizeMinutes(mins)}`;
  };

  /* ------------------------------- Render ---------------------------------- */

  const addActivityForThisDay = () => onActivityAdd?.({ dayId: id, date: normalizedDay });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    >
      <Card 
        id={`day-${index}`}
        className={cn(
          "relative overflow-hidden transition-all duration-300 bg-white shadow-sm hover:shadow-md border border-sand-200 rounded-xl",
          isTodayFlag && "border-l-4 border-l-earth-600 shadow-lg"
        )}
      >
        {/* Header */}
        <DayHeader
          dayTitle={dayTitle}
          formattedDate={formattedDate}
          index={index}
          isTodayFlag={isTodayFlag}
          isTravelDay={isTravelDay}
          isCheckInDay={isCheckInDay}
          isCheckOutDay={isCheckOutDay}
          totalEvents={totalEvents}
          summary={summary}
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded(!isExpanded)}
        />

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="border-t border-sand-200 overflow-hidden"
            >
              <div className="p-4 md:p-6">
                {hasContent ? (
                  <div className="space-y-3">
                    {/* All-day hotels */}
                    <AllDayHotelsSection stays={allDayHotels} onHotelClick={onHotelClick} tripId={tripId} />

                    {/* Timeline */}
                    <div className="relative">
                      {timelineItems.map((item, idx) => {
                        const isLast = idx >= timelineItems.length - 1;
                        const next = !isLast ? timelineItems[idx + 1] : undefined;

                        return (
                          <React.Fragment key={item.id}>
                            <TimelineRow
                              item={item}
                              idx={idx}
                              isLast={isLast}
                              onActivityClick={onActivityClick}
                              onHotelClick={onHotelClick}
                              onTransportationClick={onTransportationClick}
                              onReservationClick={onReservationClick}
                              tripId={tripId}
                            />
                            {/* Subtle layover hint (only between flights, same airport) */}
                            {!!next && (() => {
                              const hint = computeLayoverHint(item, next);
                              return hint ? <LayoverHintRow key={`layover-${item.id}-${next.id}`} text={hint} /> : null;
                            })()}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Quick add */}
                    <QuickAddBar
                      canEdit={canEdit}
                      onAddActivity={addActivityForThisDay}
                      onHotelAdd={onHotelAdd}
                      onTransportationAdd={onTransportationAdd}
                      onReservationAdd={onReservationAdd}
                    />
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-center py-8"
                  >
                    <div className="bg-sand-50 rounded-xl p-6 border-2 border-dashed border-sand-200">
                      <Calendar className="h-10 w-10 text-earth-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-earth-800 mb-2">No plans yet</h3>
                      <p className="text-sm text-earth-600 mb-6">{canEdit ? 'Start planning your day by adding activities, hotels, or transportation' : 'This day has no activities planned'}</p>
                      {canEdit && (
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={addActivityForThisDay}
                            className="text-sm px-4 py-3 h-auto bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all"
                          >
                            <span>+ Activity</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onHotelAdd}
                            className="text-sm px-4 py-3 h-auto bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-all"
                          >
                            <span>+ Hotel</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onTransportationAdd}
                            className="text-sm px-4 py-3 h-auto bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 hover:border-sky-300 transition-all"
                          >
                            <span>+ Travel</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onReservationAdd}
                            className="text-sm px-4 py-3 h-auto bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-all"
                          >
                            <span>+ Dining</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export default CompactDayCard;
