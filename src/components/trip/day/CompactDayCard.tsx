import React, { useState, useCallback, useId } from 'react';
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
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
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
import { combineDateAndTime, type TimelineRenderRow } from './components/timeline-utils';

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
  tripTimezone?: string | null;
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
  tripTimezone,
}) => {
  // Check if day is in the past for auto-collapse (parse as local date to avoid UTC offset issues)
  const [year, month, day_] = (date.split('T')[0]).split('-').map(Number);
  const dayDate = new Date(year, month - 1, day_);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPastDay = dayDate < today;

  const [isExpanded, setIsExpanded] = useState(!isPastDay);
  const bodyId = useId();

  // Track which periods are expanded (all expanded by default)
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  // DnD sensors.
  //
  // A single PointerSensor cannot serve both input types: the distance
  // constraint that feels right for a mouse hijacks the first 8px of every
  // touch drag, so on a phone the gesture either reorders when the user meant
  // to scroll or does nothing at all. Splitting mouse from touch lets each get
  // the constraint it needs — drag-after-8px for a mouse, long-press for touch,
  // which leaves vertical swipes free to scroll the itinerary.
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
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
    weekdayLabel,
    formattedDate,
    isTodayFlag,
    allDayHotels,
    rows,
    periodGroups,
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
    tripTimezone,
  });

  // The weekday is the headline unless the day has been named. Repeating it in
  // the line underneath ("Friday" over "Friday, Oct 24th 2025") spent the card's
  // two most prominent lines saying one thing, so the date line carries the
  // weekday only when the headline has given it up.
  const dayTitle = title || weekdayLabel;
  const dateLine = title ? `${weekdayLabel}, ${formattedDate}` : formattedDate;

  const addActivityForThisDay = () => {
    onActivityAdd?.({ dayId: id, date: getNormalizedDay(date) });
  };

  const hasContent = rows.length > 0 || allDayHotels.length > 0;
  // Time-of-day sections only earn their weight once a day is busy enough to
  // need scanning. Below this, they are chrome around three rows.
  const PERIOD_SECTION_THRESHOLD = 5;
  const showPeriodSections = totalEvents >= PERIOD_SECTION_THRESHOLD;

  // One dispatcher for both layouts: below the section threshold rows render
  // flat, above it they render inside time-of-day sections.
  //
  // railStart / railEnd let the first and last rows draw the hairline from
  // their own node instead of from the edge of the row, so the day's timeline
  // begins and ends where the day does. Hint rows have no node and are never
  // handed the flags — their dashes simply meet the neighbouring solid line.
  const renderRow = (row: TimelineRenderRow, i: number, rowCount: number) => {
    const railStart = i === 0;
    const railEnd = i === rowCount - 1;

    // Check if event has passed (for today only)
    const isItemPast = isTodayFlag && row.kind === 'item' && (() => {
      const endTime = row.item.endTime || row.item.time;
      if (!endTime) return false;
      const eventEnd = combineDateAndTime(normalizedDay, endTime);
      return eventEnd ? eventEnd < new Date() : false;
    })();

    if (row.kind === 'item') {
      const RowComponent = canEdit ? SortableTimelineRow : TimelineRow;
      return (
        <RowComponent
          key={row.item.id}
          item={row.item}
          idx={i}
          isLast={railEnd}
          railStart={railStart}
          railEnd={railEnd}
          tripId={tripId}
          isPast={isItemPast || false}
          onActivityClick={onActivityClick}
          onHotelClick={onHotelClick}
          onTransportationClick={onTransportationClick}
          onReservationClick={onReservationClick}
        />
      );
    }

    if (row.kind === 'grouped') {
      return (
        <GroupedEventCard
          key={row.id}
          items={row.items}
          groupType={row.groupType}
          title={row.title}
          timeRange={row.timeRange}
          tripId={tripId}
          railStart={railStart}
          railEnd={railEnd}
          onActivityClick={onActivityClick}
          onHotelClick={onHotelClick}
          onTransportationClick={onTransportationClick}
          onReservationClick={onReservationClick}
        />
      );
    }

    if (row.kind === 'now') {
      return <NowIndicator key="now-indicator" railStart={railStart} railEnd={railEnd} />;
    }

    if (row.kind === 'hint') {
      return <LayoverHintRow key={row.id} text={row.text} hintType={row.hintType} />;
    }

    return null;
  };

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
      // Capped: an unbounded stagger left day 20 of a long trip waiting a full
      // second to appear, which reads as lag rather than as choreography.
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: Math.min(index, 6) * 0.05 }}
    >
      <Card
        id={`day-${index}`}
        className={cn(
          "relative transition-shadow duration-200 bg-card shadow-warm-sm md:hover:shadow-warm border border-border rounded-card",
          isTodayFlag && "border-primary/60 shadow-warm"
        )}
      >
        {/* Header */}
        <DayHeader
          dayTitle={dayTitle}
          formattedDate={dateLine}
          bodyId={bodyId}
          index={index}
          isTodayFlag={isTodayFlag}
          isCheckInDay={isCheckInDay}
          isCheckOutDay={isCheckOutDay}
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
              id={bodyId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden rounded-b-card border-t border-border"
            >
              <div className="bg-background">
                {/* Where you're staying: pinned context strip, not a row */}
                <AllDayHotelsSection stays={allDayHotels} onHotelClick={onHotelClick} tripId={tripId} />
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
                      <div className="py-2">
                        <div>
                          {showPeriodSections ? periodGroups.map((group, groupIdx) => {
                            const isPeriodOpen = isPeriodExpanded(group.period);
                            const eventCount = group.rows.filter(row => row.kind !== 'hint' && row.kind !== 'now').length;

                            return (
                              <div key={group.period} className="relative z-10">
                                {/* Period Header */}
                                <div className="px-3 sm:px-4">
                                  <TimePeriodHeader
                                    label={group.label}
                                    isFirst={groupIdx === 0}
                                    isExpanded={isPeriodOpen}
                                    onToggle={() => togglePeriod(group.period)}
                                    eventCount={eventCount}
                                  />
                                </div>

                                {/* Period Events */}
                                <AnimatePresence>
                                  {isPeriodOpen && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                      className="overflow-hidden"
                                    >
                                      {group.rows.map((row, i) => renderRow(row, i, group.rows.length))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          }) : rows.map((row, i) => renderRow(row, i, rows.length))}
                        </div>

                        {canEdit && (
                          <div className="mt-2 hidden border-t border-border px-3 pt-3 md:flex sm:px-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-ui-sm h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
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
                        <Button variant="outline" size="sm" onClick={addActivityForThisDay} className="h-11 font-normal sm:h-9">
                          <Star className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                          Activity
                        </Button>
                        <Button variant="outline" size="sm" onClick={onHotelAdd} className="h-11 font-normal sm:h-9">
                          <Hotel className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                          Hotel
                        </Button>
                        <Button variant="outline" size="sm" onClick={onTransportationAdd} className="h-11 font-normal sm:h-9">
                          <Plane className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                          Travel
                        </Button>
                        <Button variant="outline" size="sm" onClick={onReservationAdd} className="h-11 font-normal sm:h-9">
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
