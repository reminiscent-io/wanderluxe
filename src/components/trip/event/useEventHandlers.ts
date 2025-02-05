import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from '@/integrations/supabase/types';

type DayActivity = {
  id: string;
  title: string;
  cost?: number;
  currency?: string;
};

export const useEventHandlers = (
  id: string,
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

  const handleAddActivity = async (newActivity: { text: string; cost: string; currency: string }) => {
    if (!newActivity.text.trim()) return;

    try {
      const { data, error } = await supabase
        .from('day_activities')
        .insert([{
          day_id: id,
          title: newActivity.text.trim(),
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
    activityEdit: { text: string; cost: string; currency: string }
  ) => {
    try {
      const { error } = await supabase
        .from('day_activities')
        .update({
          title: activityEdit.text,
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
                title: activityEdit.text,
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