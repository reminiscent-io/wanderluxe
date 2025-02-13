
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DayActivity, ActivityFormData } from '@/types/trip';

export const useEventHandlers = (
  id: string,
  tripId: string,
  onEdit: (id: string, data: any) => void,
  editData: any,
  activities: DayActivity[]
) => {
  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    onEdit(id, {
      ...editData,
      expense_cost: editData.expense_cost ? Number(editData.expense_cost) : null,
    });
  };

  const handleAddActivity = async (newActivity: ActivityFormData) => {
    if (!newActivity.title.trim()) return false;

    try {
      const { data, error } = await supabase
        .from('day_activities')
        .insert([{
          day_id: id,
          trip_id: tripId,
          title: newActivity.title.trim(),
          cost: newActivity.cost ? Number(newActivity.cost) : null,
          currency: newActivity.currency,
          order_index: activities.length
        }])
        .select()
        .single();

      if (error) throw error;

      onEdit(id, {
        ...editData,
        day_activities: [...activities, data]
      });

      toast.success("Activity added successfully");
      return true;
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error("Failed to add activity");
      return false;
    }
  };

  const handleEditActivity = async (
    activityId: string,
    activityEdit: ActivityFormData
  ) => {
    try {
      const { error } = await supabase
        .from('day_activities')
        .update({
          title: activityEdit.title,
          cost: activityEdit.cost ? Number(activityEdit.cost) : null,
          currency: activityEdit.currency
        })
        .eq('id', activityId);

      if (error) throw error;

      onEdit(id, {
        ...editData,
        day_activities: activities.map(a => 
          a.id === activityId 
            ? { 
                ...a, 
                title: activityEdit.title,
                cost: activityEdit.cost ? Number(activityEdit.cost) : null,
                currency: activityEdit.currency
              }
            : a
        )
      });

      toast.success("Activity updated successfully");
      return true;
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error("Failed to update activity");
      return false;
    }
  };

  return {
    handleEdit,
    handleAddActivity,
    handleEditActivity,
  };
};
