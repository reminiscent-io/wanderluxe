// useAccommodationHandlers.ts
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AccommodationFormData } from '@/services/accommodation/types';

export const useAccommodationHandlers = (tripId: string, onSuccess: () => void) => {
  const [isAddingAccommodation, setIsAddingAccommodation] = useState(false);
  const [editingStay, setEditingStay] = useState<AccommodationFormData & { stay_id: string } | null>(null);

  const handleSubmit = async (formData: AccommodationFormData) => {
    try {
      const { error } = await supabase
        .from('hotel_stays')
        .insert([{ 
          ...formData,
          trip_id: tripId,
          expense_cost: formData.expense_cost ? Number(formData.expense_cost) : null
        }]);

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error saving accommodation:', error);
    }
  };

  const handleUpdate = async (stayId: string, formData: AccommodationFormData) => {
    try {
      const { error } = await supabase
        .from('hotel_stays')
        .update(formData)
        .eq('stay_id', stayId);

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error updating accommodation:', error);
    }
  };

  const handleDelete = async (stayId: string) => {
    try {
      const { error } = await supabase
        .from('hotel_stays')
        .delete()
        .eq('stay_id', stayId);

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error deleting accommodation:', error);
    }
  };

  return {
    isAddingAccommodation,
    setIsAddingAccommodation,
    editingStay,
    setEditingStay,
    handleSubmit,
    handleUpdate,
    handleDelete
  };
};
