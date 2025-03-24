
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import TransportationForm from './TransportationForm';

const TransportationDialog = ({ tripId, open, onOpenChange, initialData, onSuccess }) => {
  const [tripDates, setTripDates] = useState({
    arrival_date: null,
    departure_date: null
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchTripDates = async () => {
      if (!tripId) return;
      
      const { data, error } = await supabase
        .from('trips')
        .select('arrival_date, departure_date')
        .eq('trip_id', tripId)
        .single();

      if (!error && data) {
        console.log('TransportationDialog: Setting trip dates', data);
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

  const handleSubmit = async (data) => {
    try {
      if (!tripId) {
        toast.error('Trip ID is required');
        return;
      }

      const transportationData = {
        ...data,
        trip_id: tripId
      };

      let response;
      if (initialData && initialData.id) {
        // Update existing transportation
        response = await supabase
          .from('transportation_events')
          .update(transportationData)
          .eq('id', initialData.id)
          .select('*')
          .single();
      } else {
        // Insert new transportation
        response = await supabase
          .from('transportation_events')
          .insert(transportationData)
          .select('*')
          .single();
      }

      if (response.error) {
        throw response.error;
      }

      toast.success(
        initialData ? 'Transportation updated successfully' : 'Transportation added successfully'
      );
      
      if (onSuccess) {
        onSuccess(response.data);
      }
      
      queryClient.invalidateQueries(['trip']);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving transportation:', error);
      toast.error('Failed to save transportation');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white">
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
