import React from 'react';
import { DailyForecast, WeatherData, getWeatherIcon, getWeatherEmoji } from '@/hooks/useWeather';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DayWeatherBadgeProps {
  forecast: DailyForecast | undefined;
  currentWeather?: WeatherData['current'];
  isToday?: boolean;
  className?: string;
  compact?: boolean;
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
    </>
  );
}

export function DayWeatherBadge({ forecast, currentWeather, isToday, className, compact = false }: DayWeatherBadgeProps) {
  const showCurrent = !!(isToday && currentWeather);

  if (!forecast && !showCurrent) return null;

  let icon = '';
  if (showCurrent) {
    icon = getWeatherEmoji(currentWeather!.icon);
  } else if (forecast) {
    icon = getWeatherIcon(forecast.condition);
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("inline-flex items-center gap-1 text-xs text-earth-500", className)}>
              <span>{icon}</span>
              <CompactTempDisplay showCurrent={showCurrent} currentWeather={currentWeather} forecast={forecast} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <WeatherTooltipBody showCurrent={showCurrent} currentWeather={currentWeather} forecast={forecast} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded-full",
            "text-xs font-medium",
            isToday
              ? "bg-emerald-100/80 text-emerald-700 border border-emerald-200/50"
              : "bg-sand-100/80 text-earth-600 border border-sand-200/50",
            className
          )}>
            <span className="text-sm">{icon}</span>
            <FullTempDisplay showCurrent={showCurrent} currentWeather={currentWeather} forecast={forecast} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px]">
          <WeatherTooltipBody showCurrent={showCurrent} currentWeather={currentWeather} forecast={forecast} includeTime />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default DayWeatherBadge;
