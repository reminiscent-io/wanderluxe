import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Star, Hotel, Plane, Utensils } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import DayHeader from './components/DayHeader';
import AllDayHotelsSection from './components/AllDayHotelsSection';
import SortableTimelineRow from './components/SortableTimelineRow';
import TimelineRow from './components/TimelineRow';
import GroupedEventCard from './components/GroupedEventCard';
import LayoverHintRow from './components/LayoverHintRow';
import NowIndicator from './components/NowIndicator';
import TimePeriodHeader from './components/TimePeriodHeader';
import { useDayTimeline } from './components/useDayTimeline';
import { combineDateAndTime } from './components/timeline-utils';

import { DayActivity, HotelStay, Transportation, RestaurantReservation } from '@/types/trip';
import DayActivityManager from './components/DayActivityManager'; // adjust if needed
import { useReservationsRealtime } from '@/hooks/useReservationsRealtime';
import { useTransportationEvents } from '@/hooks/use-transportation-events';
import { useActivitiesRealtime } from '@/hooks/useActivitiesRealtime';
import { useAccommodationsRealtime } from '@/hooks/useAccommodationsRealtime';
import { getNormalizedDay } from './components/timeline-utils';
import { cn } from '@/lib/utils';
import { DailyForecast, WeatherData } from '@/hooks/useWeather';

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
  weather?: DailyForecast;
  currentWeather?: WeatherData['current'];
  weatherLocation?: string;
  allForecasts?: DailyForecast[];
}

/** Map TimelineItem type to the Supabase table name */
const getTableForType = (type: string): string | null => {
  switch (type) {
    case 'activity': return 'day_activities';
    case 'dining': return 'reservations';
    case 'transportation': return 'transportation';
    case 'hotel': return 'accommodations';
    default: return null;
  }
};

/** Get the primary key column for a given item type */
const getIdColumnForType = (type: string): string => {
  return type === 'hotel' ? 'stay_id' : 'id';
};

const CompactDayCard: React.FC<CompactDayCardProps> = ({
  id, tripId, date, title, index,
  onActivityAdd, onHotelAdd, onTransportationAdd, onReservationAdd,
  onActivityClick, onHotelClick, onTransportationClick, onReservationClick,
  canEdit = true,
  weather,
  currentWeather,
  weatherLocation,
  allForecasts,
}) => {
  // Check if day is in the past for auto-collapse (parse as local date to avoid UTC offset issues)
  const [year, month, day_] = (date.split('T')[0]).split('-').map(Number);
  const dayDate = new Date(year, month - 1, day_);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPastDay = dayDate < today;

  const [isExpanded, setIsExpanded] = useState(!isPastDay);

  // Track which periods are expanded (all expanded by default)
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

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
    timelineItems,
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

  // Toggle period expansion
  const togglePeriod = (period: string) => {
    setExpandedPeriods(prev => {
      const next = new Set(prev);
      if (next.has(period)) {
        next.delete(period);
      } else {
        next.add(period);
      }
      return next;
    });
  };

  // Check if period is expanded (default to expanded)
  const isPeriodExpanded = (period: string) => {
    return !expandedPeriods.has(period);
  };

  // Handle drag-and-drop reorder
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find the dragged and target items from timelineItems
    const activeItem = timelineItems.find(item => item.id === active.id.toString());
    const overItem = timelineItems.find(item => item.id === over.id.toString());
    if (!activeItem || !overItem) return;

    // Only reorder items of the same type
    const table = getTableForType(activeItem.type);
    if (!table) return;

    // Compute new order_index values
    const sortableItems = timelineItems.filter(item => item.type === activeItem.type);
    const oldIndex = sortableItems.findIndex(item => item.id === activeItem.id);
    const newIndex = sortableItems.findIndex(item => item.id === overItem.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder the items array
    const reordered = [...sortableItems];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Batch update order_index values
    const idColumn = getIdColumnForType(activeItem.type);
    const updates = reordered.map((item, idx) => {
      const itemId = activeItem.type === 'hotel' ? item.data?.stay_id : item.id;
      return supabase
        .from(table)
        .update({ order_index: idx })
        .eq(idColumn, itemId);
    });

    await Promise.all(updates);

    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ['activities', id] });
    queryClient.invalidateQueries({ queryKey: ['accommodations', tripId] });
    queryClient.invalidateQueries({ queryKey: ['transportations', tripId] });
    queryClient.invalidateQueries({ queryKey: ['reservations', id] });
  }, [timelineItems, id, tripId, queryClient]);

  // Get sortable item IDs (only single items, not grouped/hints/now)
  const sortableIds = rows
    .filter(row => row.kind === 'item')
    .map(row => (row as { kind: 'item'; item: { id: string } }).item.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: index * 0.05 }}
    >
      <Card
        id={`day-${index}`}
        className={cn(
          "relative overflow-hidden transition-shadow duration-200 bg-card shadow-warm-sm md:hover:shadow-warm border border-border rounded-card",
          isTodayFlag && "border-primary/60 shadow-warm"
        )}
      >
        {/* Header */}
        <DayHeader
          dayTitle={dayTitle}
          formattedDate={formattedDate}
          index={index}
          isTodayFlag={isTodayFlag}
          isCheckInDay={isCheckInDay}
          isCheckOutDay={isCheckOutDay}
          summary={summary}
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded(!isExpanded)}
          dateISO={date}
          weather={weather}
          currentWeather={currentWeather}
          weatherLocation={weatherLocation}
          allForecasts={allForecasts}
        />

        {/* Body */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="border-t border-border overflow-hidden"
            >
              <div className="bg-background px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6">
                {hasContent ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={canEdit ? handleDragEnd : undefined}
                  >
                    <SortableContext
                      items={sortableIds}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2 sm:space-y-3">
                        <AllDayHotelsSection stays={allDayHotels} onHotelClick={onHotelClick} tripId={tripId} />

                        <div className="relative space-y-3">
                          {/* Continuous timeline line - responsive positioning */}
                          <div className="absolute left-[12px] sm:left-[20px] top-4 bottom-0 w-px bg-border -translate-x-1/2" />
                          {periodGroups.map((group, groupIdx) => {
                            const isExpanded = isPeriodExpanded(group.period);
                            const eventCount = group.rows.filter(row => row.kind !== 'hint' && row.kind !== 'now').length;

                            return (
                              <div key={group.period} className="relative z-10">
                                {/* Period Header */}
                                <TimePeriodHeader
                                  label={group.label}
                                  isFirst={groupIdx === 0}
                                  isExpanded={isExpanded}
                                  onToggle={() => togglePeriod(group.period)}
                                  eventCount={eventCount}
                                />

                                {/* Period Events */}
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                      className="overflow-hidden space-y-3"
                                    >
                                      {group.rows.map((row, i) => {
                                        // Check if event has passed (for today only)
                                        const isItemPast = isTodayFlag && row.kind === 'item' && (() => {
                                          const endTime = row.item.endTime || row.item.time;
                                          if (!endTime) return false;
                                          const eventEnd = combineDateAndTime(normalizedDay, endTime);
                                          return eventEnd ? eventEnd < new Date() : false;
                                        })();

                                        return row.kind === 'item' ? (
                                          canEdit ? (
                                            <SortableTimelineRow
                                              key={row.item.id}
                                              item={row.item}
                                              idx={i}
                                              isLast={i >= group.rows.length - 1}
                                              tripId={tripId}
                                              isPast={isItemPast || false}
                                              onActivityClick={onActivityClick}
                                              onHotelClick={onHotelClick}
                                              onTransportationClick={onTransportationClick}
                                              onReservationClick={onReservationClick}
                                            />
                                          ) : (
                                            <TimelineRow
                                              key={row.item.id}
                                              item={row.item}
                                              idx={i}
                                              isLast={i >= group.rows.length - 1}
                                              tripId={tripId}
                                              isPast={isItemPast || false}
                                              onActivityClick={onActivityClick}
                                              onHotelClick={onHotelClick}
                                              onTransportationClick={onTransportationClick}
                                              onReservationClick={onReservationClick}
                                            />
                                          )
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
                                        ) : row.kind === 'now' ? (
                                          <NowIndicator key="now-indicator" />
                                        ) : row.kind === 'hint' ? (
                                          <LayoverHintRow key={row.id} text={row.text} hintType={row.hintType} />
                                        ) : null;
                                      })}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>

                        {canEdit && (
                          <div className="hidden md:flex pt-4 border-t border-border">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                >
                                  <Plus className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.75} />
                                  Add to this day
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-48">
                                <DropdownMenuItem onClick={addActivityForThisDay} className="gap-2">
                                  <Star className="h-4 w-4 text-earth-600" strokeWidth={1.5} />
                                  Activity
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onHotelAdd} className="gap-2">
                                  <Hotel className="h-4 w-4 text-earth-600" strokeWidth={1.5} />
                                  Hotel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onTransportationAdd} className="gap-2">
                                  <Plane className="h-4 w-4 text-earth-600" strokeWidth={1.5} />
                                  Travel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onReservationAdd} className="gap-2">
                                  <Utensils className="h-4 w-4 text-earth-600" strokeWidth={1.5} />
                                  Dining
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                    className="py-10 px-2 text-center"
                  >
                    <Calendar className="h-8 w-8 text-earth-400 mx-auto mb-5" strokeWidth={1.25} />
                    <h3 className="text-xl font-display font-normal text-foreground mb-2 leading-tight">
                      An empty page
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
                      {canEdit
                        ? 'Add a hotel, an activity, a reservation, and the day takes shape from here.'
                        : 'This day is unplanned.'}
                    </p>
                    {canEdit && (
                      <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                        <Button variant="outline" size="sm" onClick={addActivityForThisDay} className="font-normal">
                          <Star className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                          Activity
                        </Button>
                        <Button variant="outline" size="sm" onClick={onHotelAdd} className="font-normal">
                          <Hotel className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                          Hotel
                        </Button>
                        <Button variant="outline" size="sm" onClick={onTransportationAdd} className="font-normal">
                          <Plane className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                          Travel
                        </Button>
                        <Button variant="outline" size="sm" onClick={onReservationAdd} className="font-normal">
                          <Utensils className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                          Dining
                        </Button>
                      </div>
                    )}
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
