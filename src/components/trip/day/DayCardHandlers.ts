
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useDayCardHandlers = (id: string, onDelete: (id: string) => void) => {
  const handleUpdateTitle = async (editTitle: string) => {
    try {
      const { error } = await supabase
        .from('trip_days')
        .update({ title: editTitle })
        .eq('day_id', id);

      if (error) throw error;
      toast.success('Day title updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating day title:', error);
      toast.error('Failed to update day title');
      return false;
    }
  };

  const handleDeleteDay = async () => {
    try {
      // First, delete any associated accommodations_days records
      const { error: accommodationDaysError } = await supabase
        .from('accommodations_days')
        .delete()
        .eq('day_id', id);

      if (accommodationDaysError) throw accommodationDaysError;

      // Then delete any associated day_activities
      const { error: activitiesError } = await supabase
        .from('day_activities')
        .delete()
        .eq('day_id', id);

      if (activitiesError) throw activitiesError;

      // Finally delete the day itself
      const { error: dayError } = await supabase
        .from('trip_days')
        .delete()
        .eq('day_id', id);

      if (dayError) throw dayError;

      toast.success('Day deleted successfully');
      onDelete(id);
    } catch (error) {
      console.error('Error deleting day:', error);
      toast.error('Failed to delete day');
    }
  };

  return {
    handleUpdateTitle,
    handleDeleteDay,
  };
};
