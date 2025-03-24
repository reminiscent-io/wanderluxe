import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import TransportationForm from './TransportationForm';
import { Tables } from '@/integrations/supabase/types';
import { useTripDates } from '@/hooks/use-trip-dates';

type TransportationEvent = Tables<'transportation_events'>;

interface TransportationDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<TransportationEvent>;
  onSuccess?: () => void;
}

const TransportationDialog: React.FC<TransportationDialogProps> = ({
  tripId,
  open,
  onOpenChange,
  initialData,
  onSuccess
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { arrivalDate, departureDate } = useTripDates(tripId);

  // This helps with debugging trip dates
  useEffect(() => {
    console.log("TransportationDialog: Setting trip dates", {
      arrival_date: arrivalDate,
      departure_date: departureDate,
    });
  }, [arrivalDate, departureDate]);

  const handleSubmit = async (data: Partial<TransportationEvent>) => {
    setIsSubmitting(true);
    try {
      // Create a new transportation event record
      const transportationData = {
        ...data,
        trip_id: tripId,
      };

      if (initialData && initialData.id) {
        // Update existing transportation
        const { error } = await supabase
          .from('transportation_events')
          .update(transportationData)
          .eq('id', initialData.id);

        if (error) throw error;
        toast.success('Transportation updated successfully');
      } else {
        // Insert new transportation
        const { error } = await supabase
          .from('transportation_events')
          .insert(transportationData);

        if (error) throw error;
        toast.success('Transportation added successfully');
      }

      if (onSuccess) {
        onSuccess();
      }
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving transportation:', error);
      toast.error('Failed to save transportation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Update Transportation' : 'Add Transportation'}</DialogTitle>
        </DialogHeader>
        <TransportationForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          tripArrivalDate={arrivalDate}
          tripDepartureDate={departureDate}
          buttonClassName="bg-earth-600 hover:bg-earth-700 text-white"
        />
      </DialogContent>
    </Dialog>
  );
};

export default TransportationDialog;