import React, { useState, useEffect } from 'react';
import { format, parseISO, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Hotel, 
  Plane, 
  MapPin, 
  Utensils,
  Clock,
  ChevronDown,
  ChevronUp,
  Calendar,
  DollarSign
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
  activities: activitiesProp,
  index,
  hotelStays: hotelStaysProp,
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
  
  // Use real-time hooks for all data
  const { reservations } = useReservationsRealtime(id, tripId);
  const { transportations } = useTransportationEvents(tripId);
  useActivitiesRealtime(id, tripId);
  useAccommodationsRealtime(tripId);
  
  // Fetch activities for this specific day
  const { data: activities = [] } = useQuery({
    queryKey: ['activities', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('day_activities')
        .select('*')
        .eq('day_id', id)
        .order('start_time', { ascending: true });
      
      if (error) {
        console.error('Error fetching activities:', error);
        throw error;
      }
      
      return data as DayActivity[];
    },
    enabled: !!id,
  });
  
  // Fetch accommodations for this trip
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

  // Activity management functions
  const {
    handleAddActivity,
    handleEditActivity,
    handleDeleteActivity,
  } = DayActivityManager({ id, tripId, activities });
  
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
  
  // Identify hotels where this is a stay day (not check-in or check-out)
  const allDayHotels = filteredHotelStays.filter(stay => {
    return stay.hotel_checkin_date !== normalizedDay && 
           stay.hotel_checkout_date !== normalizedDay;
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
    const typeLabel = transport.type === 'flight' ? 'Flight' : 
                     transport.type === 'train' ? 'Train' :
                     transport.type === 'car' ? 'Car' :
                     transport.type === 'bus' ? 'Bus' : 'Transport';
                     
    const startDate = transport.start_date;
    const endDate = transport.end_date || startDate;
    const isStartDay = normalizedDay === startDate;
    const isEndDay = normalizedDay === endDate;
    const isMultiDay = startDate !== endDate;
    
    // Determine which time to show and title based on the day
    let displayTime: string | undefined;
    let title: string;
    
    if (isMultiDay) {
      if (isStartDay) {
        // First day: show start time and departure
        displayTime = transport.start_time || undefined;
        title = `${typeLabel} Departure: ${transport.departure_location || 'Departure'}`;
      } else if (isEndDay) {
        // Last day: show end time and arrival
        displayTime = transport.end_time || undefined;
        title = `${typeLabel} Arrival: ${transport.arrival_location || 'Arrival'}`;
      } else {
        // Middle day: show "In transit"
        displayTime = undefined;
        title = `${typeLabel} (In Transit): ${transport.departure_location || 'Departure'} → ${transport.arrival_location || 'Arrival'}`;
      }
    } else {
      // Single day: show full journey with start time
      displayTime = transport.start_time || undefined;
      title = `${typeLabel}: ${transport.departure_location || 'Departure'} → ${transport.arrival_location || 'Arrival'}`;
    }
    
    timelineItems.push({
      type: 'transportation',
      time: displayTime,
      endTime: isStartDay && transport.end_time ? transport.end_time : undefined,
      title,
      description: transport.details,
      icon: <Plane className="h-3 w-3" />,
      id: transport.id,
      data: transport
    });
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
  
  const hasContent = sortedTimelineItems.length > 0 || allDayHotels.length > 0;
  
  // Determine day status badges
  const isCheckInDay = filteredHotelStays.some(stay => stay.hotel_checkin_date === normalizedDay);
  const isCheckOutDay = filteredHotelStays.some(stay => stay.hotel_checkout_date === normalizedDay);
  const isTravelDay = filteredTransportations.length > 0;
  const totalEvents = sortedTimelineItems.length;
  
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
      {/* Enhanced Day Header */}
      <motion.div 
        className="p-4 md:p-6 cursor-pointer hover:bg-sand-25 transition-colors duration-200"
        onClick={() => setIsExpanded(!isExpanded)}
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
              
              {/* Status Badges */}
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
      
      {/* Enhanced Expanded Content with Animation */}
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
                {/* All Day Hotels Section */}
                {allDayHotels.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">All Day</span>
                    </div>
                    {allDayHotels.map(stay => (
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
                        {/* Traveler Avatars for All Day Hotels */}
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
                )}
                
                {/* Enhanced Timeline with Colored Rail */}
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
                    
                    // Get color scheme by event type
                    const getEventColors = (type: string) => {
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
                    
                    const colors = getEventColors(item.type);
                    
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
                        
                        {/* Enhanced Timeline line and colored node */}
                        <div className="relative flex flex-col items-center">
                          <div className={cn(
                            "w-3 h-3 rounded-full flex-shrink-0 mt-0.5 border-2 border-white shadow-sm",
                            colors.node
                          )} />
                          {idx < sortedTimelineItems.length - 1 && (
                            <div className={cn(
                              "absolute top-4 w-0.5 h-full rounded-full",
                              colors.line
                            )} />
                          )}
                        </div>
                        
                        {/* Enhanced Content Card */}
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
                              {/* Cost Badge */}
                              {item.data?.cost && (
                                <div className="flex items-center gap-1 mt-2">
                                  <DollarSign className="h-3 w-3 text-earth-500" />
                                  <span className="text-xs text-earth-600 font-medium">
                                    {item.data.currency || 'USD'} {item.data.cost}
                                  </span>
                                </div>
                              )}
                            </div>
                            {/* Traveler Avatars */}
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
                  })}
                </div>
                
                {/* Enhanced Quick Add Buttons */}
                <div className="flex gap-2 pt-4 border-t border-sand-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onActivityAdd}
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
                  <p className="text-sm text-earth-600 mb-6">Start planning your day by adding activities, hotels, or transportation</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onActivityAdd}
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