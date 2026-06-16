import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Calendar, Clock, ChevronRight, Share2, Check, X } from 'lucide-react';
import { Trip } from '@/types/trip';
import { cn } from '@/lib/utils';
import { DEFAULT_TRIP_IMAGE, DEFAULT_TRIP_IMAGE_PHOTOGRAPHER, DEFAULT_TRIP_IMAGE_USERNAME } from '@/constants/unsplash';
import { format, parseISO, differenceInSeconds } from 'date-fns';
import { useWeather, getWeatherForDate, getWeatherEmoji } from '@/hooks/useWeather';
import WeatherDetailModal from '@/components/trip/weather/WeatherDetailModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface NextTripBoardingPassProps {
  trip: Trip;
  daysUntil: number;
  onViewTrip: () => void;
  className?: string;
  fullBleed?: boolean;
  // Shared trip props
  isPendingInvite?: boolean;
  shareId?: string;
  ownerName?: string;
  onAcceptInvite?: (shareId: string) => void;
  onDeclineInvite?: (shareId: string) => void;
}

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
}

export function NextTripBoardingPass({
  trip,
  daysUntil,
  onViewTrip,
  className,
  fullBleed = false,
  isPendingInvite = false,
  shareId,
  ownerName,
  onAcceptInvite,
  onDeclineInvite,
}: NextTripBoardingPassProps) {
  const [countdown, setCountdown] = useState<Countdown>({ days: daysUntil, hours: 0, minutes: 0 });

  // Fetch weather for the destination (only useful if trip starts within 5 days)
  const weatherLocation = trip.primary_destination || trip.destination;
  const { data: weather } = useWeather(daysUntil <= 5 ? weatherLocation : undefined);

  // Get the forecast for the arrival date
  const arrivalDateStr = trip.arrival_date?.split('T')[0];
  const arrivalForecast = arrivalDateStr ? getWeatherForDate(weather, arrivalDateStr) : undefined;
  const [weatherModalOpen, setWeatherModalOpen] = useState(false);

  // Live countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tripDate = parseISO(trip.arrival_date);
      tripDate.setHours(0, 0, 0, 0);

      const diff = differenceInSeconds(tripDate, now);

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0 });
        return;
      }

      setCountdown({
        days: Math.floor(diff / 86400),
        hours: Math.floor((diff % 86400) / 3600),
        minutes: Math.floor((diff % 3600) / 60)
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [trip.arrival_date]);

  const arrival = parseISO(trip.arrival_date);
  const departure = parseISO(trip.departure_date);
  const coverImage = trip.cover_image_url || DEFAULT_TRIP_IMAGE;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "relative overflow-hidden rounded-2xl shadow-warm-xl cursor-pointer group",
        fullBleed ? "h-[40vh] -mx-4 rounded-none md:rounded-2xl md:mx-0" : "h-[320px] md:h-[380px]",
        className
      )}
      onClick={isPendingInvite ? undefined : onViewTrip}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={coverImage}
          alt={trip.destination}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 img-warm"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
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
        <div className="flex items-start justify-between gap-3">
          {/* Badges — opaque, warm shadows */}
          <div className="flex min-w-0 flex-wrap gap-1.5 sm:gap-2">
            <Badge className="bg-amber-500 hover:bg-amber-500 text-white font-semibold px-3 py-1 shadow-warm">
              <Plane className="h-3 w-3 mr-1.5" />
              UPCOMING
            </Badge>
            {/* Shared by badge */}
            {ownerName && (
              <Badge className="flex max-w-[10rem] items-center gap-1.5 truncate bg-background text-foreground border-0 shadow-warm px-2.5 py-1">
                <Share2 className="h-3 w-3 shrink-0 text-primary" />
                <span className="truncate font-medium text-xs">{ownerName}</span>
              </Badge>
            )}
            {/* Pending invite badge */}
            {isPendingInvite && (
              <Badge className="bg-amber-500 text-white border-0 px-3 py-1 font-medium shadow-warm">
                Invite pending
              </Badge>
            )}
          </div>

          {/* Weather Forecast — opaque for outdoor readability */}
          {arrivalForecast && (
            <motion.button
              type="button"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="min-h-[44px] rounded-card bg-background/95 px-3 py-2 text-foreground shadow-warm-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              onClick={(e) => {
                e.stopPropagation();
                setWeatherModalOpen(true);
              }}
              aria-label="View weather forecast"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none">{getWeatherEmoji(arrivalForecast.icon)}</span>
                <div className="text-right">
                  <div className="font-semibold text-base leading-none tabular-nums">
                    {arrivalForecast.tempHigh}°/{arrivalForecast.tempLow}°
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">forecast</div>
                </div>
              </div>
            </motion.button>
          )}
        </div>

        {/* Bottom Section */}
        <div className="space-y-4">
          {/* Countdown — opaque, tabular for stability */}
          <div className="flex items-center gap-3">
            <Badge
              variant="secondary"
              className="bg-foreground/75 text-white border-0 px-3 py-1 tabular-nums shadow-warm"
            >
              <Clock className="h-3 w-3 mr-1.5" />
              T-{countdown.days}d {countdown.hours}h {countdown.minutes}m
            </Badge>
          </div>

          {/* Destination */}
          <div>
            <h2 className="font-display text-white text-[2rem] leading-[1.05] md:text-5xl md:leading-[1.04] tracking-tight mb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
              {trip.destination}
            </h2>
            <div className="flex flex-col gap-1 text-white/80 text-sm">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(arrival, 'MMM d')} - {format(departure, 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          {/* CTA Buttons */}
          {isPendingInvite && shareId ? (
            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-warm-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  onAcceptInvite?.(shareId);
                }}
              >
                <Check className="h-4 w-4 mr-2" />
                Accept Trip
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 sm:flex-none bg-background hover:bg-background/90 text-foreground font-semibold shadow-warm-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Decline
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Decline this trip?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure? If you decline, this shared trip will disappear from your list and you'll lose access.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDeclineInvite?.(shareId)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, decline
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <Button
              size="lg"
              className="w-full sm:w-auto bg-background text-foreground hover:bg-background/90 font-semibold shadow-warm-lg"
              onClick={(e) => {
                e.stopPropagation();
                onViewTrip();
              }}
            >
              View Trip Details
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
      {arrivalForecast && (
        <WeatherDetailModal
          open={weatherModalOpen}
          onOpenChange={setWeatherModalOpen}
          forecast={arrivalForecast}
          location={weatherLocation}
          allForecasts={weather?.daily}
          date={arrivalDateStr}
        />
      )}
    </motion.div>
  );
}

export default NextTripBoardingPass;
