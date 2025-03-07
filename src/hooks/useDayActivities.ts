
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ActivityFormData, DayActivity } from '@/types/trip';

export const DayActivityManager = (
  dayId: string,
  tripId: string,
  activities: DayActivity[]
) => {
  // Add activity functionality
  const handleAddActivity = async (activity: ActivityFormData): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('day_activities')
        .insert([{
          day_id: dayId,
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

      if (error) throw error;
      
      toast.success('Activity added successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed to add activity');
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  };

  // Delete activity functionality
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

  // Update activity functionality
  const handleEditActivity = async (id: string, updatedData?: ActivityFormData): Promise<void> => {
    try {
      if (!updatedData) {
        return Promise.resolve();
      }
      
      const { error } = await supabase
        .from('day_activities')
        .update({
          title: updatedData.title,
          description: updatedData.description || '',
          start_time: updatedData.start_time || null,
          end_time: updatedData.end_time || null,
          cost: updatedData.cost ? Number(updatedData.cost) : null,
          currency: updatedData.currency
        })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Activity updated successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('Error updating activity:', error);
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
