import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import { DailyForecast, WeatherData } from '@/hooks/useWeather';
import DayWeatherBadge from '@/components/trip/timeline/DayWeatherBadge';

type Props = {
  dayTitle: string;
  formattedDate: string;
  index: number;
  isTodayFlag: boolean;
  isCheckInDay: boolean;
  isCheckOutDay: boolean;
  summary: string;
  isExpanded: boolean;
  onToggle: () => void;
  weather?: DailyForecast;
  currentWeather?: WeatherData['current'];
  dateISO?: string;
  weatherLocation?: string;
  allForecasts?: DailyForecast[];
};

const DayHeader: React.FC<Props> = ({
  dayTitle,
  formattedDate,
  index,
  isTodayFlag,
  isCheckInDay,
  isCheckOutDay,
  summary,
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
      className="w-full text-left p-4 sm:p-5 md:p-6 cursor-pointer hover:bg-secondary/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
    >
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-4 flex-1 min-w-0">
          <div className="flex flex-col min-w-0">
            <div className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-[0.18em] mb-1">
              Day {index}
            </div>
            <span className="text-lg sm:text-xl md:text-2xl font-display font-normal text-foreground leading-tight truncate">
              {dayTitle}
              <span className="text-muted-foreground/80">, {formattedDate}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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
                <Badge variant="outline" className="bg-card border-border text-muted-foreground text-[10px] sm:text-xs px-2 py-0.5 font-medium uppercase tracking-wide">
                  In {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
                </Badge>
              )}
              {isTodayFlag && (
                <Badge className="bg-primary text-primary-foreground text-[10px] sm:text-xs px-2 py-0.5 font-medium uppercase tracking-wide hover:bg-primary">Today</Badge>
              )}
              {isCheckInDay && (
                <Badge className="bg-primary/15 text-primary border-transparent text-[10px] sm:text-xs px-2 py-0.5 font-medium uppercase tracking-wide hover:bg-primary/15">Check-in</Badge>
              )}
              {isCheckOutDay && (
                <Badge className="bg-muted text-muted-foreground border-transparent text-[10px] sm:text-xs px-2 py-0.5 font-medium uppercase tracking-wide hover:bg-muted">Check-out</Badge>
              )}
              {summary && (
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">{summary}</span>
              )}
            </div>
        </div>

        <span aria-hidden className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors group-hover:bg-accent flex-shrink-0">
          <motion.span
            className="inline-flex"
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />
          </motion.span>
        </span>
      </div>
    </button>
  );
};

export default DayHeader;
