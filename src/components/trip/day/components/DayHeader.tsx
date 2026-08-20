import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DailyForecast, WeatherData } from '@/hooks/useWeather';
import DayWeatherBadge from '@/components/trip/timeline/DayWeatherBadge';

type Props = {
  dayTitle: string;
  formattedDate: string;
  index: number;
  isTodayFlag: boolean;
  isCheckInDay: boolean;
  isCheckOutDay: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  weather?: DailyForecast;
  currentWeather?: WeatherData['current'];
  dateISO?: string;
  weatherLocation?: string;
  allForecasts?: DailyForecast[];
};

const chipClass =
  'text-ui-xs px-2 py-0.5 font-medium uppercase tracking-[0.08em] shrink-0';

const DayHeader: React.FC<Props> = ({
  dayTitle,
  formattedDate,
  index,
  isTodayFlag,
  isCheckInDay,
  isCheckOutDay,
  isExpanded,
  onToggle,
  weather,
  currentWeather,
  dateISO,
  weatherLocation,
  allForecasts,
}) => {
  // Countdown for Day 1 in the future
  const daysUntil = React.useMemo(() => {
    if (index !== 1 || !dateISO) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(dateISO);
    dayDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((dayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
  }, [index, dateISO]);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      className={cn(
        // Sticky so the day you're reading stays named while you scroll it.
        'sticky top-0 z-20 flex h-daybar w-full items-center gap-3 bg-card px-3 text-left sm:px-4',
        'cursor-pointer transition-colors duration-200 hover:bg-secondary/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        isExpanded ? 'rounded-t-card' : 'rounded-card',
      )}
    >
      {/* Name over date, both hard left. The name is the only serif on the timeline. */}
      <span className="flex min-w-0 shrink flex-col">
        <span className="truncate text-ui-day font-display font-normal leading-tight text-foreground">
          {dayTitle}
        </span>
        <span className="truncate text-ui-sm leading-tight text-earth-500">
          {formattedDate}
        </span>
      </span>

      {/* Status chips, pushed right */}
      <span className="ml-auto flex items-center gap-1.5 overflow-hidden sm:gap-2">
        {(weather || (isTodayFlag && currentWeather)) && (
          <DayWeatherBadge
            forecast={weather}
            currentWeather={currentWeather}
            isToday={isTodayFlag}
            location={weatherLocation}
            allForecasts={allForecasts}
            date={dateISO?.split('T')[0]}
          />
        )}
        {daysUntil && (
          <Badge variant="outline" className={cn(chipClass, 'hidden bg-card border-border text-earth-500 sm:inline-flex')}>
            In {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
          </Badge>
        )}
        {isTodayFlag && (
          <Badge className={cn(chipClass, 'bg-primary text-primary-foreground hover:bg-primary')}>Today</Badge>
        )}
        {isCheckInDay && (
          <Badge className={cn(chipClass, 'hidden border-transparent bg-primary/15 text-primary hover:bg-primary/15 sm:inline-flex')}>Check-in</Badge>
        )}
        {isCheckOutDay && (
          <Badge className={cn(chipClass, 'hidden border-transparent bg-muted text-earth-500 hover:bg-muted sm:inline-flex')}>Check-out</Badge>
        )}
      </span>

      <span aria-hidden className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-earth-500">
        <motion.span
          className="inline-flex"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <ChevronDown className="h-5 w-5" strokeWidth={1.5} />
        </motion.span>
      </span>
    </button>
  );
};

export default DayHeader;
