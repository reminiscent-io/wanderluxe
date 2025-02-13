
import React from 'react';
import DayImage from './DayImage';
import DayCardContent from './DayCardContent';
import DiningList from '../DiningList'; // Fixed import path

interface DayLayoutProps {
  title: string;
  activities: Array<{
    id: string;
    title: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    cost?: number;
    currency?: string;
  }>;
  reservations?: Array<{
    id: string;
    restaurant: string;
    time: string;
  }>;
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
