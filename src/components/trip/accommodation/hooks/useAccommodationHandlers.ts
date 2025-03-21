import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AccommodationFormData } from '@/types/trip';
import { addAccommodation, updateAccommodation } from '@/services/accommodation/accommodationService';
import { toast } from 'sonner';

export const useAccommodationHandlers = ({ tripId, onAccommodationChange }: { tripId: string, onAccommodationChange: () => void }) => {
  const [isAddingAccommodation, setIsAddingAccommodation] = useState(false);
  const [editingStay, setEditingStay] = useState<(AccommodationFormData & { stay_id: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData: AccommodationFormData) => {
    setIsLoading(true);
    try {
      await addAccommodation(tripId, formData);
      setIsAddingAccommodation(false);
      onAccommodationChange();
      toast.success('Accommodation added successfully');
    } catch (error) {
      console.error('Error saving accommodation:', error);
      toast.error('Failed to add accommodation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (stayId: string, formData: AccommodationFormData) => {
    setIsLoading(true);
    try {
      if (!stayId) {
        throw new Error('No stay ID provided for update');
      }
      await updateAccommodation(tripId, stayId, formData);
      setEditingStay(null);
      onAccommodationChange();
      toast.success('Accommodation updated successfully');
    } catch (error) {
      console.error('Error updating accommodation:', error);
      toast.error('Failed to update accommodation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (stayId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('accommodations')
        .delete()
        .eq('stay_id', stayId);

      if (error) throw error;
      toast.success('Accommodation deleted');
      onAccommodationChange();
    } catch (error) {
      console.error('Error deleting accommodation:', error);
      toast.error('Failed to delete accommodation');
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
    handleSubmit,
    handleUpdate,
    handleDelete
  };
};