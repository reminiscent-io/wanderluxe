import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tables } from '@/integrations/supabase/types';
import AccommodationForm from './AccommodationForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Accommodation = Tables<'accommodations'>;

interface AccommodationDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Accommodation;
  onSuccess: () => void;
  checkin_time?: string | null;
  checkout_time?: string | null;
}

const AccommodationDialog: React.FC<AccommodationDialogProps> = ({
  tripId,
  open,
  onOpenChange,
  initialData,
  onSuccess,
  checkin_time,
  checkout_time
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
        if (data.arrival_date && data.departure_date) {
          console.log('AccommodationDialog: Setting trip dates', data);
          setTripDates({
            arrival_date: data.arrival_date,
            departure_date: data.departure_date
          });
        } else {
          console.log('AccommodationDialog: Skipping update - missing dates', data);
        }
      }
    };

    if (open) {
      fetchTripDates();
    }
  }, [tripId, open]);

  const handleSubmit = async (data: any) => {
    try {
      if (initialData?.stay_id) {
        // Update existing accommodation
        const { error } = await supabase
          .from('accommodations')
          .update({
            hotel: data.hotel,
            hotel_details: data.hotel_details,
            hotel_url: data.hotel_url,
            hotel_checkin_date: data.hotel_checkin_date,
            hotel_checkout_date: data.hotel_checkout_date,
            cost: data.cost,
            currency: data.currency,
            hotel_address: data.hotel_address,
            hotel_phone: data.hotel_phone,
            hotel_place_id: data.hotel_place_id,
            hotel_website: data.hotel_website,
          })
          .eq('stay_id', initialData.stay_id);

        if (error) throw error;
        toast.success('Accommodation updated successfully');
      } else {
        // Create new accommodation
        const { error } = await supabase
          .from('accommodations')
          .insert([{
            trip_id: tripId,
            title: data.hotel || 'Unnamed Accommodation', // Ensure title is set
            hotel: data.hotel,
            hotel_details: data.hotel_details,
            hotel_url: data.hotel_url,
            hotel_checkin_date: data.hotel_checkin_date,
            hotel_checkout_date: data.hotel_checkout_date,
            cost: data.cost,
            currency: data.currency,
            hotel_address: data.hotel_address,
            hotel_phone: data.hotel_phone,
            hotel_place_id: data.hotel_place_id,
            hotel_website: data.hotel_website,
            order_index: 0,
            expense_type: 'accommodation',
            created_at: new Date().toISOString()
          }]);

        if (error) throw error;
        toast.success('Accommodation added successfully');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving accommodation:', error);
      toast.error('Failed to save accommodation');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        className="sm:max-w-[600px]"
      >
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Accommodation' : 'Add Accommodation'}
          </DialogTitle>
        </DialogHeader>
        <AccommodationForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          tripArrivalDate={tripDates.arrival_date}
          tripDepartureDate={tripDates.departure_date}
          checkin_time={checkin_time}
          checkout_time={checkout_time}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AccommodationDialog;