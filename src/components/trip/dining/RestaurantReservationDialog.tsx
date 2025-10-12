
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import RestaurantReservationForm from './RestaurantReservationForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface RestaurantReservationDialogProps {
  open?: boolean;              // NEW preferred
  isOpen?: boolean;            // legacy support
  onOpenChange: (open: boolean) => void;
  tripId: string;
  initialData?: any;           // NEW preferred
  editingReservation?: any;    // legacy support
  onSuccess?: () => void;
  tripArrivalDate?: string;
  tripDepartureDate?: string;
  // Legacy props from Sidebar
  title?: string;
  isSubmitting?: boolean;
  onSubmit?: (data: any) => Promise<void>;
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
  title,
  isSubmitting: legacyIsSubmitting,
  onSubmit: legacyOnSubmit,
  onDelete: legacyOnDelete,
}) => {
  const finalOpen = open ?? isOpen ?? false;
  const finalInitialData = initialData || editingReservation;
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (data: any) => {
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
        toast.success('Reservation updated');
      } else {
        // Create new reservation
        const { error } = await supabase
          .from('reservations')
          .insert([{ ...data, trip_id: tripId }]);
        
        if (error) throw error;
        toast.success('Reservation added');
      }

      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['trip'] });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to save reservation:', error);
      toast.error(error.message || 'Failed to save reservation');
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
      toast.success('Reservation deleted');
      
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['trip'] });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to delete reservation:', error);
      toast.error(error.message || 'Failed to delete reservation');
    }
  };

  return (
    <Dialog open={finalOpen} onOpenChange={onOpenChange}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{title || (finalInitialData?.id ? 'Edit Reservation' : 'Add Reservation')}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto scrollbar-none px-1">
          <RestaurantReservationForm
            onSubmit={handleSubmit}
            isSubmitting={legacyIsSubmitting ?? isSubmitting}
            defaultValues={finalInitialData}
            onDelete={finalInitialData?.id ? handleDelete : undefined}
            onCancel={() => onOpenChange(false)}
            tripId={tripId}
            tripArrivalDate={tripArrivalDate}
            tripDepartureDate={tripDepartureDate}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RestaurantReservationDialog;
