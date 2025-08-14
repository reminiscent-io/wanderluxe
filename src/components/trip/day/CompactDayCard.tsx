import React, { useState, useEffect } from 'react';
import { format, parseISO, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Plus, 
  Hotel, 
  Plane, 
  MapPin, 
  Utensils,
  Clock,
  ChevronDown,
  ChevronUp,
  Calendar
} from 'lucide-react';
import { DayActivity, HotelStay, Transportation, RestaurantReservation } from '@/types/trip';
import { useReservationsRealtime } from '@/hooks/useReservationsRealtime';
import { useTransportationEvents } from '@/hooks/use-transportation-events';
import { cn } from '@/lib/utils';

// Helper function to format time in 12-hour format
const formatTime12 = (time?: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

// Helper function to normalize date to YYYY-MM-DD format
const getNormalizedDay = (date: string) => date.split('T')[0];

interface CompactDayCardProps {
  id: string;
  tripId: string;
  date: string;
  title?: string;
  activities: DayActivity[];
  index: number;
  hotelStays: HotelStay[];
  onActivityAdd?: () => void;
  onHotelAdd?: () => void;
  onTransportationAdd?: () => void;
  onReservationAdd?: () => void;
  onActivityClick?: (activity: DayActivity) => void;
  onHotelClick?: (hotel: HotelStay) => void;
  onTransportationClick?: (transportation: Transportation) => void;
  onReservationClick?: (reservation: RestaurantReservation) => void;
}

interface TimelineItem {
  type: 'activity' | 'hotel' | 'transportation' | 'dining';
  time?: string;
  endTime?: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  id: string;
  data?: any;
}

const CompactDayCard: React.FC<CompactDayCardProps> = ({
  id,
  tripId,
  date,
  title,
  activities,
  index,
  hotelStays,
  onActivityAdd,
  onHotelAdd,
  onTransportationAdd,
  onReservationAdd,
  onActivityClick,
  onHotelClick,
  onTransportationClick,
  onReservationClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { reservations } = useReservationsRealtime(id, tripId);
  const { transportations } = useTransportationEvents(tripId);
  
  const dayOfWeek = format(parseISO(date), 'EEEE');
  const formattedDate = format(parseISO(date), 'MMM d');
  const dayTitle = title || dayOfWeek;
  const isTodayFlag = isToday(parseISO(date));
  
  const normalizedDay = getNormalizedDay(date);
  
  // Filter hotel stays for this day
  const filteredHotelStays = hotelStays.filter((stay) => {
    if (!stay.hotel_checkin_date || !stay.hotel_checkout_date) return false;
    const dayDate = new Date(normalizedDay);
    return (
      dayDate >= new Date(stay.hotel_checkin_date) &&
      dayDate <= new Date(stay.hotel_checkout_date)
    );
  });
  
  // Filter transportations for this day
  const safeTransportations = transportations || [];
  const filteredTransportations = safeTransportations.filter((t) => {
    const start = t.start_date;
    const end = t.end_date ? t.end_date : start;
    const dayDate = new Date(normalizedDay);
    return dayDate >= new Date(start) && dayDate <= new Date(end);
  });
  
  // Create a unified timeline of all items with times
  const timelineItems: TimelineItem[] = [];
  
  // Add activities
  activities.forEach(activity => {
    if (activity.id) {
      timelineItems.push({
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
  });
  
  // Add hotel check-ins and check-outs
  filteredHotelStays.forEach(stay => {
    if (stay.hotel_checkin_date === normalizedDay && stay.checkin_time) {
      timelineItems.push({
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
      timelineItems.push({
        type: 'hotel',
        time: stay.checkout_time,
        title: `Check-out: ${stay.hotel}`,
        icon: <Hotel className="h-3 w-3" />,
        id: `checkout-${stay.stay_id}`,
        data: stay
      });
    }
  });
  
  // Add transportations
  filteredTransportations.forEach(transport => {
    if (transport.start_time) {
      const typeLabel = transport.type === 'flight' ? 'Flight' : 
                       transport.type === 'train' ? 'Train' :
                       transport.type === 'car' ? 'Car' :
                       transport.type === 'bus' ? 'Bus' : 'Transport';
      timelineItems.push({
        type: 'transportation',
        time: transport.start_time,
        endTime: transport.end_time || undefined,
        title: `${typeLabel}: ${transport.departure_location || 'Departure'} → ${transport.arrival_location || 'Arrival'}`,
        description: transport.details,
        icon: <Plane className="h-3 w-3" />,
        id: transport.id,
        data: transport
      });
    }
  });
  
  // Add dining reservations
  if (reservations) {
    reservations.forEach(reservation => {
      if (reservation.reservation_time) {
        timelineItems.push({
          type: 'dining',
          time: reservation.reservation_time,
          title: reservation.restaurant_name,
          description: reservation.notes || undefined,
          icon: <Utensils className="h-3 w-3" />,
          id: reservation.id,
          data: reservation
        });
      }
    });
  }
  
  // Sort timeline items by time
  const sortedTimelineItems = timelineItems.sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });
  
  // Generate summary line
  const summaryParts: string[] = [];
  
  const activityCount = activities.length;
  const hotelCount = filteredHotelStays.length;
  const transportCount = filteredTransportations.length;
  const diningCount = reservations?.length || 0;
  
  if (activityCount > 0) summaryParts.push(`${activityCount} ${activityCount === 1 ? 'activity' : 'activities'}`);
  if (hotelCount > 0) summaryParts.push(`${hotelCount} hotel`);
  if (transportCount > 0) summaryParts.push(`${transportCount} transport`);
  if (diningCount > 0) summaryParts.push(`${diningCount} dining`);
  
  const summary = summaryParts.length > 0 
    ? summaryParts.join(' • ') 
    : 'No plans yet';
  
  const hasContent = sortedTimelineItems.length > 0;
  
  return (
    <Card 
      id={`day-${index}`}
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        isTodayFlag && "ring-2 ring-blue-500 ring-offset-2"
      )}
    >
      {/* Day Header */}
      <div 
        className="p-3 md:p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg md:text-xl font-bold text-gray-900">
                Day {index}
              </span>
              {isTodayFlag && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  Today
                </span>
              )}
            </div>
            <div className="text-sm md:text-base text-gray-600">
              {dayTitle} • {formattedDate}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs md:text-sm text-gray-500 hidden sm:inline">
              {summary}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Mobile summary */}
        <div className="text-xs text-gray-500 mt-1 sm:hidden">
          {summary}
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t">
          <div className="p-3 md:p-4">
            {hasContent ? (
              <div className="space-y-2">
                {/* Timeline */}
                <div className="relative">
                  {sortedTimelineItems.map((item, idx) => {
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
                      <div key={item.id} className="flex gap-3 pb-3 last:pb-0">
                        {/* Time column */}
                        <div className="w-16 md:w-20 flex-shrink-0 text-right">
                          <span className="text-xs md:text-sm font-medium text-gray-600">
                            {item.time ? formatTime12(item.time) : '—'}
                          </span>
                        </div>
                        
                        {/* Timeline line and dot */}
                        <div className="relative flex flex-col items-center">
                          <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-1" />
                          {idx < sortedTimelineItems.length - 1 && (
                            <div className="absolute top-3 w-px bg-gray-200 h-full" />
                          )}
                        </div>
                        
                        {/* Content - Now clickable */}
                        <div 
                          className="flex-1 min-w-0 cursor-pointer hover:bg-gray-50 rounded-md p-1 -m-1 transition-colors"
                          onClick={handleItemClick}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-gray-500 mt-0.5 flex-shrink-0">
                              {item.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                                {item.title}
                              </div>
                              {item.endTime && (
                                <div className="text-xs text-gray-500">
                                  until {formatTime12(item.endTime)}
                                </div>
                              )}
                              {item.description && (
                                <div className="text-xs text-gray-600 mt-0.5">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Quick Add Buttons */}
                <div className="flex gap-1 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onActivityAdd}
                    className="text-xs px-1.5 py-1 h-6 flex-1 min-w-0"
                  >
                    <Plus className="h-2.5 w-2.5 mr-0.5" />
                    <span className="truncate">Activity</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onHotelAdd}
                    className="text-xs px-1.5 py-1 h-6 flex-1 min-w-0"
                  >
                    <Plus className="h-2.5 w-2.5 mr-0.5" />
                    <span className="truncate">Hotel</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onTransportationAdd}
                    className="text-xs px-1.5 py-1 h-6 flex-1 min-w-0"
                  >
                    <Plus className="h-2.5 w-2.5 mr-0.5" />
                    <span className="truncate">Travel</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReservationAdd}
                    className="text-xs px-1.5 py-1 h-6 flex-1 min-w-0"
                  >
                    <Plus className="h-2.5 w-2.5 mr-0.5" />
                    <span className="truncate">Dining</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-3">No plans for this day yet</p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onActivityAdd}
                    className="text-xs px-1.5 py-1 h-6 flex-1 min-w-0"
                  >
                    <Plus className="h-2.5 w-2.5 mr-0.5" />
                    <span className="truncate">Activity</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onHotelAdd}
                    className="text-xs px-1.5 py-1 h-6 flex-1 min-w-0"
                  >
                    <Plus className="h-2.5 w-2.5 mr-0.5" />
                    <span className="truncate">Hotel</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onTransportationAdd}
                    className="text-xs px-1.5 py-1 h-6 flex-1 min-w-0"
                  >
                    <Plus className="h-2.5 w-2.5 mr-0.5" />
                    <span className="truncate">Travel</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReservationAdd}
                    className="text-xs px-1.5 py-1 h-6 flex-1 min-w-0"
                  >
                    <Plus className="h-2.5 w-2.5 mr-0.5" />
                    <span className="truncate">Dining</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default CompactDayCard;