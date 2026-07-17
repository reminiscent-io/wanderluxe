import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

export type CalendarViewName = 'timeGridDay' | 'timeGridThreeDay' | 'timeGridWeek' | 'dayGridMonth' | 'listDay';

interface CalendarToolbarProps {
  title: string;
  activeView: CalendarViewName;
  onViewChange: (view: CalendarViewName) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  /** Day-window toggle for the hidden early/late hours; null hides it (month/list views, or nothing collapsed). */
  dayWindow?: { expanded: boolean; onToggle: () => void } | null;
}

const DESKTOP_VIEWS: { label: string; view: CalendarViewName }[] = [
  { label: 'Day', view: 'timeGridDay' },
  { label: '3 Day', view: 'timeGridThreeDay' },
  { label: 'Week', view: 'timeGridWeek' },
  { label: 'Month', view: 'dayGridMonth' },
];

const MOBILE_VIEWS: { label: string; view: CalendarViewName }[] = [
  { label: 'Day', view: 'listDay' },
  { label: '3 Day', view: 'timeGridThreeDay' },
  { label: 'Week', view: 'timeGridWeek' },
  { label: 'Month', view: 'dayGridMonth' },
];

const CalendarToolbar: React.FC<CalendarToolbarProps> = ({ title, activeView, onViewChange, onPrev, onNext, onToday, dayWindow }) => {
  const isMobile = useIsMobile();
  const views = isMobile ? MOBILE_VIEWS : DESKTOP_VIEWS;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-10 sm:w-10" aria-label="Previous" onClick={onPrev}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" className="min-h-[44px] sm:min-h-0" onClick={onToday}>Today</Button>
        <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-10 sm:w-10" aria-label="Next" onClick={onNext}><ChevronRight className="h-4 w-4" /></Button>
        <h3 className="font-display text-lg tracking-tight text-foreground ml-1 truncate">{title}</h3>
      </div>
      {dayWindow && (
        <Button
          variant="ghost"
          size="sm"
          className="min-h-[44px] px-2 text-xs text-muted-foreground sm:min-h-0 sm:h-7"
          onClick={dayWindow.onToggle}
        >
          {dayWindow.expanded ? 'Hide extra hours' : 'Show full day'}
        </Button>
      )}
      <fieldset className="grid w-full min-w-0 grid-cols-4 rounded-md border border-border bg-card p-0.5 sm:inline-flex sm:w-auto">
        <legend className="sr-only">Calendar view</legend>
        {views.map((v) => (
          <button
            key={v.view}
            type="button"
            aria-pressed={activeView === v.view}
            onClick={() => onViewChange(v.view)}
            className={`min-h-[44px] px-3 text-sm rounded-[0.4rem] transition-colors sm:min-h-0 sm:py-1 ${activeView === v.view ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {v.label}
          </button>
        ))}
      </fieldset>
    </div>
  );
};

export default CalendarToolbar;
