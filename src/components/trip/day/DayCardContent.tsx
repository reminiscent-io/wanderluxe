
import React, { useState } from 'react';
import ActivityDialogs from './ActivityDialogs';
import DiningList from '../DiningList';
import { DayActivity } from '@/types/trip';
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
  onAddActivity: () => void;
  onEditActivity: (id: string) => void;
  formatTime: (time?: string) => string;
  dayId: string;
  eventId: string;
}

interface ActivityState {
  title: string;
  description?: string;  // Made optional
  start_time?: string;   // Made optional
  end_time?: string;     // Made optional
  cost: string;
  currency: string;
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
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState<ActivityState>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    cost: '',
    currency: 'USD'
  });
  const [activityEdit, setActivityEdit] = useState<ActivityState>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    cost: '',
    currency: 'USD'
  });

  const handleEditActivity = (activity: DayActivity) => {
    setEditingActivity(activity.id);
    setActivityEdit({
      title: activity.title,
      description: activity.description || '',
      start_time: activity.start_time || '',
      end_time: activity.end_time || '',
      cost: activity.cost?.toString() || '',
      currency: activity.currency || 'USD'
    });
  };

  return (
    <div className="p-6 space-y-4">
      <ActivitiesList
        activities={activities}
        formatTime={formatTime}
        onAddActivity={() => setIsAddingActivity(true)}
        onEditActivity={handleEditActivity}
      />

      <div className="mt-8">
        <DiningList
          reservations={reservations || []}
          formatTime={formatTime}
          dayId={dayId}
          onAddReservation={() => {}}
        />
      </div>

      <ActivityDialogs
        isAddingActivity={isAddingActivity}
        setIsAddingActivity={setIsAddingActivity}
        editingActivity={editingActivity}
        setEditingActivity={setEditingActivity}
        newActivity={newActivity}
        setNewActivity={setNewActivity}
        activityEdit={activityEdit}
        setActivityEdit={setActivityEdit}
        onAddActivity={onAddActivity}
        onEditActivity={onEditActivity}
        eventId={eventId}
      />
    </div>
  );
};

export default DayCardContent;
