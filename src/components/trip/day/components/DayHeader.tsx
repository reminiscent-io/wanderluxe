import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { DailyForecast } from '@/hooks/useWeather';
import DayWeatherBadge from '@/components/trip/timeline/DayWeatherBadge';

type Props = {
  dayTitle: string;
  formattedDate: string;
  index: number;
  isTodayFlag: boolean;
  isTravelDay: boolean;
  isCheckInDay: boolean;
  isCheckOutDay: boolean;
  totalEvents: number;
  summary: string;
  isExpanded: boolean;
  onToggle: () => void;
  weather?: DailyForecast;
};

const DayHeader: React.FC<Props> = ({
  dayTitle,
  formattedDate,
  index,
  isTodayFlag,
  isTravelDay,
  isCheckInDay,
  isCheckOutDay,
  totalEvents,
  summary,
  isExpanded,
  onToggle,
  weather,
}) => {
  return (
    <motion.div 
      className="p-3 sm:p-4 md:p-6 cursor-pointer hover:bg-sand-25 transition-colors duration-200"
      onClick={onToggle}
      whileHover={{ backgroundColor: "rgba(250, 245, 235, 0.5)" }}
    >
      <div className="flex items-start sm:items-center justify-between gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className="text-base sm:text-lg md:text-xl font-bold text-earth-800 truncate">
              {dayTitle} {formattedDate}
            </span>
            <div className="text-xs sm:text-sm md:text-base text-earth-600 font-medium">
              Day {index}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {weather && (
                <DayWeatherBadge forecast={weather} />
              )}
              {isTodayFlag && (
                <Badge className="bg-emerald-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1">Today</Badge>
              )}
              {isTravelDay && (
                <Badge className="bg-sky-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1">Travel Day</Badge>
              )}
              {isCheckInDay && (
                <Badge className="bg-amber-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1">Check-in</Badge>
              )}
              {isCheckOutDay && (
                <Badge className="bg-amber-600 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1">Check-out</Badge>
              )}
              {totalEvents > 0 && (
                <Badge className="bg-earth-200 text-earth-800 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1">
                  {totalEvents} event{totalEvents > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
        </div>

        <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-shrink-0">
          <span className="text-xs sm:text-sm text-earth-500 hidden lg:inline font-medium">{summary}</span>
          <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-10 sm:w-10 p-0 hover:bg-earth-100 transition-colors flex-shrink-0">
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-earth-600" />
            </motion.div>
          </Button>
        </div>
      </div>

      {summary && <div className="text-xs sm:text-sm text-earth-500 mt-2 lg:hidden">{summary}</div>}
    </motion.div>
  );
};

export default DayHeader;
