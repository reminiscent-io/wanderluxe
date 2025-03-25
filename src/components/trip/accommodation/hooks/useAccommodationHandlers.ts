
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteAccommodation } from '@/services/accommodation/accommodationService';
import { Tables } from '@/integrations/supabase/types';

type Accommodation = Tables<'accommodations'>;

interface UseAccommodationHandlersProps {
  onAccommodationChange: () => void;
}

export const useAccommodationHandlers = ({ onAccommodationChange }: UseAccommodationHandlersProps) => {
  const [isAddingAccommodation, setIsAddingAccommodation] = useState(false);
  const [editingStay, setEditingStay] = useState<(Accommodation & { stay_id: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async (stayId: string) => {
    setIsLoading(true);
    try {
      await deleteAccommodation(stayId);
      toast.success('Accommodation deleted successfully');
      // Call change handler after success message
      await onAccommodationChange();
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error in delete operation:', error.message);
        toast.error(error.message || 'Error occurred while deleting');
      }
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
