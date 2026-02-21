import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MapPin, Plus, Compass } from 'lucide-react';
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "relative overflow-hidden rounded-2xl shadow-warm-xl min-h-[320px] md:min-h-[300px] bg-grain",
        className
      )}
    >
      {/* Blurred background from last trip */}
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

      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-sunset-50/40 via-sand-50/30 to-earth-50/30" />

      {/* Pattern overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 text-center">
        {/* Animated compass icon */}
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="mb-6"
        >
          <div className="bg-gradient-to-br from-sunset-500 to-sunset-600 rounded-full p-5 shadow-warm-xl">
            <Compass className="h-10 w-10 text-white" />
          </div>
        </motion.div>

        <h2 className="text-2xl md:text-3xl font-black text-earth-900 mb-3">
          Where to Next?
        </h2>
        <p className="text-earth-600 text-lg max-w-md mb-6">
          Your next adventure is waiting. Plan a trip and let the journey begin.
        </p>

        <Button
          size="lg"
          onClick={onCreateTrip}
          variant="sunset"
          className="font-semibold transition-all duration-300 transform hover:scale-105"
        >
          <Plus className="h-5 w-5 mr-2" />
          Plan New Adventure
        </Button>
      </div>
    </motion.div>
  );
}

export default DefaultHeroCard;
