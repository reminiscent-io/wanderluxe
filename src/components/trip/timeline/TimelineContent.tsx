import React from 'react';
import { motion } from 'framer-motion';
import DayCard from '../day/DayCard';
import { TripDay, HotelStay } from '@/types/trip';
import { cn } from '@/lib/utils';

interface TimelineContentProps {
  days?: TripDay[];
  hotelStays?: HotelStay[];
  onDayDelete?: (dayId: string) => void;
  defaultImageUrl?: string;
  className?: string;
}

const TimelineContent: React.FC<TimelineContentProps> = ({
  days = [],
  hotelStays = [],
  onDayDelete,
  defaultImageUrl,
  className
}) => {
  if (!days || days.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-lg text-gray-500">
          No days to display. Add days to your trip to get started.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {days.map((day, index) => (
        <motion.div
          key={day.day_id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <DayCard
            id={day.day_id}
            tripId={day.trip_id}
            date={day.date}
            title={day.title}
            activities={day.activities}
            imageUrl={day.image_url}
            index={index}
            onDelete={(id) => onDayDelete && onDayDelete(id)}
            defaultImageUrl={defaultImageUrl}
            hotelStays={hotelStays}
            transportations={[]}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default TimelineContent;