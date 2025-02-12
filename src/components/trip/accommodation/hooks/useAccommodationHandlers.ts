
import { useState } from 'react';
import type { AccommodationFormData, HotelStay } from '@/services/accommodation/types';
import { addAccommodation, updateAccommodation, deleteAccommodation } from '@/services/accommodation/accommodationService';

export const useAccommodationHandlers = (tripId: string, onSuccess: () => void) => {
  const [isAddingAccommodation, setIsAddingAccommodation] = useState(false);
  const [editingStay, setEditingStay] = useState<(AccommodationFormData & { stay_id: string }) | null>(null);

  const handleSubmit = async (formData: AccommodationFormData) => {
    try {
      await addAccommodation(tripId, formData);
      setIsAddingAccommodation(false);
      onSuccess();
    } catch (error) {
      console.error('Error saving accommodation:', error);
    }
  };

  const handleUpdate = async (stayId: string, formData: AccommodationFormData) => {
    try {
      if (!stayId) {
        console.error('No stay ID provided for update');
        return;
      }
      await updateAccommodation(tripId, stayId, formData);
      setEditingStay(null);
      onSuccess();
    } catch (error) {
      console.error('Error updating accommodation:', error);
    }
  };

  const handleDelete = async (stayId: string) => {
    try {
      await deleteAccommodation(stayId);
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
