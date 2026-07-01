import React, { useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { addDays, format, parse } from 'date-fns';
import { useCalendarEvents } from './useCalendarEvents';
import { useCalendarRealtime } from './useCalendarRealtime';
import CalendarToolbar, { type CalendarViewName } from './CalendarToolbar';
import CalendarEventChip from './CalendarEventChip';
import './calendarTheme.css';

interface TripCalendarViewProps {
  tripId: string;
  tripDates: { arrival_date: string | null; departure_date: string | null };
  destination?: string;
  canEdit?: boolean;
}

/** FullCalendar validRange.end is exclusive; add a day so the departure date is visible. */
function exclusiveRangeEnd(departure: string): string {
  return format(addDays(parse(departure, 'yyyy-MM-dd', new Date()), 1), 'yyyy-MM-dd');
}

const TripCalendarView: React.FC<TripCalendarViewProps> = ({ tripId, tripDates }) => {
  const calendarRef = useRef<FullCalendar>(null);
  const { events, isLoading } = useCalendarEvents(tripId);
  useCalendarRealtime(tripId);

  // Lazy initializer reads viewport width on the FIRST render so the mobile default
  // (Day agenda) is correct at mount. useIsMobile() returns false on first render, so
  // seeding from it would mount Week even on phones.
  const [activeView, setActiveView] = useState<CalendarViewName>(
    () => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'listDay' : 'timeGridWeek'),
  );
  const [title, setTitle] = useState('');

  const api = () => calendarRef.current?.getApi();
  const changeView = (view: CalendarViewName) => { setActiveView(view); api()?.changeView(view); };

  const validRange = tripDates.arrival_date && tripDates.departure_date
    ? { start: tripDates.arrival_date, end: exclusiveRangeEnd(tripDates.departure_date) }
    : undefined;

  const isEmpty = !isLoading && events.length === 0;

  return (
    <div className="wl-calendar space-y-3">
      <CalendarToolbar
        title={title}
        activeView={activeView}
        onViewChange={changeView}
        onPrev={() => api()?.prev()}
        onNext={() => api()?.next()}
        onToday={() => api()?.today()}
      />
      {isEmpty && (
        <div className="rounded-card border border-dashed border-border bg-card/60 p-10 text-center">
          <p className="font-display text-xl text-foreground">Your itinerary is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">Add your first stop from the timeline, then it will appear here.</p>
        </div>
      )}
      <div className={isEmpty ? 'opacity-40 pointer-events-none' : ''}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={activeView}
          headerToolbar={false}
          height="auto"
          firstDay={1}
          allDaySlot
          nowIndicator
          editable={false}
          selectable={false}
          validRange={validRange}
          events={events}
          eventContent={(arg) => <CalendarEventChip arg={arg} />}
          datesSet={(arg) => setTitle(arg.view.title)}
          dayCellClassNames={(arg) => {
            if (!tripDates.arrival_date || !tripDates.departure_date) return [];
            const d = format(arg.date, 'yyyy-MM-dd');
            return d < tripDates.arrival_date || d > tripDates.departure_date ? ['wl-out-of-range'] : [];
          }}
          views={{
            timeGridThreeDay: { type: 'timeGrid', duration: { days: 3 }, buttonText: '3 day' },
            dayGridMonth: { dayMaxEvents: 3 },
          }}
        />
      </div>
    </div>
  );
};

export default TripCalendarView;
