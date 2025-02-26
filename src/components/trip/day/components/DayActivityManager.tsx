
import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ActivityDialogs from '../ActivityDialogs';
import { ActivityFormData } from '@/types/trip';

interface DayActivityManagerProps {
  id: string;
  tripId: string;
  isAddingActivity: boolean;
  setIsAddingActivity: (value: boolean) => void;
  editingActivity: string | null;
  setEditingActivity: (value: string | null) => void;
  newActivity: ActivityFormData;
  setNewActivity: (activity: ActivityFormData) => void;
  activityEdit: ActivityFormData;
  setActivityEdit: (activity: ActivityFormData) => void;
  activitiesLength: number;
}

const DayActivityManager: React.FC<DayActivityManagerProps> = ({
  id,
  tripId,
  isAddingActivity,
  setIsAddingActivity,
  editingActivity,
  setEditingActivity,
  newActivity,
  setNewActivity,
  activityEdit,
  setActivityEdit,
  activitiesLength
}) => {
  const handleAddActivity = async () => {
    try {
      const { error } = await supabase
        .from('day_activities')
        .insert([{
          day_id: id,
          trip_id: tripId,
          title: newActivity.title,
          description: newActivity.description || '',
          start_time: newActivity.start_time,
          end_time: newActivity.end_time,
          cost: newActivity.cost ? Number(newActivity.cost) : null,
          currency: newActivity.currency,
          order_index: activitiesLength
        }]);

      if (error) throw error;

      // Clear the form and close the dialog
      setNewActivity({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        cost: '',
        currency: 'USD'
      });
      setIsAddingActivity(false);
      toast.success('Activity added successfully');
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed to add activity');
    }
  };

  return (
    <ActivityDialogs
      isAddingActivity={isAddingActivity}
      setIsAddingActivity={setIsAddingActivity}
      editingActivity={editingActivity}
      setEditingActivity={setEditingActivity}
      newActivity={newActivity}
      setNewActivity={setNewActivity}
      activityEdit={activityEdit}
      setActivityEdit={setActivityEdit}
      onAddActivity={handleAddActivity}
      onEditActivity={() => {}}
      eventId={id}
    />
  );
};

export default DayActivityManager;
