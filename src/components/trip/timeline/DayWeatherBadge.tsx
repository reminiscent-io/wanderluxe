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

export function DayWeatherBadge({ forecast, currentWeather, isToday, className, compact = false }: DayWeatherBadgeProps) {
  // For today, prefer current weather if available
  const showCurrent = isToday && currentWeather;

  if (!forecast && !showCurrent) {
    return null;
  }

  // Use current weather icon for today, forecast icon otherwise
  const icon = showCurrent
    ? getWeatherEmoji(currentWeather.icon)
    : forecast ? getWeatherIcon(forecast.condition) : '';

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "inline-flex items-center gap-1 text-xs text-earth-500",
              className
            )}>
              <span>{icon}</span>
              {showCurrent ? (
                <span className="font-medium">{currentWeather.temp}°</span>
              ) : forecast ? (
                <span className="font-medium">{forecast.tempHigh}°</span>
              ) : null}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {showCurrent && (
              <>
                <p className="font-semibold text-emerald-600">Right now</p>
                <p className="capitalize">{currentWeather.description}</p>
                <p className="font-medium">{currentWeather.temp}°F</p>
              </>
            )}
            {forecast && (
              <>
                {showCurrent && <hr className="my-1 border-sand-200" />}
                <p className="font-medium capitalize">{forecast.description}</p>
                <p>High: {forecast.tempHigh}°F / Low: {forecast.tempLow}°F</p>
              </>
            )}
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
            {showCurrent ? (
              // For today: show current temp prominently, with high/low in smaller text
              <>
                <span className="font-semibold">{currentWeather.temp}°</span>
                {forecast && (
                  <span className="text-earth-400 text-[10px]">
                    ({forecast.tempHigh}°/{forecast.tempLow}°)
                  </span>
                )}
              </>
            ) : forecast ? (
              // For other days: show high/low
              <>
                <span>{forecast.tempHigh}°</span>
                <span className="text-earth-400">/</span>
                <span className="text-earth-400">{forecast.tempLow}°</span>
              </>
            ) : null}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px]">
          {showCurrent && (
            <div className="mb-2">
              <p className="font-semibold text-emerald-600">Current conditions</p>
              <p className="capitalize">{currentWeather.description}</p>
              <p className="font-medium">{currentWeather.temp}°F at {currentWeather.localTime}</p>
            </div>
          )}
          {forecast && (
            <div>
              {showCurrent && <p className="font-semibold text-earth-600">Today's forecast</p>}
              <p className="capitalize">{forecast.description}</p>
              <p>High: {forecast.tempHigh}°F / Low: {forecast.tempLow}°F</p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default DayWeatherBadge;
