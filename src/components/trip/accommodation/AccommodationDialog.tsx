import { useAccommodationHandlers } from './hooks/useAccommodationHandlers';
import React, { useEffect, useState } from 'react';
import { AccommodationFormData } from '@/services/accommodation/accommodationService';
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
}

const AccommodationDialog: React.FC<AccommodationDialogProps> = ({
  tripId,
  open,
  onOpenChange,
  initialData,
  onSuccess
}) => {
  const [formData, setFormData] = useState<AccommodationFormData | undefined>(undefined);

  // Initialize or reinitialize form data when initialData changes.
  // Since dates are already in "YYYY-MM-DD" format, no additional splitting is required.
  useEffect(() => {
    if (initialData) {
      const newFormData = {
        ...initialData,
        hotel_checkin_date: initialData.hotel_checkin_date,
        hotel_checkout_date: initialData.hotel_checkout_date,
      };
      setFormData(newFormData);
    }
  }, [initialData]);

  // Reset form data when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData(undefined);
    }
  }, [open]);

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
            checkin_time: data.checkin_time,
            checkout_time: data.checkout_time,
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
            checkin_time: data.checkin_time,
            checkout_time: data.checkout_time,
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

  const handleDelete = async () => {
    try {
      if (initialData?.stay_id) {
        await useAccommodationHandlers.handleDelete(initialData.stay_id);
        onOpenChange(false);
        window.location.reload();
      }
    } catch (error) {
      console.error('Error deleting accommodation:', error);
      toast.error('Failed to delete accommodation');
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
          initialData={formData}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          onDelete={handleDelete}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AccommodationDialog;
