
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import RestaurantReservationForm from './RestaurantReservationForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { Tables } from '@/integrations/supabase/types';

type ReservationData = Partial<Tables<'reservations'>> & Record<string, unknown>;

interface RestaurantReservationDialogProps {
  open?: boolean;              // NEW preferred
  isOpen?: boolean;            // legacy support
  onOpenChange: (open: boolean) => void;
  tripId: string;
  initialData?: ReservationData;           // NEW preferred
  editingReservation?: ReservationData;    // legacy support
  onSuccess?: () => void;
  tripArrivalDate?: string;
  tripDepartureDate?: string;
  destination?: string;        // Trip destination to bias search results
  // Legacy props from Sidebar
  title?: string;
  isSubmitting?: boolean;
  onSubmit?: (data: ReservationData) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const RestaurantReservationDialog: React.FC<RestaurantReservationDialogProps> = ({
  open,
  isOpen,
  onOpenChange,
  tripId,
  initialData,
  editingReservation,
  onSuccess,
  tripArrivalDate,
  tripDepartureDate,
  destination,
  title,
  isSubmitting: legacyIsSubmitting,
  onSubmit: legacyOnSubmit,
  onDelete: legacyOnDelete,
}) => {
  const finalOpen = open ?? isOpen ?? false;
  const finalInitialData = initialData || editingReservation;
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (data: ReservationData) => {
    // Use legacy onSubmit if provided (from Sidebar)
    if (legacyOnSubmit) {
      await legacyOnSubmit(data);
      return;
    }

    setIsSubmitting(true);
    try {
      if (finalInitialData?.id) {
        // Update existing reservation
        const { error } = await supabase
          .from('reservations')
          .update(data)
          .eq('id', finalInitialData.id)
          .eq('trip_id', tripId);
        
        if (error) throw error;
      } else {
        // Create new reservation
        const { error } = await supabase
          .from('reservations')
          .insert([{ ...data, trip_id: tripId }]);
        
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['trip'] });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      console.error('Failed to save reservation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save reservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    // Use legacy onDelete if provided (from Sidebar)
    if (legacyOnDelete) {
      await legacyOnDelete();
      return;
    }

    if (!finalInitialData?.id) return;
    
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', finalInitialData.id)
        .eq('trip_id', tripId);
      
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['trip'] });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      console.error('Failed to delete reservation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete reservation');
    }
  };

  return (
    <Dialog open={finalOpen} onOpenChange={onOpenChange}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex-shrink-0 z-40">
          <DialogTitle>{title || (finalInitialData?.id ? 'Edit Reservation' : 'Add Reservation')}</DialogTitle>
          <DialogDescription className="sr-only">
            {finalInitialData?.id ? 'Update your restaurant booking details' : 'Add a new dining reservation'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto scrollbar-none">
          <RestaurantReservationForm
            onSubmit={handleSubmit}
            isSubmitting={legacyIsSubmitting ?? isSubmitting}
            defaultValues={finalInitialData}
            onDelete={finalInitialData?.id ? handleDelete : undefined}
            onCancel={() => onOpenChange(false)}
            tripId={tripId}
            tripArrivalDate={tripArrivalDate}
            tripDepartureDate={tripDepartureDate}
            destination={destination}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RestaurantReservationDialog;
