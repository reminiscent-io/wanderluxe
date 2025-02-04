import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tables } from '@/integrations/supabase/types';
import TransportationForm from './TransportationForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type TransportationEvent = Tables<'transportation_events'>;

interface TransportationDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: TransportationEvent;
  onSuccess: () => void;
}

const TransportationDialog: React.FC<TransportationDialogProps> = ({
  tripId,
  open,
  onOpenChange,
  initialData,
  onSuccess
}) => {
  const [tripDates, setTripDates] = useState<{ arrival_date: string | null; departure_date: string | null }>({
    arrival_date: null,
    departure_date: null
  });

  useEffect(() => {
    const fetchTripDates = async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('arrival_date, departure_date')
        .eq('id', tripId)
        .single();

      if (!error && data) {
        setTripDates({
          arrival_date: data.arrival_date,
          departure_date: data.departure_date
        });
      }
    };

    if (open) {
      fetchTripDates();
    }
  }, [tripId, open]);

  const handleSubmit = async (data: Partial<TransportationEvent>) => {
    try {
      if (initialData?.id) {
        // Update existing transportation event
        const { error } = await supabase
          .from('transportation_events')
          .update({
            ...data,
            start_date: data.start_date,
            type: data.type
          })
          .eq('id', initialData.id);

        if (error) throw error;
        toast.success('Transportation updated successfully');
      } else {
        // Create new transportation event
        const { error } = await supabase
          .from('transportation_events')
          .insert([{
            ...data,
            trip_id: tripId,
            start_date: data.start_date,
            type: data.type
          }]);

        if (error) throw error;
        toast.success('Transportation added successfully');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving transportation:', error);
      toast.error('Failed to save transportation');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Transportation' : 'Add Transportation'}
          </DialogTitle>
        </DialogHeader>
        <TransportationForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          tripArrivalDate={tripDates.arrival_date}
          tripDepartureDate={tripDates.departure_date}
        />
      </DialogContent>
    </Dialog>
  );
};

export default TransportationDialog;