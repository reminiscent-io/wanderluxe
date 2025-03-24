import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ActivityFormData, DayActivity } from '@/types/trip';

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
  const handleAddActivity = async (activity: ActivityFormData): Promise<void> => {
    console.log('Attempting to add activity:', activity);
    
    if (!activity.title) {
      toast.error('Title is required');
      return Promise.reject(new Error('Title is required'));
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
        order_index: activities.length
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
          order_index: activities.length
        }])
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Activity saved successfully:', data);
      toast.success('Activity added successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed to add activity');
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleDeleteActivity = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('day_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Activity deleted successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Failed to delete activity');
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  };

  // Updated edit activity function that accepts new activity data
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
        .eq('id', activityId)
        .single();

      if (error) throw error;
      toast.success('Activity updated successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('Error editing activity:', error);
      toast.error('Failed to update activity');
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
