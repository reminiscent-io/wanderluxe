import { useState } from 'react';
import { toast } from 'sonner';
import { deleteAccommodation } from '@/services/accommodation/accommodationService';
import { Tables } from '@/integrations/supabase/types';

type Accommodation = Tables<'accommodations'>;

const useAccommodationHandlers = (
  tripId: string,
  onAccommodationChange?: () => void
) => {
  const [isAddingAccommodation, setIsAddingAccommodation] = useState(false);
  const [editingStay, setEditingStay] = useState<(Accommodation & { stay_id: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Use a default no-op if onAccommodationChange isn’t a function
  const safeOnAccommodationChange = typeof onAccommodationChange === 'function'
    ? onAccommodationChange
    : () => {};

  const handleDelete = async (stayId: string) => {
    setIsLoading(true);
    try {
      await deleteAccommodation(stayId);
      safeOnAccommodationChange();
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
    handleDelete,
  };
};

export default useAccommodationHandlers;
