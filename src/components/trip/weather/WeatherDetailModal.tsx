import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { DailyForecast, WeatherData, getWeatherIcon, getWeatherEmoji } from '@/hooks/useWeather';
import { format, parseISO } from 'date-fns';

interface WeatherDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forecast?: DailyForecast;
  currentWeather?: WeatherData['current'];
  isToday?: boolean;
  location?: string;
  allForecasts?: DailyForecast[];
  date?: string;
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'EEEE, MMMM do');
  } catch {
    return dateStr;
  }
}

export default function WeatherDetailModal({
  open,
  onOpenChange,
  forecast,
  currentWeather,
  isToday,
  location,
  allForecasts,
  date,
}: WeatherDetailModalProps) {
  const showCurrent = !!(isToday && currentWeather);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-display text-earth-800">
            {showCurrent ? "Current Weather" : "Weather Forecast"}
          </DialogTitle>
          <DialogDescription>
            {location && <span>{location}</span>}
            {date && <span>{location ? ' \u00b7 ' : ''}{formatDate(date)}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current conditions */}
          {showCurrent && currentWeather && (
            <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/50 p-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{getWeatherEmoji(currentWeather.icon)}</span>
                <div className="flex-1">
                  <p className="text-3xl font-semibold text-emerald-800">
                    {currentWeather.temp}°F
                  </p>
                  <p className="text-sm text-emerald-700 capitalize">{currentWeather.description}</p>
                  {currentWeather.localTime && (
                    <p className="text-xs text-emerald-600 mt-0.5">as of {currentWeather.localTime}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Day forecast */}
          {forecast && (
            <div className="rounded-xl bg-sand-50 border border-sand-200/50 p-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{getWeatherIcon(forecast.condition)}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-earth-700 capitalize">{forecast.description}</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-semibold text-earth-800">{forecast.tempHigh}°F</span>
                    <span className="text-earth-400">/</span>
                    <span className="text-lg text-earth-500">{forecast.tempLow}°F</span>
                  </div>
                  <p className="text-xs text-earth-500 mt-0.5">
                    High / Low
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Multi-day forecast */}
          {allForecasts && allForecasts.length > 1 && (
            <div>
              <h4 className="text-xs font-semibold text-earth-500 uppercase tracking-wide mb-2">
                Upcoming days
              </h4>
              <div className="divide-y divide-sand-100 rounded-xl border border-sand-200/50 overflow-hidden">
                {allForecasts.map((day) => (
                  <div
                    key={day.date}
                    className={`flex items-center gap-3 px-3 py-2.5 ${
                      day.date === forecast?.date
                        ? 'bg-sand-100/80'
                        : 'bg-background hover:bg-sand-50'
                    }`}
                  >
                    <span className="text-lg">{getWeatherIcon(day.condition)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-earth-700 truncate">
                        {formatDate(day.date)}
                      </p>
                      <p className="text-xs text-earth-500 capitalize">{day.description}</p>
                    </div>
                    <div className="text-right text-sm whitespace-nowrap">
                      <span className="font-medium text-earth-800">{day.tempHigh}°</span>
                      <span className="text-earth-400"> / </span>
                      <span className="text-earth-500">{day.tempLow}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
