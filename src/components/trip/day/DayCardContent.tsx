import React, { useState } from 'react';
import ActivityDialogs from './ActivityDialogs';
import DiningList from '../dining/DiningList';
import { DayActivity, ActivityFormData } from '@/types/trip';
import ActivitiesList from './activities/ActivitiesList';

interface DayCardContentProps {
  index: number;
  reservations?: Array<{
    id: string;
    day_id: string;
    restaurant_name: string;
    reservation_time?: string;
    number_of_people?: number;
    confirmation_number?: string;
    notes?: string;
    cost?: number;
    currency?: string;
    address?: string;
    phone_number?: string;
    website?: string;
    rating?: number;
    created_at: string;
    order_index: number;
  }>;
  title: string;
  activities: DayActivity[];
  onAddActivity: (activity: ActivityFormData) => Promise<void>;
  onEditActivity: (id: string) => void;
  formatTime: (time?: string) => string;
  dayId: string;
  eventId: string;
}

const DayCardContent: React.FC<DayCardContentProps> = ({
  index,
  title,
  activities,
  reservations,
  onAddActivity,
  onEditActivity,
  formatTime,
  dayId,
  eventId,
}) => {
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [newActivity, setNewActivity] = useState<ActivityFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    cost: '',
    currency: 'USD'
  });

  const handleEditActivityWrapper = (activity: DayActivity) => {
    // Pass the valid activity id to the parent callback.
    onEditActivity(activity.id);
  };

  return (
    <div className="p-6 space-y-4">
      <ActivitiesList
        activities={activities}
        formatTime={formatTime}
        onAddActivity={() => setIsAddingActivity(true)}
        onEditActivity={handleEditActivityWrapper}
      />

      <div className="mt-8">
        <DiningList
          reservations={reservations || []}
          formatTime={formatTime}
          dayId={dayId}
        />
      </div>

      <ActivityDialogs
        isAddingActivity={isAddingActivity}
        setIsAddingActivity={setIsAddingActivity}
        newActivity={newActivity}
        setNewActivity={setNewActivity}
        onAddActivity={onAddActivity}
        eventId={eventId}
      />
    </div>
  );
};

export default DayCardContent;
