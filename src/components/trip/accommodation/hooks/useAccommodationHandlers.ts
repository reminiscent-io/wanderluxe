import { useState } from 'react';
import { toast } from 'sonner';
import { deleteAccommodation } from '@/services/accommodation/accommodationService';
import { Tables } from '@/integrations/supabase/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type Accommodation = Tables<'accommodations'>;

interface UseAccommodationHandlersProps {
  tripId: string;
  onAccommodationChange: () => void;
}

export const useAccommodationHandlers = ({ tripId, onAccommodationChange }: UseAccommodationHandlersProps) => {
  const queryClient = useQueryClient();
  const [isAddingAccommodation, setIsAddingAccommodation] = useState(false);
  const [editingStay, setEditingStay] = useState<(Accommodation & { stay_id: string }) | null>(null);

  const mutation = useMutation({
    mutationFn: async (stayId: string) => {
      return await deleteAccommodation(stayId);
    },
    onSuccess: () => {
      toast.success('Accommodation deleted successfully');
      // Invalidate the accommodations query for this trip
      queryClient.invalidateQueries(['accommodations', tripId]);
      // Only call onAccommodationChange if it's a function
      if (typeof onAccommodationChange === 'function') {
        onAccommodationChange();
      }
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        console.error('Error in delete operation:', error.message);
        toast.error(error.message || 'Error occurred while deleting');
      }
    }
  });

  const handleDelete = async (stayId: string) => {
    await mutation.mutateAsync(stayId);
  };

  return {
    isAddingAccommodation,
    setIsAddingAccommodation,
    editingStay,
    setEditingStay,
    isLoading: mutation.isLoading,
    handleDelete
  };
};
