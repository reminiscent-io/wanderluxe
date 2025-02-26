
import React from 'react';
import DayImage from './DayImage';
import DayCardContent from './DayCardContent';
import { DayActivity, RestaurantReservation, ActivityFormData } from '@/types/trip';

interface HotelDetails {
  name: string;
  details: string;
  imageUrl?: string;
}

interface DayLayoutProps {
  title: string;
  activities: DayActivity[];
  hotelDetails?: HotelDetails;
  reservations?: RestaurantReservation[];
  index: number;
  onAddActivity: (activity: ActivityFormData) => Promise<void>;
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
  hotelDetails,
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
        defaultImageUrl={defaultImageUrl}
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
