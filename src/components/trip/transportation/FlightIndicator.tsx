import React from 'react';
import { Card } from "@/components/ui/card";
import { Plane } from "lucide-react";
import { motion } from "framer-motion";
import { Tables } from '@/integrations/supabase/types';
import { format } from 'date-fns';

type TransportationEvent = Tables<'transportation_events'>;

interface FlightIndicatorProps {
  event: TransportationEvent;
  onClick: () => void;
}

const FlightIndicator: React.FC<FlightIndicatorProps> = ({ event, onClick }) => {
  const formatTime = (time?: string | null) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const timeDate = new Date();
    timeDate.setHours(parseInt(hours), parseInt(minutes));
    return format(timeDate, 'h:mm a').toLowerCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-2"
    >
      <Card
        onClick={onClick}
        className="p-2 cursor-pointer hover:bg-gray-50 transition-colors inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm"
      >
        <Plane className="h-4 w-4 text-earth-500" />
        <span className="text-sm">
          {formatTime(event.start_time)} • {event.departure_location} → {event.arrival_location}
        </span>
      </Card>
    </motion.div>
  );
};

export default FlightIndicator;