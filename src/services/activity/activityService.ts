
import { supabase } from '@/integrations/supabase/client';
import { ActivityFormData, DayActivity } from '@/types/trip';
import { toast } from 'sonner';

// Define the activity service
export const activityService = {
  // Add an activity to a day
  addActivity: async (formData: ActivityFormData & { day_id: string, event_id: string }) => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .insert({
          trip_id: formData.trip_id,
          day_id: formData.day_id,
          event_id: formData.event_id,
          title: formData.title,
          description: formData.description,
          start_time: formData.start_time,
          end_time: formData.end_time,
          cost: formData.cost ? Number(formData.cost) : null,
          currency: formData.currency || 'USD',
          is_paid: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in addActivity:', error);
      throw error;
    }
  },

  // Update an existing activity
  updateActivity: async (activityId: string, formData: Partial<ActivityFormData>) => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .update({
          title: formData.title,
          description: formData.description,
          start_time: formData.start_time,
          end_time: formData.end_time,
          cost: formData.cost ? Number(formData.cost) : null,
          currency: formData.currency,
        })
        .eq('id', activityId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in updateActivity:', error);
      throw error;
    }
  },

  // Delete an activity
  deleteActivity: async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error in deleteActivity:', error);
      throw error;
    }
  },

  // Mark activity as paid/unpaid
  toggleActivityPaid: async (activityId: string, isPaid: boolean) => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .update({ is_paid: isPaid })
        .eq('id', activityId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in toggleActivityPaid:', error);
      throw error;
    }
  }
};
