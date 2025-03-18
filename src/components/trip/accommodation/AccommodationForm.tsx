
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import HotelSearchInput from './HotelSearchInput';
import DateInputs from './form/DateInputs';
import CostInputs from './form/CostInputs';
import HotelOptionalDetails from './form/HotelOptionalDetails';
import HotelContactInfo from './form/HotelContactInfo';
import { AccommodationFormData } from '@/services/accommodation/types';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";

interface AccommodationFormProps {
  onSubmit: (data: AccommodationFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: AccommodationFormData;
  tripArrivalDate?: string | null;
  tripDepartureDate?: string | null;
}

const AccommodationForm: React.FC<AccommodationFormProps> = ({ 
  onSubmit, 
  onCancel, 
  initialData,
  tripArrivalDate,
  tripDepartureDate
}) => {
  const initialFormState = useMemo(() => ({
    stay_id: initialData?.stay_id || '',
    hotel: initialData?.hotel || '',
    hotel_details: initialData?.hotel_details || '',
    hotel_url: initialData?.hotel_url || '',
    hotel_checkin_date: initialData?.hotel_checkin_date || tripArrivalDate || '',
    hotel_checkout_date: initialData?.hotel_checkout_date || tripDepartureDate || '',
    cost: initialData?.cost || null,
    currency: initialData?.currency || 'USD',
    hotel_address: initialData?.hotel_address || '',
    hotel_phone: initialData?.hotel_phone || '',
    hotel_place_id: initialData?.hotel_place_id || '',
    hotel_website: initialData?.hotel_website || '',
    expense_type: initialData?.expense_type || 'accommodation',
    is_paid: initialData?.is_paid || false,
    expense_date: initialData?.expense_date || '',
    order_index: initialData?.order_index || 0
  }), [initialData, tripArrivalDate, tripDepartureDate]);

  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setIsGoogleMapsLoaded] = useState(false);

  useEffect(() => {
    setFormData(initialFormState);
  }, [initialFormState]);
  
  // Google Maps is now managed by the GoogleMapsContext

  const handleHotelSelect = (hotelName: string, placeDetails?: google.maps.places.Place) => {
    setFormData(prev => ({
      ...prev,
      hotel: hotelName,
      hotel_address: placeDetails?.formattedAddress || prev.hotel_address,
      hotel_phone: placeDetails?.globalLocationNumber || prev.hotel_phone,
      hotel_place_id: placeDetails?.id || prev.hotel_place_id,
      hotel_website: placeDetails?.websiteURI || prev.hotel_website,
      hotel_url: placeDetails?.websiteURI || prev.hotel_url
    }));
  };

  // Get the button text based on form state
  const getButtonText = () => {
    if (isSubmitting) {
      return 'Saving...';
    }
    return initialData ? 'Update' : 'Add Accommodation';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (initialData && !formData.stay_id) {
      console.error('Missing stay_id for update operation');
      toast.error('Missing accommodation ID');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting accommodation:', error);
      toast.error('Failed to save accommodation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      <HotelSearchInput
        value={formData.hotel}
        onChange={handleHotelSelect}
      />

      <HotelContactInfo
        address={formData.hotel_address}
        phone={formData.hotel_phone}
      />

      <HotelOptionalDetails
        hotelDetails={formData.hotel_details}
        hotelUrl={formData.hotel_url}
        onDetailsChange={(value) => setFormData({ ...formData, hotel_details: value })}
        onUrlChange={(value) => setFormData({ ...formData, hotel_url: value })}
      />

      <DateInputs
        checkinDate={formData.hotel_checkin_date}
        checkoutDate={formData.hotel_checkout_date}
        onCheckinChange={(value) => setFormData({ ...formData, hotel_checkin_date: value })}
        onCheckoutChange={(value) => setFormData({ ...formData, hotel_checkout_date: value })}
      />

      <CostInputs
        cost={formData.cost}
        currency={formData.currency}
        onCostChange={(value) => setFormData({ ...formData, cost: value })}
        onCurrencyChange={(value) => setFormData({ ...formData, currency: value })}
      />

      <div className="flex justify-end gap-2">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          className="bg-earth-500 hover:bg-earth-600 text-white"
          disabled={isSubmitting}
        >
          {getButtonText()}
        </Button>
      </div>
    </form>
  );
};

export default AccommodationForm;
