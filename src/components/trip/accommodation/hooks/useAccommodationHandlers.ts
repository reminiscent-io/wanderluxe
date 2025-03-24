import { useState } from 'react';
import { toast } from 'sonner';
import { deleteAccommodation } from '@/services/accommodation/accommodationService';

const useAccommodationHandlers = (onAccommodationChange: () => void) => {
  const [isAddingAccommodation, setIsAddingAccommodation] = useState(false);
  const [editingStay, setEditingStay] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async (stayId: string) => {
    setIsLoading(true);
    try {
      await deleteAccommodation(stayId);
      onAccommodationChange();
      toast.success('Accommodation deleted successfully');
    } catch (error) {
      console.error('Error in delete operation:', error);
      toast.error('Error occurred while deleting, please try again');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isAddingAccommodation,
    setIsAddingAccommodation,
    editingStay,
    setEditingStay,
    isLoading,
    handleDelete
  };
};

export default useAccommodationHandlers;