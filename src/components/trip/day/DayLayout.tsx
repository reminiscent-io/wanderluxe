import React from 'react';
import DayImage from './DayImage';
// Added import for DayActivity
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


// Added DayCardContent component based on context clues from the problem description.
const DayCardContent: React.FC<{
  index: number;
  title: string;
  activities: DayActivity[];
  onAddActivity: (activity: ActivityFormData) => Promise<void>;
  onEditActivity: (id: string) => void;
  formatTime: (time?: string) => string;
  dayId: string;
  eventId: string;
  reservations?: RestaurantReservation[];
}> = ({
  index,
  title,
  activities,
  onAddActivity,
  onEditActivity,
  formatTime,
  dayId,
  eventId,
  reservations,
}) => {
  return (
    <div>
      {/* Content for DayCardContent */}
      {activities.map((activity) => (
        <div key={activity.id}>
          <button onClick={() => {
            console.log('Activity edit requested in DayCardContent for activity:', activity.id);
            if (typeof onEditActivity === 'function') {
              onEditActivity(activity.id);
            } else {
              console.error('onEditActivity is not a function in DayCardContent');
            }
          }}>Edit {activity.title}</button>
        </div>
      ))}

    </div>
  );
};