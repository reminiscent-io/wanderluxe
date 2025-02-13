
import React from 'react';
import HotelInfo from '../HotelInfo';
import ActivitiesList from '../ActivitiesList';
import DiningList from '../DiningList';
import { DayActivity } from '@/types/trip';

interface DayContentProps {
  index: number;
  title: string;
  hotelDetails?: {
    name: string;
    details: string;
  };
  activities: DayActivity[];
  onAddActivity: () => void;
  onEditActivity: (id: string) => void;
  formatTime: (time?: string) => string;
  dayId: string;
}

const DayContent: React.FC<DayContentProps> = ({
  index,
  title,
  hotelDetails,
  activities,
  onAddActivity,
  onEditActivity,
  formatTime,
  dayId,
}) => {
  return (
    <div className="p-6">
      <div className="space-y-6">
        <div>
          <span className="text-sm text-gray-500">Day {index + 1}</span>
          <h3 className="text-2xl font-semibold mt-1">
            {title || "Untitled Day"}
          </h3>
        </div>

        {hotelDetails && (
          <HotelInfo
            name={hotelDetails.name}
            details={hotelDetails.details}
          />
        )}

        <ActivitiesList
          activities={activities}
          onAddActivity={onAddActivity}
          onEditActivity={onEditActivity}
          formatTime={formatTime}
        />

        <DiningList
          reservations={[]}
          onAddReservation={() => {}}
          formatTime={formatTime}
          dayId={dayId}
        />
      </div>
    </div>
  );
};

export default DayContent;
