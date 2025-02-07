
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import HotelSearchInput from './HotelSearchInput';
import DateInputs from './form/DateInputs';
import CostInputs from './form/CostInputs';
import HotelOptionalDetails from './form/HotelOptionalDetails';
import HotelContactInfo from './form/HotelContactInfo';
import { AccommodationFormData } from '@/services/accommodation/types';

interface AccommodationFormProps {
  onSubmit: (data: AccommodationFormData) => void;
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
  const [formData, setFormData] = useState({
    stay_id: initialData?.stay_id || undefined,
    hotel: initialData?.hotel || '',
    hotel_details: initialData?.hotel_details || '',
    hotel_url: initialData?.hotel_url || '',
    hotel_checkin_date: initialData?.hotel_checkin_date || tripArrivalDate || '',
    hotel_checkout_date: initialData?.hotel_checkout_date || tripDepartureDate || '',
    expense_cost: initialData?.expense_cost ? typeof initialData.expense_cost === 'string' ? initialData.expense_cost : initialData.expense_cost.toFixed(2) : '',
    currency: initialData?.currency || 'USD',
    hotel_address: initialData?.hotel_address || '',
    hotel_phone: initialData?.hotel_phone || '',
    hotel_place_id: initialData?.hotel_place_id || '',
    hotel_website: initialData?.hotel_website || '',
    expense_type: initialData?.expense_type || 'accommodation',
    expense_paid: initialData?.expense_paid || false,
    expense_date: initialData?.expense_date || '',
    order_index: initialData?.order_index || 0
  });

  const handleHotelSelect = (hotelName: string, placeDetails?: google.maps.places.PlaceResult) => {
    setFormData(prev => ({
      ...prev,
      hotel: hotelName,
      hotel_address: placeDetails?.formatted_address || prev.hotel_address,
      hotel_phone: placeDetails?.formatted_phone_number || prev.hotel_phone,
      hotel_place_id: placeDetails?.place_id || prev.hotel_place_id,
      hotel_website: placeDetails?.website || prev.hotel_website,
      hotel_url: placeDetails?.website || prev.hotel_url
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const formatCost = (value: string) => {
    const numericValue = value.replace(/[^\d.]/g, '');
    const parts = numericValue.split('.');
    const formattedValue = parts[0] + (parts.length > 1 ? '.' + parts[1].slice(0, 2) : '');
    
    const number = parseFloat(formattedValue);
    if (!isNaN(number)) {
      return number.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    return formattedValue;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        expenseCost={formData.expense_cost}
        currency={formData.currency}
        onCostChange={(value) => setFormData({ ...formData, expense_cost: value })}
        onCurrencyChange={(value) => setFormData({ ...formData, currency: value })}
        formatCost={formatCost}
      />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-earth-500 hover:bg-earth-600 text-white">
          {initialData ? 'Update' : 'Add Accommodation'}
        </Button>
      </div>
    </form>
  );
};

export default AccommodationForm;
