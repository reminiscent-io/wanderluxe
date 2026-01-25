import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, CloudSun, ChevronRight } from 'lucide-react';
import { Trip } from '@/types/trip';
import { useWeather, getWeatherEmoji } from '@/hooks/useWeather';
import { cn } from '@/lib/utils';
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

  // Calculate trip progress
  const today = new Date();
  const arrival = parseISO(trip.arrival_date);
  const departure = parseISO(trip.departure_date);
  const totalDays = differenceInDays(departure, arrival) + 1;
  const daysPassed = differenceInDays(today, arrival) + 1;
  const currentDay = Math.min(Math.max(daysPassed, 1), totalDays);

  const defaultImage = 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f';
  const coverImage = trip.cover_image_url || defaultImage;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "relative overflow-hidden rounded-2xl shadow-xl cursor-pointer group",
        fullBleed ? "h-[40vh] -mx-4 rounded-none md:rounded-2xl md:mx-0" : "h-[320px] md:h-[380px]"
      )}
      onClick={onViewItinerary}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={coverImage}
          alt={trip.destination}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>

      {/* Content Overlay */}
      <div className="relative h-full flex flex-col justify-between p-5 md:p-6">
        {/* Top Section */}
        <div className="flex items-start justify-between">
          {/* Live Badge */}
          <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white font-semibold px-3 py-1 animate-pulse shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full mr-2 animate-ping" />
            LIVE
          </Badge>

          {/* Weather Info */}
          {weather?.current && !weatherLoading && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/20 backdrop-blur-md rounded-xl px-3 py-2 text-white"
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
    </motion.div>
  );
}

export default ActiveTripCard;
