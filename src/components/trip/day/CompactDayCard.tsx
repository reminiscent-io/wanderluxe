import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import DayHeader from './components/DayHeader';
import AllDayHotelsSection from './components/AllDayHotelsSection';
import TimelineRow from './components/TimelineRow';
import GroupedEventCard from './components/GroupedEventCard';
import LayoverHintRow from './components/LayoverHintRow';
import TimePeriodHeader from './components/TimePeriodHeader';
import { useDayTimeline } from './components/useDayTimeline';

import { DayActivity, HotelStay, Transportation, RestaurantReservation } from '@/types/trip';
import DayActivityManager from './components/DayActivityManager'; // adjust if needed
import { useReservationsRealtime } from '@/hooks/useReservationsRealtime';
import { useTransportationEvents } from '@/hooks/use-transportation-events';
import { useActivitiesRealtime } from '@/hooks/useActivitiesRealtime';
import { useAccommodationsRealtime } from '@/hooks/useAccommodationsRealtime';
import { getNormalizedDay } from './components/timeline-utils';
import { cn } from '@/lib/utils';

export interface CompactDayCardProps {
  id: string;
  tripId: string;
  date: string;
  title?: string;
  activities: DayActivity[];
  index: number;
  hotelStays: HotelStay[];
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
  id, tripId, date, title, index,
  onActivityAdd, onHotelAdd, onTransportationAdd, onReservationAdd,
  onActivityClick, onHotelClick, onTransportationClick, onReservationClick,
  canEdit = true,
}) => {
  // Check if day is in the past for auto-collapse
  const dayDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dayDate.setHours(0, 0, 0, 0);
  const isPastDay = dayDate < today;
  
  const [isExpanded, setIsExpanded] = useState(!isPastDay);

  // live subscriptions
  const { reservations = [] } = useReservationsRealtime(id, tripId);
  const { transportations = [] } = useTransportationEvents(tripId);
  useActivitiesRealtime(id, tripId);
  useAccommodationsRealtime(tripId);

  // fetch activities for this day
  const { data: activities = [] } = useQuery({
    queryKey: ['activities', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('day_activities')
        .select(`*, trip_days!inner(date)`)
        .eq('day_id', id)
        .order('start_time', { ascending: true });

      if (error) throw error;

      return (data || []).map(a => ({
        ...a,
        date: a.trip_days?.date || date.split('T')[0],
      })) as DayActivity[];
    },
    enabled: !!id,
  });

  // fetch accommodations for this trip
  const { data: hotelStays = [] } = useQuery({
    queryKey: ['accommodations', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accommodations')
        .select('*')
        .eq('trip_id', tripId)
        .order('order_index');
      if (error) throw error;
      return data as HotelStay[];
    },
    enabled: !!tripId,
  });

  // build view-model
  const {
    normalizedDay,
    formattedDate,
    isTodayFlag,
    allDayHotels,
    rows,
    periodGroups,
    summary,
    isCheckInDay,
    isCheckOutDay,
    isTravelDay,
    totalEvents,
  } = useDayTimeline({
    dateISO: date,
    activities,
    hotelStays,
    transportations,
    reservations,
  });

  const dayTitle = title || new Date(date).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long' });

  const addActivityForThisDay = () => {
    onActivityAdd?.({ dayId: id, date: getNormalizedDay(date) });
  };

  const hasContent = rows.length > 0 || allDayHotels.length > 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3, delay: index * 0.05 }} 
      className="md:hover:scale-[1.02] transition-transform duration-200"
    >
      <Card
        id={`day-${index}`}
        className={cn(
          "relative overflow-hidden transition-all duration-300 bg-white shadow-sm md:hover:shadow-md border border-sand-200 rounded-lg md:rounded-xl",
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

        {/* Body */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="border-t border-sand-200 overflow-hidden"
            >
              <div className="bg-gray-100 px-2 py-3 sm:px-3 sm:py-4 md:px-4 md:py-6">
                {hasContent ? (
                  <div className="space-y-2 sm:space-y-3">
                    <AllDayHotelsSection stays={allDayHotels} onHotelClick={onHotelClick} tripId={tripId} />

                    <div className="relative space-y-3">
                      {/* Continuous timeline line - responsive positioning */}
                      <div className="absolute left-[20px] sm:left-[80px] top-4 bottom-0 w-1 bg-gray-300 -translate-x-1/2" />
                      {periodGroups.map((group, groupIdx) => (
                        <div key={group.period} className="space-y-3 relative z-10">
                          {group.rows.map((row, i) =>
                            row.kind === 'item' ? (
                              <TimelineRow
                                key={row.item.id}
                                item={row.item}
                                idx={i}
                                isLast={i >= group.rows.length - 1}
                                tripId={tripId}
                                onActivityClick={onActivityClick}
                                onHotelClick={onHotelClick}
                                onTransportationClick={onTransportationClick}
                                onReservationClick={onReservationClick}
                              />
                            ) : row.kind === 'grouped' ? (
                              <GroupedEventCard
                                key={row.id}
                                items={row.items}
                                groupType={row.groupType}
                                title={row.title}
                                timeRange={row.timeRange}
                                tripId={tripId}
                                onActivityClick={onActivityClick}
                                onHotelClick={onHotelClick}
                                onTransportationClick={onTransportationClick}
                                onReservationClick={onReservationClick}
                              />
                            ) : (
                              <LayoverHintRow key={row.id} text={row.text} />
                            )
                          )}
                        </div>
                      ))}
                    </div>

                    {canEdit && (
                      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-3 sm:pt-4 border-t border-sand-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addActivityForThisDay}
                          className="text-[10px] sm:text-xs px-2 sm:px-3 py-2 h-8 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all"
                        >
                          <span className="truncate">Activity</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onHotelAdd}
                          className="text-[10px] sm:text-xs px-2 sm:px-3 py-2 h-8 bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-all"
                        >
                          <span className="truncate">Hotel</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onTransportationAdd}
                          className="text-[10px] sm:text-xs px-2 sm:px-3 py-2 h-8 bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 hover:border-sky-300 transition-all"
                        >
                          <span className="truncate">Travel</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onReservationAdd}
                          className="text-[10px] sm:text-xs px-2 sm:px-3 py-2 h-8 bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-all"
                        >
                          <span className="truncate">Dining</span>
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-center py-8">
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
