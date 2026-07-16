import React, { useCallback, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DateSelectArg, EventApi } from '@fullcalendar/core';
import { addDays, format, parse } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import { useCalendarEvents } from './useCalendarEvents';
import { useCalendarRealtime } from './useCalendarRealtime';
import CalendarToolbar, { type CalendarViewName } from './CalendarToolbar';
import CalendarEventChip from './CalendarEventChip';
import AddEntityPicker from './AddEntityPicker';
import { buildDropPatch, isDateWithinTripRange, type CalendarEntityType } from './eventMapping';
import { computeSlotMinTime, DEFAULT_SLOT_MIN_TIME } from './slotWindow';
import { applyDropPatch } from './calendarMutations';
import ActivityDialog from '@/components/trip/day/activities/ActivityDialog';
import AccommodationDialog from '@/components/trip/accommodation/AccommodationDialog';
import TransportationDialog from '@/components/trip/transportation/TransportationDialog';
import RestaurantReservationDialog from '@/components/trip/dining/RestaurantReservationDialog';
import './calendarTheme.css';

interface TripCalendarViewProps {
  tripId: string;
  tripDates: { arrival_date: string | null; departure_date: string | null };
  destination?: string;
  canEdit?: boolean;
}

function exclusiveRangeEnd(departure: string): string {
  return format(addDays(parse(departure, 'yyyy-MM-dd', new Date()), 1), 'yyyy-MM-dd');
}

interface DropLikeArg { event: EventApi; revert: () => void; view: { type: string }; }
type EditState = { type: CalendarEntityType; record: Record<string, unknown>; date: string } | null;
type AddState = { date: string; time?: string } | null;

const TripCalendarView: React.FC<TripCalendarViewProps> = ({ tripId, tripDates, destination, canEdit = true }) => {
  const calendarRef = useRef<FullCalendar>(null);
  const queryClient = useQueryClient();
  const { events, isLoading } = useCalendarEvents(tripId);
  useCalendarRealtime(tripId);

  const [activeView, setActiveView] = useState<CalendarViewName>('timeGridThreeDay');
  const [title, setTitle] = useState('');
  const [visibleRange, setVisibleRange] = useState<{ start: string; end: string } | null>(null);
  const [showFullDay, setShowFullDay] = useState(false);
  const [editing, setEditing] = useState<EditState>(null);
  const [picker, setPicker] = useState<AddState>(null);
  const [adding, setAdding] = useState<{ type: CalendarEntityType; date: string; time?: string } | null>(null);

  const api = () => calendarRef.current?.getApi();
  const changeView = (view: CalendarViewName) => { setActiveView(view); api()?.changeView(view); };

  const invalidateAll = useCallback(() => {
    ['trip-days', 'accommodations', 'transportation', 'reservations', 'trip'].forEach((k) =>
      queryClient.invalidateQueries({ queryKey: [k, tripId] }));
    queryClient.invalidateQueries({ queryKey: ['reservations', tripId] });
  }, [queryClient, tripId]);

  const handleDrop = useCallback(async (info: DropLikeArg) => {
    if (!canEdit || !info.event.start) { info.revert(); return; }
    // Month is navigate-only; never mutate from a Month drag/resize (belt-and-suspenders alongside the per-view editable:false).
    if (info.view.type === 'dayGridMonth') { info.revert(); return; }
    // Reject drops/resizes that land outside the trip range (belt-and-suspenders alongside eventConstraint).
    const startDate = format(info.event.start, 'yyyy-MM-dd');
    if (tripDates.arrival_date && tripDates.departure_date && !isDateWithinTripRange(startDate, tripDates.arrival_date, tripDates.departure_date)) {
      toast.error('That date is outside the trip');
      info.revert();
      return;
    }
    const record = (info.event.extendedProps as { record: Record<string, unknown> }).record;
    try {
      const patch = buildDropPatch({ eventId: info.event.id, newStart: info.event.start, newEnd: info.event.end ?? null, allDay: info.event.allDay });
      await applyDropPatch(patch, tripId, record);
      invalidateAll();
    } catch (e) {
      console.error(e);
      toast.error('Could not move that item');
      info.revert();
    }
  }, [canEdit, tripId, tripDates, invalidateAll]);

  const handleEventClick = useCallback((info: EventClickArg) => {
    const date = info.event.start ? format(info.event.start, 'yyyy-MM-dd') : '';
    if (info.view.type === 'dayGridMonth') { if (info.event.start) api()?.changeView('timeGridDay', info.event.start); return; }
    const { entityType, record } = info.event.extendedProps as { entityType: CalendarEntityType; record: Record<string, unknown> };
    setEditing({ type: entityType, record, date });
  }, []);

  const handleSelect = useCallback((info: DateSelectArg) => {
    if (!canEdit) return;
    if (info.view.type === 'dayGridMonth') { api()?.changeView('timeGridDay', info.start); return; }
    setPicker({ date: format(info.start, 'yyyy-MM-dd'), time: info.allDay ? undefined : format(info.start, 'HH:mm') });
  }, [canEdit]);

  const validRange = tripDates.arrival_date && tripDates.departure_date
    ? { start: tripDates.arrival_date, end: exclusiveRangeEnd(tripDates.departure_date) }
    : undefined;
  // Open at today mid-trip; otherwise on trip day 1. Relying on validRange
  // clamping alone would open a *past* trip on its last day (the clamp picks
  // the valid date closest to today).
  const initialDate = (() => {
    const { arrival_date: arrival, departure_date: departure } = tripDates;
    if (!arrival || !departure) return undefined;
    const today = format(new Date(), 'yyyy-MM-dd');
    return isDateWithinTripRange(today, arrival, departure) ? today : arrival;
  })();
  const dialogTripDates = { arrival_date: tripDates.arrival_date ?? '', departure_date: tripDates.departure_date ?? '' };
  const isEmpty = !isLoading && events.length === 0;

  // Grid starts at 7am (earlier if an event demands it); "Show full day" reveals the hidden early hours.
  const collapsedSlotMin = useMemo(
    () => (visibleRange ? computeSlotMinTime(events, visibleRange.start, visibleRange.end) : DEFAULT_SLOT_MIN_TIME),
    [events, visibleRange],
  );
  const slotMinTime = showFullDay ? '00:00:00' : collapsedSlotMin;
  const showDayWindowToggle = activeView.startsWith('timeGrid') && collapsedSlotMin !== '00:00:00';

  const closeAndRefresh = () => { setEditing(null); setAdding(null); invalidateAll(); };

  // Build ActivityFormData-shaped initialData for the activity edit dialog.
  const activityInitial = editing?.type === 'activity' ? (() => {
    const r = editing.record as Tables<'day_activities'>;
    return {
      title: r.title ?? '', description: r.description ?? '', date: editing.date,
      start_time: r.start_time ? String(r.start_time).slice(0, 5) : '',
      end_time: r.end_time ? String(r.end_time).slice(0, 5) : '',
      cost: r.cost != null ? String(r.cost) : null,
      currency: (r.currency as string) ?? 'USD',
      location_address: r.location_address ?? null, location_place_id: r.location_place_id ?? null,
      location_phone: r.location_phone ?? null, location_website: r.location_website ?? null, location_rating: r.location_rating ?? null,
    };
  })() : null;

  return (
    <div className="wl-calendar space-y-3">
      <CalendarToolbar
        title={title}
        activeView={activeView}
        onViewChange={changeView}
        onPrev={() => api()?.prev()}
        onNext={() => api()?.next()}
        onToday={() => api()?.today()}
        dayWindow={showDayWindowToggle ? { expanded: showFullDay, onToggle: () => setShowFullDay((v) => !v) } : null}
      />
      {isEmpty && (
        <div className="rounded-card border border-dashed border-border bg-card/60 p-10 text-center">
          <p className="font-display text-xl text-foreground">Your itinerary is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">Tap a day to add your first stop.</p>
        </div>
      )}
      <div className={isEmpty ? 'opacity-40' : ''}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={activeView}
          initialDate={initialDate}
          headerToolbar={false}
          height="auto"
          firstDay={1}
          allDaySlot
          nowIndicator
          editable={canEdit}
          eventStartEditable={canEdit}
          eventDurationEditable={canEdit}
          selectable={canEdit}
          selectMirror
          validRange={validRange}
          events={events}
          slotMinTime={slotMinTime}
          eventContent={(arg) => <CalendarEventChip arg={arg} />}
          eventClassNames={(arg) => [`wl-ev-${(arg.event.extendedProps as { entityType?: CalendarEntityType }).entityType ?? 'activity'}`]}
          dayHeaderContent={(arg) =>
            arg.view.type.startsWith('timeGrid') ? (
              <div className="flex flex-col items-center gap-0.5 py-1 font-sans">
                <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{format(arg.date, 'EEE')}</span>
                <span className={`font-display text-xl leading-none ${arg.isToday ? 'text-primary' : 'text-foreground'}`}>{format(arg.date, 'd')}</span>
              </div>
            ) : undefined
          }
          datesSet={(arg) => {
            setTitle(arg.view.title);
            const start = format(arg.start, 'yyyy-MM-dd');
            const end = format(arg.end, 'yyyy-MM-dd');
            // Keep the previous reference when unchanged so React bails out; a fresh
            // object every datesSet loops render → dateProfile → datesSet forever.
            setVisibleRange((prev) => (prev && prev.start === start && prev.end === end ? prev : { start, end }));
          }}
          eventClick={handleEventClick}
          eventDrop={handleDrop}
          eventResize={handleDrop}
          select={handleSelect}
          eventConstraint={validRange}
          selectConstraint={validRange}
          dayCellClassNames={(arg) => {
            if (!tripDates.arrival_date || !tripDates.departure_date) return [];
            const d = format(arg.date, 'yyyy-MM-dd');
            return d < tripDates.arrival_date || d > tripDates.departure_date ? ['wl-out-of-range'] : [];
          }}
          views={{
            timeGridThreeDay: { type: 'timeGrid', duration: { days: 3 }, buttonText: '3 day' },
            dayGridMonth: { editable: false, selectable: false, dayMaxEvents: 3 },
          }}
        />
      </div>

      <AddEntityPicker
        open={!!picker}
        onOpenChange={(o) => { if (!o) setPicker(null); }}
        onPick={(type) => { if (picker) setAdding({ type, date: picker.date, time: picker.time }); setPicker(null); }}
      />

      {/* Edit dialogs */}
      {editing?.type === 'activity' && activityInitial && (
        <ActivityDialog open onOpenChange={(o) => { if (!o) closeAndRefresh(); }} tripId={tripId} activityId={(editing.record as Tables<'day_activities'>).id}
          initialData={activityInitial as unknown as Partial<Tables<'day_activities'>>} tripDates={dialogTripDates} destination={destination}
          onSuccess={closeAndRefresh} />
      )}
      {editing?.type === 'dining' && (
        <RestaurantReservationDialog open onOpenChange={(o) => { if (!o) closeAndRefresh(); }} tripId={tripId}
          initialData={editing.record as Partial<Tables<'reservations'>>} tripArrivalDate={dialogTripDates.arrival_date} tripDepartureDate={dialogTripDates.departure_date}
          destination={destination} onSuccess={closeAndRefresh} />
      )}
      {editing?.type === 'accommodation' && (
        <AccommodationDialog open onOpenChange={(o) => { if (!o) closeAndRefresh(); }} tripId={tripId}
          initialData={editing.record as unknown as Tables<'accommodations'>} destination={destination} onSuccess={closeAndRefresh} />
      )}
      {editing?.type === 'transportation' && (
        <TransportationDialog open onOpenChange={(o) => { if (!o) closeAndRefresh(); }} tripId={tripId}
          initialData={editing.record as Partial<Tables<'transportation'>>} onSuccess={closeAndRefresh} />
      )}

      {/* Add dialogs */}
      {adding?.type === 'activity' && (
        <ActivityDialog open onOpenChange={(o) => { if (!o) closeAndRefresh(); }} tripId={tripId} preselectedDate={adding.date}
          initialData={(adding.time ? { start_time: adding.time } : {}) as unknown as Partial<Tables<'day_activities'>>}
          tripDates={dialogTripDates} destination={destination} onSuccess={closeAndRefresh} />
      )}
      {adding?.type === 'dining' && (
        <RestaurantReservationDialog open onOpenChange={(o) => { if (!o) closeAndRefresh(); }} tripId={tripId}
          initialData={adding.time ? ({ reservation_time: `${adding.time}:00` } as Partial<Tables<'reservations'>>) : undefined}
          tripArrivalDate={dialogTripDates.arrival_date} tripDepartureDate={dialogTripDates.departure_date} destination={destination} onSuccess={closeAndRefresh} />
      )}
      {adding?.type === 'accommodation' && (
        <AccommodationDialog open onOpenChange={(o) => { if (!o) closeAndRefresh(); }} tripId={tripId} destination={destination} onSuccess={closeAndRefresh} />
      )}
      {adding?.type === 'transportation' && (
        <TransportationDialog open onOpenChange={(o) => { if (!o) closeAndRefresh(); }} tripId={tripId} onSuccess={closeAndRefresh} />
      )}
    </div>
  );
};

export default TripCalendarView;
