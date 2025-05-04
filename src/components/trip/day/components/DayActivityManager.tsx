import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ActivityFormData, DayActivity } from '@/types/trip';
import { useQueryClient } from '@tanstack/react-query';

interface DayActivityManagerReturn {
  handleAddActivity: (activity: ActivityFormData) => Promise<void>;
  handleDeleteActivity: (id: string) => Promise<void>;
  handleEditActivity: (id: string, updatedActivity: ActivityFormData) => Promise<void>;
}

interface DayActivityManagerProps {
  id: string;
  tripId: string;
  activities: DayActivity[];
}

const DayActivityManager = ({ id, tripId, activities }: DayActivityManagerProps): DayActivityManagerReturn => {
  const queryClient = useQueryClient();

  const handleAddActivity = async (activity: ActivityFormData): Promise<void> => {
    console.log("Adding activity:", activity);
    try {
      if (!activity.title.trim()) {
        toast.error('Activity title is required');
        return Promise.reject(new Error('Activity title is required'));
      }
      const costAsNumber = activity.cost && activity.cost.trim() !== '' 
        ? parseFloat(activity.cost) 
        : null;
      const newActivity = {
        day_id: id,
        trip_id: tripId,
        title: activity.title.trim(),
        description: activity.description?.trim() || null,
        start_time: activity.start_time || null,
        end_time: activity.end_time || null,
        cost: costAsNumber,
        currency: activity.currency || 'USD',
        order_index: activities.length,
      };

      const { data, error } = await supabase
        .from('day_activities')
        .insert(newActivity)
        .select('*')
        .single();

      if (error) {
        console.error('Error saving activity:', error);
        toast.error('Failed to save activity');
        throw error;
      }
      toast.success('Activity added successfully');
      queryClient.invalidateQueries(['trip']);
      return Promise.resolve();
    } catch (error) {
      console.error('Error adding activity:', error);
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleEditActivity = async (activityId: string, updatedActivity: ActivityFormData): Promise<void> => {
    console.log("Editing activity with ID:", activityId, "and new data:", updatedActivity);
    try {
      if (!updatedActivity.title.trim()) {
        toast.error('Activity title is required');
        return Promise.reject(new Error('Activity title is required'));
      }
      const costAsNumber = updatedActivity.cost && updatedActivity.cost.trim() !== ''
        ? parseFloat(updatedActivity.cost)
        : null;

      const updatedData = {
        title: updatedActivity.title.trim(),
        description: updatedActivity.description?.trim() || null,
        start_time: updatedActivity.start_time.trim() || null,
        end_time: updatedActivity.end_time.trim() || null,
        cost: costAsNumber,
        currency: updatedActivity.currency || 'USD',
      };

      const { error } = await supabase
        .from('day_activities')
        .update(updatedData)
        .eq('id', activityId)
        .single();

      if (error) throw error;
      toast.success('Activity updated successfully');
      queryClient.invalidateQueries(['trip']);
      return Promise.resolve();
    } catch (error) {
      console.error('Error editing activity:', error);
      toast.error('Failed to update activity');
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleDeleteActivity = async (activityId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('day_activities')
        .delete()
        .eq('id', activityId);
      if (error) throw error;
      toast.success('Activity deleted successfully');
      queryClient.invalidateQueries(['trip']);
      return Promise.resolve();
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Failed to delete activity');
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return {
    handleAddActivity,
    handleDeleteActivity,
    handleEditActivity,
  };
};

export default DayActivityManager;
