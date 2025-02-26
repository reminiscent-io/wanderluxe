
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
  // This function is called when the form is submitted
  const handleAddActivity = async (activity: ActivityFormData): Promise<void> => {
    console.log('Attempting to add activity:', activity);
    
    if (!activity.title) {
      toast.error('Title is required');
      return;
    }

    try {
      console.log('Inserting activity into database:', {
        day_id: id,
        trip_id: tripId,
        title: activity.title,
        description: activity.description || '',
        start_time: activity.start_time || null,
        end_time: activity.end_time || null,
        cost: activity.cost ? Number(activity.cost) : null,
        currency: activity.currency,
        order_index: activitiesLength
      });

      const { data, error } = await supabase
        .from('day_activities')
        .insert([{
          day_id: id,
          trip_id: tripId,
          title: activity.title,
          description: activity.description || '',
          start_time: activity.start_time || null,
          end_time: activity.end_time || null,
          cost: activity.cost ? Number(activity.cost) : null,
          currency: activity.currency,
          order_index: activitiesLength
        }])
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Activity saved successfully:', data);

      // Only clear the form and close the dialog if the insert was successful
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
