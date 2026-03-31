import React, { useState } from 'react';
import { DailyForecast, WeatherData, getWeatherIcon, getWeatherEmoji } from '@/hooks/useWeather';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import WeatherDetailModal from '@/components/trip/weather/WeatherDetailModal';

interface DayWeatherBadgeProps {
  forecast: DailyForecast | undefined;
  currentWeather?: WeatherData['current'];
  isToday?: boolean;
  className?: string;
  compact?: boolean;
  location?: string;
  allForecasts?: DailyForecast[];
  date?: string;
}

function CompactTempDisplay({ showCurrent, currentWeather, forecast }: {
  showCurrent: boolean;
  currentWeather?: WeatherData['current'];
  forecast?: DailyForecast;
}) {
  if (showCurrent && currentWeather) return <span className="font-medium">{currentWeather.temp}°</span>;
  if (forecast) return <span className="font-medium">{forecast.tempHigh}°</span>;
  return null;
}

function FullTempDisplay({ showCurrent, currentWeather, forecast }: {
  showCurrent: boolean;
  currentWeather?: WeatherData['current'];
  forecast?: DailyForecast;
}) {
  if (showCurrent && currentWeather) {
    return (
      <>
        <span className="font-semibold">{currentWeather.temp}°</span>
        {forecast && (
          <span className="text-earth-400 text-[10px]">
            ({forecast.tempHigh}°/{forecast.tempLow}°)
          </span>
        )}
      </>
    );
  }
  if (forecast) {
    return (
      <>
        <span>{forecast.tempHigh}°</span>
        <span className="text-earth-400">/</span>
        <span className="text-earth-400">{forecast.tempLow}°</span>
      </>
    );
  }
  return null;
}

function WeatherTooltipBody({ showCurrent, currentWeather, forecast, includeTime }: {
  showCurrent: boolean;
  currentWeather?: WeatherData['current'];
  forecast?: DailyForecast;
  includeTime?: boolean;
}) {
  return (
    <>
      {showCurrent && currentWeather && (
        <div className={forecast ? "mb-2" : undefined}>
          <p className="font-semibold text-emerald-600">{includeTime ? 'Current conditions' : 'Right now'}</p>
          <p className="capitalize">{currentWeather.description}</p>
          <p className="font-medium">
            {currentWeather.temp}°F{includeTime && currentWeather.localTime ? ` at ${currentWeather.localTime}` : ''}
          </p>
        </div>
      )}
      {forecast && (
        <div>
          {showCurrent && includeTime && <p className="font-semibold text-earth-600">Today's forecast</p>}
          {showCurrent && !includeTime && <hr className="my-1 border-sand-200" />}
          <p className={includeTime ? "capitalize" : "font-medium capitalize"}>{forecast.description}</p>
          <p>High: {forecast.tempHigh}°F / Low: {forecast.tempLow}°F</p>
        </div>
      )}
      <p className="text-[10px] text-earth-400 mt-1">Click for details</p>
    </>
  );
}

export function DayWeatherBadge({ forecast, currentWeather, isToday, className, compact = false, location, allForecasts, date }: DayWeatherBadgeProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const showCurrent = !!(isToday && currentWeather);

  if (!forecast && !showCurrent) return null;

  let icon = '';
  if (showCurrent) {
    icon = getWeatherEmoji(currentWeather!.icon);
  } else if (forecast) {
    icon = getWeatherIcon(forecast.condition);
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModalOpen(true);
  };

  if (compact) {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleClick}
                className={cn("inline-flex items-center gap-1 text-xs text-earth-500 cursor-pointer hover:text-earth-700 transition-colors", className)}
              >
                <span>{icon}</span>
                <CompactTempDisplay showCurrent={showCurrent} currentWeather={currentWeather} forecast={forecast} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <WeatherTooltipBody showCurrent={showCurrent} currentWeather={currentWeather} forecast={forecast} />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <WeatherDetailModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          forecast={forecast}
          currentWeather={showCurrent ? currentWeather : undefined}
          isToday={isToday}
          location={location}
          allForecasts={allForecasts}
          date={date || forecast?.date}
        />
      </>
    );
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleClick}
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-full",
                "text-xs font-medium cursor-pointer transition-all",
                isToday
                  ? "bg-emerald-100/80 text-emerald-700 border border-emerald-200/50 hover:bg-emerald-200/80"
                  : "bg-sand-100/80 text-earth-600 border border-sand-200/50 hover:bg-sand-200/80",
                className
              )}
            >
              <span className="text-sm">{icon}</span>
              <FullTempDisplay showCurrent={showCurrent} currentWeather={currentWeather} forecast={forecast} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-[200px]">
            <WeatherTooltipBody showCurrent={showCurrent} currentWeather={currentWeather} forecast={forecast} includeTime />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <WeatherDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        forecast={forecast}
        currentWeather={showCurrent ? currentWeather : undefined}
        isToday={isToday}
        location={location}
        allForecasts={allForecasts}
        date={date || forecast?.date}
      />
    </>
  );
}

export default DayWeatherBadge;
