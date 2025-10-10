
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  initialData?: any;
  onSuccess?: () => void;
  tripArrivalDate?: string;
  tripDepartureDate?: string;
}

const RestaurantReservationDialog: React.FC<RestaurantReservationDialogProps> = ({
  open,
  onOpenChange,
  tripId,
  initialData,
  onSuccess,
  tripArrivalDate,
  tripDepartureDate,
}) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (initialData?.id) {
        // Update existing reservation
        const { error } = await supabase
          .from('reservations')
          .update(data)
          .eq('id', initialData.id)
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
    if (!initialData?.id) return;
    
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', initialData.id)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{initialData?.id ? 'Edit Reservation' : 'Add Reservation'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto scrollbar-none px-1">
          <RestaurantReservationForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            defaultValues={initialData}
            onDelete={initialData?.id ? handleDelete : undefined}
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
