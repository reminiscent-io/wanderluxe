import React, { useEffect, useRef } from 'react';
import { format, parse } from 'date-fns';
import { ChevronLeft, ChevronRight, Globe2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DayScrubberProps {
  dates: string[];
  /** null means whole-trip mode. */
  selectedDate: string | null;
  onSelect: (date: string | null) => void;
  /** e.g. "6 stops · 14.2 km bird's-eye" */
  summary?: string | null;
}

const dayLabel = (date: string) => format(parse(date, 'yyyy-MM-dd', new Date()), 'EEE d');
const monthLabel = (date: string) => format(parse(date, 'yyyy-MM-dd', new Date()), 'MMM');

const DayScrubber: React.FC<DayScrubberProps> = ({ dates, selectedDate, onSelect, summary }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const index = selectedDate ? dates.indexOf(selectedDate) : -1;

  // Keep the active chip in view when the day changes from elsewhere (playback,
  // the side list, keyboard) without yanking the whole page around.
  useEffect(() => {
    if (index < 0) return;
    const chip = listRef.current?.querySelector(`[data-date="${dates[index]}"]`);
    // Guarded: scrollIntoView is absent in jsdom and some embedded webviews.
    if (chip && typeof chip.scrollIntoView === 'function') {
      chip.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }, [index, dates]);

  const step = (delta: number) => {
    if (dates.length === 0) return;
    const next = index < 0 ? 0 : Math.min(dates.length - 1, Math.max(0, index + delta));
    onSelect(dates[next]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0 sm:h-9 sm:w-9"
          onClick={() => step(-1)}
          disabled={index <= 0}
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div
          ref={listRef}
          role="tablist"
          aria-label="Trip day"
          className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedDate === null}
            onClick={() => onSelect(null)}
            className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-card border px-3 text-sm transition-colors sm:min-h-0 sm:py-1.5 ${
              selectedDate === null
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            <Globe2 className="h-3.5 w-3.5" />
            Whole trip
          </button>

          {dates.map((date, i) => {
            const active = date === selectedDate;
            const showMonth = i === 0 || monthLabel(date) !== monthLabel(dates[i - 1]);
            return (
              <button
                key={date}
                type="button"
                role="tab"
                data-date={date}
                aria-selected={active}
                onClick={() => onSelect(date)}
                className={`flex min-h-[44px] shrink-0 flex-col items-center justify-center rounded-card border px-3 text-xs leading-tight transition-colors sm:min-h-0 sm:py-1 ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="font-medium">{dayLabel(date)}</span>
                {showMonth && <span className="text-[10px] opacity-70">{monthLabel(date)}</span>}
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0 sm:h-9 sm:w-9"
          onClick={() => step(1)}
          disabled={index >= dates.length - 1}
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {summary && (
        <p className="text-xs text-muted-foreground tabular-nums" data-testid="map-day-summary">
          {summary}
        </p>
      )}
    </div>
  );
};

export default DayScrubber;
