import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  addAccommodation, 
  updateAccommodation, 
  deleteAccommodation,
  AccommodationFormData 
} from '@/services/accommodation/accommodationService';

export const useAccommodationHandlers = (tripId: string, onAccommodationChange: () => void) => {
  const [isAddingAccommodation, setIsAddingAccommodation] = useState(false);
  const [editingStay, setEditingStay] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const invalidateQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['accommodations', tripId] }),
      queryClient.invalidateQueries({ queryKey: ['trip-days', tripId] })
    ]);
  };

  const handleSubmit = async (formData: AccommodationFormData) => {
    const success = await addAccommodation(tripId, formData);
    if (success) {
      setIsAddingAccommodation(false);
      await invalidateQueries();
      onAccommodationChange();
    }
  };

  const handleUpdate = async (stay_id: string, formData: AccommodationFormData) => {
    const success = await updateAccommodation(tripId, stay_id, formData);
    if (success) {
      setEditingStay(null);
      await invalidateQueries();
      onAccommodationChange();
    }
  };

  const handleDelete = async (stay: { stay_id: string }) => {
    const success = await deleteAccommodation(stay);
    if (success) {
      await invalidateQueries();
      onAccommodationChange();
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
