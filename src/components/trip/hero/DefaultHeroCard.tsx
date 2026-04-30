import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DefaultHeroCardProps {
  onCreateTrip: () => void;
  className?: string;
  lastTripImage?: string | null;
}

export function DefaultHeroCard({
  onCreateTrip,
  className,
  lastTripImage
}: DefaultHeroCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl shadow-warm-xl min-h-[360px] md:min-h-[400px] bg-grain",
        className
      )}
    >
      {lastTripImage && (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${lastTripImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(40px)',
            opacity: 0.15,
            transform: 'scale(1.1)',
          }}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-br from-sunset-50/40 via-sand-50/30 to-earth-50/30" />

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 py-10 md:px-12 md:py-14 text-center">
        <h2 className="font-display text-5xl md:text-7xl text-earth-900 leading-[1.05] mb-5">
          Where to next?
        </h2>
        <p className="text-earth-600 text-base md:text-lg max-w-md mb-8">
          Plan a trip and we'll help shape the days, the bookings, and the budget.
        </p>

        <Button
          size="lg"
          onClick={onCreateTrip}
          variant="sunset"
          className="font-semibold"
        >
          <Plus className="h-5 w-5 mr-2" />
          Plan a trip
        </Button>
      </div>
    </div>
  );
}

export default DefaultHeroCard;
