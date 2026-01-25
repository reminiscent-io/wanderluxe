import React from 'react';
import { DailyForecast, getWeatherIcon } from '@/hooks/useWeather';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DayWeatherBadgeProps {
  forecast: DailyForecast | undefined;
  className?: string;
  compact?: boolean;
}

export function DayWeatherBadge({ forecast, className, compact = false }: DayWeatherBadgeProps) {
  if (!forecast) {
    return null;
  }

  const icon = getWeatherIcon(forecast.condition);

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
              <span className="font-medium">{forecast.tempHigh}°</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p className="font-medium capitalize">{forecast.description}</p>
            <p>High: {forecast.tempHigh}°F / Low: {forecast.tempLow}°F</p>
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
            "bg-sand-100/80 text-earth-600 text-xs font-medium",
            "border border-sand-200/50",
            className
          )}>
            <span className="text-sm">{icon}</span>
            <span>{forecast.tempHigh}°</span>
            <span className="text-earth-400">/</span>
            <span className="text-earth-400">{forecast.tempLow}°</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium capitalize">{forecast.description}</p>
          <p>High: {forecast.tempHigh}°F / Low: {forecast.tempLow}°F</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default DayWeatherBadge;
