import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Calendar, Clock, ChevronRight, Share2, Check, X } from 'lucide-react';
import { Trip } from '@/types/trip';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInSeconds } from 'date-fns';
import { useWeather, getWeatherForDate, getWeatherEmoji } from '@/hooks/useWeather';
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
  const defaultImage = 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f';
  const coverImage = trip.cover_image_url || defaultImage;

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
      </div>

      {/* Content Overlay */}
      <div className="relative h-full flex flex-col justify-between p-5 md:p-6">
        {/* Top Section */}
        <div className="flex items-start justify-between">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-amber-500 hover:bg-amber-500 text-white font-semibold px-3 py-1 shadow-lg">
              <Plane className="h-3 w-3 mr-1.5" />
              UPCOMING
            </Badge>
            {/* Shared by badge */}
            {ownerName && (
              <Badge className="flex items-center gap-1.5 bg-white/95 text-earth-700 border-0 backdrop-blur-sm shadow-lg px-2.5 py-1">
                <Share2 className="h-3 w-3 text-blue-600" />
                <span className="font-medium text-xs">{ownerName}</span>
              </Badge>
            )}
            {/* Pending invite badge */}
            {isPendingInvite && (
              <Badge className="bg-amber-500 text-white border-0 px-3 py-1 font-medium shadow-lg backdrop-blur-sm">
                Invite pending
              </Badge>
            )}
          </div>

          {/* Weather Forecast */}
          {arrivalForecast && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/20 backdrop-blur-md rounded-xl px-3 py-2 text-white"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{getWeatherEmoji(arrivalForecast.icon)}</span>
                <div className="text-right">
                  <div className="font-bold text-lg leading-none">
                    {arrivalForecast.tempHigh}°/{arrivalForecast.tempLow}°F
                  </div>
                  <div className="text-xs opacity-80">forecast</div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Bottom Section */}
        <div className="space-y-4">
          {/* Countdown */}
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-sm px-3 py-1">
              <Clock className="h-3 w-3 mr-1.5" />
              T-{countdown.days}d {countdown.hours}h {countdown.minutes}m
            </Badge>
          </div>

          {/* Destination */}
          <div>
            <h2 className="text-white text-3xl md:text-4xl font-black leading-tight mb-2 drop-shadow-lg">
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
                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg"
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
                    className="flex-1 sm:flex-none bg-white/90 hover:bg-white text-earth-800 font-semibold shadow-lg"
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
              className="w-full sm:w-auto bg-white text-earth-900 hover:bg-white/90 font-semibold shadow-lg"
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
    </motion.div>
  );
}

export default NextTripBoardingPass;
