import React from 'react';
import { Card } from "@/components/ui/card";
import { Plane } from "lucide-react";
import { motion } from "framer-motion";
import { Tables } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { useState } from 'react';
import TransportationDialog from './TransportationDialog';

type TransportationEvent = Tables<'transportation_events'>;

interface FlightIndicatorProps {
  event: TransportationEvent;
  tripId: string;
}

const FlightIndicator: React.FC<FlightIndicatorProps> = ({ event, tripId }) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClick = () => {
    setDialogOpen(true);
  };
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
      className="mb-4 w-full max-w-md mx-auto"
    >
      <Card
        onClick={handleClick}
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-3 bg-white/80 backdrop-blur-sm shadow-md"
      >
        <div className="bg-earth-50 p-2 rounded-full">
          <Plane className="h-5 w-5 text-earth-500" />
        </div>
        <div className="flex-1">
          <p className="font-medium">
            {event.departure_location} → {event.arrival_location}
          </p>
          <p className="text-sm text-gray-600">
            {formatTime(event.start_time)}
            {event.end_time && ` - ${formatTime(event.end_time)}`}
          </p>
        </div>
      </Card>
      <TransportationDialog
        tripId={tripId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={event}
        onSuccess={() => setDialogOpen(false)}
      />
    </motion.div>
  );
};

export default FlightIndicator;