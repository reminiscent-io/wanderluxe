import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tables } from '@/integrations/supabase/types';
import TransportationForm from './TransportationForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

type TransportationType = Tables<'transportation'>;

interface TransportationDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<TransportationType> | null;
  /** Now expects the saved record (optional to support different use cases) */
  onSuccess: (updated?: TransportationType) => void;
  buttonClassName?: string;
}

const TransportationDialog: React.FC<TransportationDialogProps> = ({
  tripId,
  open,
  onOpenChange,
  initialData,
  onSuccess,
  buttonClassName = "bg-earth-500 hover:bg-earth-600 text-white font-semibold",
}) => {
  const queryClient = useQueryClient();
  const [tripDates, setTripDates] = useState<{
    arrival_date: string | null;
    departure_date: string | null;
  }>({ arrival_date: null, departure_date: null });

  useEffect(() => {
    async function fetchTripDates() {
      const { data, error } = await supabase
        .from('trips')
        .select('arrival_date, departure_date')
        .eq('trip_id', tripId)
        .single();
      if (!error && data && data.arrival_date && data.departure_date) {
        setTripDates({
          arrival_date: data.arrival_date,
          departure_date: data.departure_date,
        });
      }
    }
    if (open) fetchTripDates();
  }, [tripId, open]);

  const handleSubmit = async (data: Partial<TransportationType>) => {
    try {
      const basePayload = {
        type: data.type,
        provider: data.provider,
        details: data.details,
        confirmation_number: data.confirmation_number,
        start_date: data.start_date,
        start_time: data.start_time,
        end_date: data.end_date,
        end_time: data.end_time,
        departure_location: data.departure_location,
        arrival_location: data.arrival_location,
        cost: data.cost,
        currency: data.currency,
        flight_number: data.flight_number ?? null,
        scheduled_start_time: data.scheduled_start_time ?? null,
        scheduled_end_time: data.scheduled_end_time ?? null,
      };

      let savedRecord: TransportationType;

      if (initialData?.id) {
        // Update existing
        const { data: updatedRecord, error } = await supabase
          .from('transportation')
          .update(basePayload)
          .eq('id', initialData.id)
          .select('*')
          .single();
        if (error || !updatedRecord) throw error;
        savedRecord = updatedRecord;
      } else {
        // Insert new
        const { data: inserted, error } = await supabase
          .from('transportation')
          .insert([{ trip_id: tripId, ...basePayload, created_at: new Date().toISOString() }])
          .select('*')
          .single();
        if (error || !inserted) throw error;
        savedRecord = inserted;
      }

      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['transportation', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      
      onSuccess(savedRecord);
      onOpenChange(false);
      return savedRecord; // Return the saved record so TransportationForm can use the ID for traveler saving
    } catch (err) {
      console.error('Error saving transportation:', err);
      toast.error('Failed to save transportation');
      throw err; // Re-throw so TransportationForm can handle the error
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleDelete = async () => {
    try {
      if (!initialData?.id) return;
      const { error } = await supabase
        .from('transportation')
        .delete()
        .eq('id', initialData.id);
      if (error) throw error;
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['transportation', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      
      onOpenChange(false);
    } catch (err) {
      console.error('Error deleting transportation:', err);
      toast.error('Failed to delete transportation');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {initialData ? 'Edit Transportation' : 'Add Transportation'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {initialData ? 'Update your travel details' : 'Add a new flight, train, or car journey'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto scrollbar-none">
          <TransportationForm
            initialData={initialData || undefined}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onDelete={initialData ? handleDelete : undefined}
            tripArrivalDate={tripDates.arrival_date}
            tripDepartureDate={tripDates.departure_date}
            buttonClassName={buttonClassName}
            tripId={tripId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransportationDialog;
