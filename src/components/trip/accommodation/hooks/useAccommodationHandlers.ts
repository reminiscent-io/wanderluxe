
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
      await updateAccommodation(tripId, stayId, { ...formData, stay_id: stayId });
      setEditingStay(null);
      onSuccess();
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
