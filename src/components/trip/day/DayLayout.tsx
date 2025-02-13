
import React from 'react';
import DayImage from './DayImage';
import DayCardContent from './DayCardContent';
import { DayActivity, RestaurantReservation } from '@/types/trip';

interface DayLayoutProps {
  title: string;
  activities: DayActivity[];
  reservations?: RestaurantReservation[];
  hotelDetails?: {
    name: string;
    details: string;
    imageUrl?: string;
  };
  index: number;
  onAddActivity: () => void;
  onEditActivity: (id: string) => void;
  formatTime: (time?: string) => string;
  dayId: string;
  tripId: string;
  imageUrl?: string | null;
  defaultImageUrl?: string;
}

const DayLayout: React.FC<DayLayoutProps> = ({
  title,
  activities,
  index,
  onAddActivity,
  onEditActivity,
  formatTime,
  dayId,
  tripId,
  imageUrl,
  defaultImageUrl,
  reservations,
}) => {
  return (
    <div className="grid md:grid-cols-2 h-full">
      <DayImage
        title={title}
        imageUrl={imageUrl}
        dayId={dayId}
        tripId={tripId}
      />

      <DayCardContent
        index={index}
        title={title}
        activities={activities}
        onAddActivity={onAddActivity}
        onEditActivity={onEditActivity}
        formatTime={formatTime}
        dayId={dayId}
        eventId={dayId}
        reservations={reservations}
      />
    </div>
  );
};

export default DayLayout;
