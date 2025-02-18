
import { useState } from 'react';
import type { AccommodationFormData } from '@/types/trip';
import { addAccommodation, updateAccommodation, deleteAccommodation } from '@/services/accommodation/accommodationService';
import { toast } from 'sonner';

export const useAccommodationHandlers = (tripId: string, onSuccess: () => void) => {
  const [isAddingAccommodation, setIsAddingAccommodation] = useState(false);
  const [editingStay, setEditingStay] = useState<(AccommodationFormData & { stay_id: string }) | null>(null);

  const handleSubmit = async (formData: AccommodationFormData) => {
    try {
      console.log('Submitting accommodation data:', formData);
      await addAccommodation(tripId, formData);
      setIsAddingAccommodation(false);
      await onSuccess();
      toast.success('Accommodation added successfully');
    } catch (error) {
      console.error('Error saving accommodation:', error);
      toast.error('Failed to add accommodation');
      throw error; // Re-throw to be handled by the form
    }
  };

  const handleUpdate = async (stayId: string, formData: AccommodationFormData) => {
    try {
      console.log('Updating accommodation:', { stayId, formData });
      if (!stayId) {
        throw new Error('No stay ID provided for update');
      }
      await updateAccommodation(tripId, stayId, formData);
      setEditingStay(null);
      await onSuccess();
      toast.success('Accommodation updated successfully');
    } catch (error) {
      console.error('Error updating accommodation:', error);
      toast.error('Failed to update accommodation');
      throw error;
    }
  };

  const handleDelete = async (stayId: string) => {
    try {
      console.log('Deleting accommodation:', stayId);
      await deleteAccommodation(stayId);
      await onSuccess();
      toast.success('Accommodation deleted successfully');
    } catch (error) {
      console.error('Error deleting accommodation:', error);
      toast.error('Failed to delete accommodation');
      throw error;
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
