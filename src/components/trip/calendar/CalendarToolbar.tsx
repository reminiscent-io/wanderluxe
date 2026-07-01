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

const CalendarToolbar: React.FC<CalendarToolbarProps> = ({ title, activeView, onViewChange, onPrev, onNext, onToday }) => {
  const isMobile = useIsMobile();
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Previous" onClick={onPrev}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={onToday}>Today</Button>
        <Button variant="ghost" size="icon" aria-label="Next" onClick={onNext}><ChevronRight className="h-4 w-4" /></Button>
        <h3 className="font-display text-lg tracking-tight text-foreground ml-1 truncate">{title}</h3>
      </div>
      {isMobile ? (
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          aria-label="Calendar view"
          value={activeView}
          onChange={(e) => onViewChange(e.target.value as CalendarViewName)}
        >
          {MOBILE_VIEWS.map((v) => <option key={v.view} value={v.view}>{v.label}</option>)}
        </select>
      ) : (
        <div className="inline-flex rounded-md border border-border bg-card p-0.5">
          {DESKTOP_VIEWS.map((v) => (
            <button
              key={v.view}
              type="button"
              onClick={() => onViewChange(v.view)}
              className={`px-3 py-1 text-sm rounded-[0.4rem] transition-colors ${activeView === v.view ? 'bg-sunset-500 text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalendarToolbar;
