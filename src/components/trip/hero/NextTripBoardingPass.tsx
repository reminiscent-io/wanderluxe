import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Calendar, MapPin, Clock, ChevronRight } from 'lucide-react';
import { Trip } from '@/types/trip';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInSeconds } from 'date-fns';

interface NextTripBoardingPassProps {
  trip: Trip;
  daysUntil: number;
  onViewTrip: () => void;
  className?: string;
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
  className
}: NextTripBoardingPassProps) {
  const [countdown, setCountdown] = useState<Countdown>({ days: daysUntil, hours: 0, minutes: 0 });

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "relative overflow-hidden rounded-2xl shadow-xl cursor-pointer group",
        className
      )}
      onClick={onViewTrip}
    >
      {/* Paper texture background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100" />

      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      {/* Decorative tear line */}
      <div className="absolute left-0 right-0 top-[60%] md:top-auto md:left-[70%] md:right-auto md:top-0 md:bottom-0 md:w-px flex md:flex-col items-center justify-center">
        <div className="w-full h-px md:w-px md:h-full border-t md:border-l border-dashed border-amber-300" />
      </div>

      <div className="relative p-5 md:p-6 flex flex-col md:flex-row md:items-stretch min-h-[320px] md:min-h-[280px]">
        {/* Main Content - Left Side */}
        <div className="flex-1 md:pr-8 pb-6 md:pb-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Badge className="bg-amber-500/20 text-amber-800 font-semibold border border-amber-300">
              <Plane className="h-3 w-3 mr-1" />
              BOARDING PASS
            </Badge>
            <div className="text-xs text-amber-700 font-mono">
              #{trip.trip_id.slice(0, 8).toUpperCase()}
            </div>
          </div>

          {/* Countdown */}
          <div className="mb-6">
            <div className="text-xs text-amber-700 font-medium mb-1">DEPARTURE IN</div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl md:text-5xl font-black text-earth-900">
                T-{countdown.days}
              </span>
              <span className="text-xl md:text-2xl font-bold text-earth-700">
                d {countdown.hours}h {countdown.minutes}m
              </span>
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-3">
            <div>
              <div className="text-xs text-amber-700 font-medium mb-1">DESTINATION</div>
              <h2 className="text-2xl md:text-3xl font-black text-earth-900 leading-tight">
                {trip.destination}
              </h2>
            </div>

            <div className="flex flex-wrap gap-4">
              <div>
                <div className="text-xs text-amber-700 font-medium">DEPART</div>
                <div className="text-sm font-bold text-earth-900 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(arrival, 'MMM d, yyyy')}
                </div>
              </div>
              <div>
                <div className="text-xs text-amber-700 font-medium">RETURN</div>
                <div className="text-sm font-bold text-earth-900 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(departure, 'MMM d, yyyy')}
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <Button
            className="mt-6 bg-earth-800 hover:bg-earth-900 text-white font-semibold"
            onClick={(e) => {
              e.stopPropagation();
              onViewTrip();
            }}
          >
            View Trip Details
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Right Side - Trip Image / Barcode area */}
        <div className="md:w-[30%] flex flex-col items-center justify-center pt-6 md:pt-0 md:pl-8 border-t md:border-t-0 border-dashed border-amber-300">
          {/* Trip Cover Image (small) */}
          {trip.cover_image_url && (
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden shadow-lg mb-4 border-2 border-amber-200">
              <img
                src={trip.cover_image_url}
                alt={trip.destination}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Decorative barcode */}
          <div className="flex gap-0.5 h-12 items-end">
            {Array.from({ length: 20 }, (_, i) => (
              <div
                key={i}
                className="w-1 bg-earth-800"
                style={{ height: `${Math.random() * 60 + 40}%` }}
              />
            ))}
          </div>
          <div className="text-xs font-mono text-amber-700 mt-2">
            {trip.trip_id.slice(0, 12).toUpperCase()}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default NextTripBoardingPass;
