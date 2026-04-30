import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, CloudSun, ChevronRight } from 'lucide-react';
import { Trip } from '@/types/trip';
import { useWeather, getWeatherEmoji } from '@/hooks/useWeather';
import WeatherDetailModal from '@/components/trip/weather/WeatherDetailModal';
import { cn } from '@/lib/utils';
import { DEFAULT_TRIP_IMAGE, DEFAULT_TRIP_IMAGE_PHOTOGRAPHER, DEFAULT_TRIP_IMAGE_USERNAME } from '@/constants/unsplash';
import { format, parseISO, differenceInDays } from 'date-fns';

interface ActiveTripCardProps {
  trip: Trip;
  onViewItinerary: () => void;
  fullBleed?: boolean;
  additionalTripsCount?: number;
}

export function ActiveTripCard({
  trip,
  onViewItinerary,
  fullBleed = false,
  additionalTripsCount = 0
}: ActiveTripCardProps) {
  // Use primary_destination for weather if available, fallback to trip name
  const weatherLocation = trip.primary_destination || trip.destination;
  const { data: weather, isLoading: weatherLoading } = useWeather(weatherLocation);
  const [weatherModalOpen, setWeatherModalOpen] = useState(false);

  // Calculate trip progress
  const today = new Date();
  const arrival = parseISO(trip.arrival_date);
  const departure = parseISO(trip.departure_date);
  const totalDays = differenceInDays(departure, arrival) + 1;
  const daysPassed = differenceInDays(today, arrival) + 1;
  const currentDay = Math.min(Math.max(daysPassed, 1), totalDays);

  const coverImage = trip.cover_image_url || DEFAULT_TRIP_IMAGE;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "relative overflow-hidden rounded-2xl shadow-warm-xl cursor-pointer group",
        fullBleed ? "h-[40vh] -mx-4 rounded-none md:rounded-2xl md:mx-0" : "h-[320px] md:h-[380px]"
      )}
      onClick={onViewItinerary}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={coverImage}
          alt={trip.destination}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 img-warm"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        {/* Unsplash attribution */}
        {(() => {
          const photographer = trip.cover_image_url ? trip.cover_image_photographer : DEFAULT_TRIP_IMAGE_PHOTOGRAPHER;
          const username = trip.cover_image_url ? trip.cover_image_photographer_username : DEFAULT_TRIP_IMAGE_USERNAME;
          if (!photographer || !username) return null;
          return (
            <div className="absolute bottom-1.5 right-1.5 z-10 text-white/50 text-[10px] hover:text-white/80 transition-opacity pointer-events-auto">
              <a href={`https://unsplash.com/@${username}?utm_source=wanderluxe&utm_medium=referral`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                {photographer}
              </a>
              {' / '}
              <a href="https://unsplash.com?utm_source=wanderluxe&utm_medium=referral" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                Unsplash
              </a>
            </div>
          );
        })()}
      </div>

      {/* Content Overlay */}
      <div className="relative h-full flex flex-col justify-between p-5 md:p-6">
        {/* Top Section */}
        <div className="flex items-start justify-between">
          {/* Live Badge */}
          <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white font-semibold px-3 py-1 shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full mr-2 animate-ping" />
            LIVE
          </Badge>

          {/* Weather Info */}
          {weather?.current && !weatherLoading && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/20 backdrop-blur-md rounded-xl px-3 py-2 text-white cursor-pointer hover:bg-white/30 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setWeatherModalOpen(true);
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{getWeatherEmoji(weather.current.icon)}</span>
                <div className="text-right">
                  <div className="font-bold text-lg leading-none">{weather.current.temp}°F</div>
                  <div className="text-xs opacity-80">{weather.current.localTime}</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Additional trips badge */}
          {additionalTripsCount > 0 && (
            <Badge className="bg-white/20 backdrop-blur-md text-white font-medium">
              +{additionalTripsCount} more
            </Badge>
          )}
        </div>

        {/* Bottom Section */}
        <div className="space-y-4">
          {/* Trip Progress */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-white/20 text-white text-xs backdrop-blur-sm">
              Day {currentDay} of {totalDays}
            </Badge>
          </div>

          {/* Destination & Dates */}
          <div>
            <h2 className="text-white text-3xl md:text-4xl font-black leading-tight mb-2 drop-shadow-lg">
              {trip.destination}
            </h2>
            <div className="flex flex-col gap-1 text-white/80 text-sm">
              {trip.primary_destination && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {trip.primary_destination}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {format(arrival, 'MMM d')} - {format(departure, 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          {/* CTA Button */}
          <Button
            size="lg"
            className="w-full sm:w-auto bg-white text-earth-900 hover:bg-white/90 font-semibold shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              onViewItinerary();
            }}
          >
            View Itinerary
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
      {weather && (
        <WeatherDetailModal
          open={weatherModalOpen}
          onOpenChange={setWeatherModalOpen}
          forecast={weather.daily?.[0]}
          currentWeather={weather.current}
          isToday={true}
          location={weatherLocation}
          allForecasts={weather.daily}
          date={new Date().toISOString().split('T')[0]}
        />
      )}
    </motion.div>
  );
}

export default ActiveTripCard;
