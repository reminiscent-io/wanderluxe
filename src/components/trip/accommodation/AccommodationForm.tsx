import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import HotelSearchInput from './HotelSearchInput';

interface AccommodationFormProps {
  onSubmit: (data: {
    stay_id?: string;
    hotel: string;
    hotel_details: string;
    hotel_url: string;
    hotel_checkin_date: string;
    hotel_checkout_date: string;
    expense_cost: string;
    currency: string;
    hotel_address?: string;
    hotel_phone?: string;
    hotel_place_id?: string;
    hotel_website?: string;
    expense_type?: string;
    expense_paid?: boolean;
    expense_date?: string;
    order_index?: number;
  }) => void;
  onCancel: () => void;
  initialData?: {
    stay_id?: string;
    hotel: string;
    hotel_details: string;
    hotel_url: string;
    hotel_checkin_date: string;
    hotel_checkout_date: string;
    expense_cost: string | number;
    currency: string;
    hotel_address?: string;
    hotel_phone?: string;
    hotel_place_id?: string;
    hotel_website?: string;
    expense_type?: string;
    expense_paid?: boolean;
    expense_date?: string;
    order_index?: number;
  };
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

      {formData.hotel_address && (
        <div>
          <Label>Address</Label>
          <p className="text-sm text-gray-600">{formData.hotel_address}</p>
        </div>
      )}

      {formData.hotel_phone && (
        <div>
          <Label>Phone</Label>
          <p className="text-sm text-gray-600">{formData.hotel_phone}</p>
        </div>
      )}

      <div>
        <Label htmlFor="hotel_details">Details (Optional)</Label>
        <Textarea
          id="hotel_details"
          value={formData.hotel_details}
          onChange={(e) => setFormData({ ...formData, hotel_details: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="hotel_url">URL (Optional)</Label>
        <Input
          id="hotel_url"
          type="url"
          value={formData.hotel_url}
          placeholder="https://..."
          onChange={(e) => setFormData({ ...formData, hotel_url: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="hotel_checkin_date">Check-in Date *</Label>
          <Input
            id="hotel_checkin_date"
            type="date"
            value={formData.hotel_checkin_date}
            onChange={(e) => setFormData({ ...formData, hotel_checkin_date: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="hotel_checkout_date">Check-out Date *</Label>
          <Input
            id="hotel_checkout_date"
            type="date"
            value={formData.hotel_checkout_date}
            onChange={(e) => setFormData({ ...formData, hotel_checkout_date: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="expense_cost">Total Cost</Label>
          <Input
            id="expense_cost"
            type="text"
            value={formData.expense_cost}
            onChange={(e) => setFormData({ ...formData, expense_cost: e.target.value })}
            onBlur={(e) => setFormData({ ...formData, expense_cost: formatCost(e.target.value) })}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Input
            id="currency"
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            placeholder="USD"
          />
        </div>
      </div>

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
