
import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ActivityFormData, DayActivity } from '@/types/trip';

// Define the return type of the component to fix type errors
interface DayActivityManagerReturn {
  handleAddActivity: (activity: ActivityFormData) => Promise<void>;
  handleDeleteActivity: (id: string) => Promise<void>;
  handleEditActivity: (id: string) => Promise<void>;
}

// Props needed for the DayActivityManager
interface DayActivityManagerProps {
  id: string;
  tripId: string;
  activities: DayActivity[];
}

// Update the component to return an object with the required functions
const DayActivityManager = ({ id, tripId, activities }: DayActivityManagerProps): DayActivityManagerReturn => {
  // This function is called when the form is submitted
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
      return Promise.reject(error);
    }
  };

  // Add delete activity functionality
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
      return Promise.reject(error);
    }
  };

  // Add edit activity functionality (placeholder for now)
  const handleEditActivity = async (id: string): Promise<void> => {
    // Implementation will be added later
    console.log('Edit activity with ID:', id);
    return Promise.resolve();
  };

  return {
    handleAddActivity,
    handleDeleteActivity,
    handleEditActivity,
  };
};

export default DayActivityManager;
