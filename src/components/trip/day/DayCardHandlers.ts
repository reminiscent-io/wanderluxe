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
      const { error } = await supabase
        .from('trip_days')
        .delete()
        .eq('day_id', id);

      if (error) throw error;
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
