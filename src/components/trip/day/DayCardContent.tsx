import React, { useState, useMemo } from 'react';
import ActivityDialogs from './activities/ActivityDialogs';
import { DayActivity, ActivityFormData } from '@/types/trip';
import ActivitiesList from './activities/ActivitiesList';
import { toast } from 'sonner';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

interface DayCardContentProps {
  index: number;
  title: string;
  activities: DayActivity[];
  onAddActivity: (activity: ActivityFormData) => Promise<void>;
  onEditActivity: (activity: DayActivity) => void;
  formatTime: (time?: string) => string;
  dayId: string;
  eventId: string;
  // Removed reservations, onAddReservation, onEditReservation 
  // to ensure reservations are handled only in DayCard
}

const DayCardContent: React.FC<DayCardContentProps> = ({
  index,
  title,
  activities,
  onAddActivity,
  onEditActivity,
  formatTime,
  dayId,
  eventId,
}) => {
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<DayActivity | null>(null);
  const [newActivity, setNewActivity] = useState<ActivityFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    cost: '',
    currency: 'USD'
  });
  const supabase = useSupabaseClient();

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

  // Handler for deleting an activity
  const handleDeleteActivity = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('day_activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;

      // Show success message and update activities list (parent component should handle this via requery)
      toast.success('Activity deleted successfully');
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Failed to delete activity');
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Activities */}
      <ActivitiesList
        activities={sortedActivities}
        formatTime={formatTime}
        onAddActivity={() => setIsAddingActivity(true)}
        onEditActivity={(activity) => {
          setEditingActivity(activity);
          handleEditActivityWrapper(activity);
        }}
      />

      {/* 
        Removed the reservations block from here,
        so they no longer appear under Activities.
      */}

      {/* Add / Edit Activity Dialog */}
      <ActivityDialogs
        isAddingActivity={isAddingActivity}
        setIsAddingActivity={setIsAddingActivity}
        newActivity={newActivity}
        setNewActivity={setNewActivity}
        onAddActivity={onAddActivity}
        eventId={eventId}
        editingActivity={editingActivity}
        setEditingActivity={setEditingActivity}
        onEditActivity={onEditActivity}
        onDeleteActivity={handleDeleteActivity}
      />
    </div>
  );
};

export default DayCardContent;