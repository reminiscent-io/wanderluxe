import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ActivityFormData, DayActivity } from '@/types/trip';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface DayActivityManagerProps {
  id: string;
  tripId: string;
  activities: DayActivity[];
}

const DayActivityManager = ({ id, tripId, activities }: DayActivityManagerProps) => {
  const queryClient = useQueryClient();

  const handleAddActivity = async (activity: ActivityFormData): Promise<void> => {
    try {
      const { error } = await supabase
        .from('day_activities')
        .insert({
          trip_id: tripId,
          day_id: id,
          title: activity.title,
          description: activity.description,
          start_time: activity.start_time || null,
          end_time: activity.end_time || null,
          cost: activity.cost ? Number(activity.cost) : null,
          currency: activity.currency,
          order_index: activities.length
        });

      if (error) throw error;
      queryClient.invalidateQueries(['trip']);
      toast.success('Activity added successfully');
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed to add activity');
      throw error;
    }
  };

  const handleDeleteActivity = async (activityId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('day_activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;
      queryClient.invalidateQueries(['trip']);
      toast.success('Activity deleted successfully');
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Failed to delete activity');
      throw error;
    }
  };

  const handleEditActivity = async (activityId: string, updatedActivity: ActivityFormData): Promise<void> => {
    console.log('Editing activity with ID:', activityId, 'and new data:', updatedActivity);
    try {
      const { error } = await supabase
        .from('day_activities')
        .update({
          title: updatedActivity.title,
          description: updatedActivity.description,
          start_time: updatedActivity.start_time || null,
          end_time: updatedActivity.end_time || null,
          cost: updatedActivity.cost ? Number(updatedActivity.cost) : null,
          currency: updatedActivity.currency,
        })
        .eq('id', activityId);

      if (error) throw error;
      queryClient.invalidateQueries(['trip']);
      toast.success('Activity updated successfully');
    } catch (error) {
      console.error('Error editing activity:', error);
      toast.error('Failed to update activity');
      throw error;
    }
  };

  return {
    handleAddActivity,
    handleDeleteActivity,
    handleEditActivity,
  };
};

export default DayActivityManager;