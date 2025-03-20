import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import ActivityDialogs from './ActivityDialogs';
import DiningList from '../dining/DiningList';
import { DayActivity, ActivityFormData } from '@/types/trip';
import ActivitiesList from './activities/ActivitiesList';
import { toast } from 'sonner';

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
  onEditActivity: (activity: DayActivity) => void;
  formatTime: (time?: string) => string;
  dayId: string;
  eventId: string;
  onAddReservation?: () => void;
  onEditReservation?: (reservation: any) => void;
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
  onAddReservation,
  onEditReservation,
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

  // Sort activities by start_time if present; else by created_at
  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => {
      const aTime = a.start_time && a.start_time.trim() !== '' ? a.start_time : null;
      const bTime = b.start_time && b.start_time.trim() !== '' ? b.start_time : null;
      if (aTime && bTime) {
        return aTime.localeCompare(bTime);
      } else if (aTime && !bTime) {
        return -1;
      } else if (!aTime && bTime) {
        return 1;
      } else {
        // Both times missing: sort by creation time
        return a.created_at.localeCompare(b.created_at);
      }
    });
  }, [activities]);

  const handleEditActivityWrapper = (activity: DayActivity) => {
    if (!activity.id) {
      console.error("Activity id is missing in DayCardContent", activity);
      toast.error("This activity hasn't been saved yet. Please save it before editing.");
      return;
    }
    console.log("DayCardContent: Editing activity with id", activity.id);
    onEditActivity(activity);
  };

  return (
    <div className="p-6 space-y-4">
      <ActivitiesList
        activities={sortedActivities}
        formatTime={formatTime}
        onAddActivity={() => setIsAddingActivity(true)}
        onEditActivity={handleEditActivityWrapper}
      />

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          {onAddReservation && (
            <Button
              onClick={() => onAddReservation?.()}
              variant="ghost"
              size="sm"
              className="text-earth-600 hover:text-earth-700 hover:bg-earth-50"
            >
              <span className="h-4 w-4 mr-2">+</span>
              Add Reservation
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {(reservations || []).map((reservation) => (
            <div
              key={reservation.id}
              className="flex justify-between items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
              onClick={() => onEditReservation?.(reservation)}
            >
              <div>
                <h4 className="font-medium text-sm">{reservation.restaurant_name}</h4>
                {reservation.reservation_time && (
                  <p className="text-xs text-gray-500">
                    {formatTime(reservation.reservation_time)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
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
