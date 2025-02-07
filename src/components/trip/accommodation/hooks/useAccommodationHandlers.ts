
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  addAccommodation, 
  updateAccommodation, 
  deleteAccommodation,
  AccommodationFormData 
} from '@/services/accommodation/accommodationService';
import { toast } from 'sonner';

export const useAccommodationHandlers = (tripId: string, onAccommodationChange: () => void) => {
  const [isAddingAccommodation, setIsAddingAccommodation] = useState(false);
  const [editingStay, setEditingStay] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const invalidateQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['accommodations', tripId] }),
      queryClient.invalidateQueries({ queryKey: ['trip-days', tripId] }),
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] })
    ]);
  };

  const handleSubmit = async (formData: AccommodationFormData) => {
    try {
      const success = await addAccommodation(tripId, formData);
      if (success) {
        setIsAddingAccommodation(false);
        await invalidateQueries();
        onAccommodationChange();
        toast.success('Accommodation added successfully');
      }
    } catch (error) {
      console.error('Error adding accommodation:', error);
      toast.error('Failed to add accommodation');
    }
  };

  const handleUpdate = async (stay_id: string, formData: AccommodationFormData) => {
    try {
      const success = await updateAccommodation(tripId, stay_id, formData);
      if (success) {
        setEditingStay(null);
        await invalidateQueries();
        onAccommodationChange();
        toast.success('Accommodation updated successfully');
      }
    } catch (error) {
      console.error('Error updating accommodation:', error);
      toast.error('Failed to update accommodation');
    }
  };

  const handleDelete = async (stay: { stay_id: string }) => {
    try {
      const success = await deleteAccommodation(stay);
      if (success) {
        await invalidateQueries();
        onAccommodationChange();
        toast.success('Accommodation deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting accommodation:', error);
      toast.error('Failed to delete accommodation');
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
