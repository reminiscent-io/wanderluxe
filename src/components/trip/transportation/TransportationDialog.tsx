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

type TransportationType = Tables<'transportation'>;

interface TransportationDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: TransportationType | null;
  onSuccess?: () => void;
  buttonClassName?: string;
}

const TransportationDialog: React.FC<TransportationDialogProps> = ({
  tripId,
  open,
  onOpenChange,
  initialData,
  onSuccess,
  buttonClassName = "bg-earth-500 hover:bg-earth-600 text-white font-semibold" //Added default value
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
        .eq('trip_id', tripId)
        .single();

      if (!error && data) {
        // Only update if we have valid dates
        if (data.arrival_date && data.departure_date) {
          console.log('TransportationDialog: Setting trip dates', data);
          setTripDates({
            arrival_date: data.arrival_date,
            departure_date: data.departure_date
          });
        } else {
          console.log('TransportationDialog: Skipping update - missing dates', data);
        }
      }
    };

    if (open) {
      fetchTripDates();
    }
  }, [tripId, open]);

  const handleSubmit = async (data: Partial<TransportationType>) => {
    try {
      if (initialData?.id) {
        // Update existing transportation event
        const { error } = await supabase
          .from('transportation')
          .update({
            type: data.type,
            provider: data.provider,
            details: data.details,
            confirmation_number: data.confirmation_number,
            start_date: data.start_date,
            start_time: data.start_time,
            end_date: data.end_date, // Include end_date
            end_time: data.end_time,
            departure_location: data.departure_location,
            arrival_location: data.arrival_location,
            cost: data.cost,
            currency: data.currency
          })
          .eq('id', initialData.id);

        if (error) throw error;
        toast.success('Transportation updated successfully');
      } else {
        // Create new transportation event
        const { error } = await supabase
          .from('transportation')
          .insert([{
            trip_id: tripId,
            type: data.type,
            provider: data.provider,
            details: data.details,
            confirmation_number: data.confirmation_number,
            start_date: data.start_date,
            start_time: data.start_time,
            end_date: data.end_date, // Include end_date
            end_time: data.end_time,
            departure_location: data.departure_location,
            arrival_location: data.arrival_location,
            cost: data.cost,
            currency: data.currency,
            created_at: new Date().toISOString()
          }]);

        if (error) throw error;
        toast.success('Transportation added successfully');
      }

      onSuccess?.(); // Use optional chaining
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving transportation:', error);
      toast.error('Failed to save transportation');
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto sm:max-w-[600px] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Transportation' : 'Add Transportation'}
          </DialogTitle>
        </DialogHeader>
        <TransportationForm
          initialData={initialData || undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          tripArrivalDate={tripDates?.arrival_date}
          tripDepartureDate={tripDates?.departure_date}
          buttonClassName="bg-earth-400 hover:bg-earth-600 text-white font-semibold"
        />
      </DialogContent>
    </Dialog>
  );
};

export default TransportationDialog;
