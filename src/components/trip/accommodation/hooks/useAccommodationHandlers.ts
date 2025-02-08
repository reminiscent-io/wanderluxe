
// useAccommodationHandlers.ts
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AccommodationFormData, HotelStay } from '@/services/accommodation/types';

export const useAccommodationHandlers = (tripId: string, onSuccess: () => void) => {
  const [isAddingAccommodation, setIsAddingAccommodation] = useState(false);
  const [editingStay, setEditingStay] = useState<(AccommodationFormData & { stay_id: string }) | null>(null);

  const handleSubmit = async (formData: AccommodationFormData) => {
    try {
      await addAccommodation(tripId, formData);
      onSuccess();
    } catch (error) {
      console.error('Error saving accommodation:', error);
    }
  };

  const handleUpdate = async (stayId: string, formData: AccommodationFormData) => {
    try {
      await updateAccommodation(tripId, stayId, { ...formData, stay_id: stayId });
      onSuccess();
      setEditingStay(null); // Clear editing state after successful update
    } catch (error) {
      console.error('Error updating accommodation:', error);
    }
  };

  const handleDelete = async (stay: HotelStay) => {
    try {
      await deleteAccommodation(stay);
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
