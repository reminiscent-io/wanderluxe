import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import HotelSearchInput from './HotelSearchInput';

interface AccommodationFormProps {
  onSubmit: (data: {
    hotel: string;
    hotelDetails: string;
    hotelUrl: string;
    checkinDate: string;
    checkoutDate: string;
    expenseCost: string;
    expenseCurrency: string;
    hotelAddress?: string;
    hotelPhone?: string;
    hotelPlaceId?: string;
    hotelWebsite?: string;
  }) => void;
  onCancel: () => void;
  initialData?: {
    hotel: string;
    hotelDetails: string;
    hotelUrl: string;
    checkinDate: string;
    checkoutDate: string;
    expenseCost: string | number;
    expenseCurrency: string;
    hotelAddress?: string;
    hotelPhone?: string;
    hotelPlaceId?: string;
    hotelWebsite?: string;
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
    hotel: initialData?.hotel || '',
    hotelDetails: initialData?.hotelDetails || '',
    hotelUrl: initialData?.hotelUrl || '',
    checkinDate: initialData?.checkinDate || tripArrivalDate || '',
    checkoutDate: initialData?.checkoutDate || tripDepartureDate || '',
    expenseCost: initialData?.expenseCost ? initialData.expenseCost.toString() : '',
    expenseCurrency: initialData?.expenseCurrency || 'USD',
    hotelAddress: initialData?.hotelAddress || '',
    hotelPhone: initialData?.hotelPhone || '',
    hotelPlaceId: initialData?.hotelPlaceId || '',
    hotelWebsite: initialData?.hotelWebsite || ''
  });

  const handleHotelSelect = (hotelName: string, placeDetails?: google.maps.places.PlaceResult) => {
    setFormData(prev => ({
      ...prev,
      hotel: hotelName,
      hotelAddress: placeDetails?.formatted_address || prev.hotelAddress,
      hotelPhone: placeDetails?.formatted_phone_number || prev.hotelPhone,
      hotelPlaceId: placeDetails?.place_id || prev.hotelPlaceId,
      hotelWebsite: placeDetails?.website || prev.hotelWebsite,
      hotelUrl: placeDetails?.website || prev.hotelUrl
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <HotelSearchInput
        value={formData.hotel}
        onChange={handleHotelSelect}
      />

      {formData.hotelAddress && (
        <div>
          <Label>Address</Label>
          <p className="text-sm text-gray-600">{formData.hotelAddress}</p>
        </div>
      )}

      {formData.hotelPhone && (
        <div>
          <Label>Phone</Label>
          <p className="text-sm text-gray-600">{formData.hotelPhone}</p>
        </div>
      )}

      <div>
        <Label htmlFor="hotelDetails">Details (Optional)</Label>
        <Textarea
          id="hotelDetails"
          value={formData.hotelDetails}
          onChange={(e) => setFormData({ ...formData, hotelDetails: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="hotelUrl">URL (Optional)</Label>
        <Input
          id="hotelUrl"
          type="url"
          value={formData.hotelUrl}
          placeholder="https://..."
          onChange={(e) => setFormData({ ...formData, hotelUrl: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="checkinDate">Check-in Date *</Label>
          <Input
            id="checkinDate"
            type="date"
            value={formData.checkinDate}
            onChange={(e) => setFormData({ ...formData, checkinDate: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="checkoutDate">Check-out Date *</Label>
          <Input
            id="checkoutDate"
            type="date"
            value={formData.checkoutDate}
            onChange={(e) => setFormData({ ...formData, checkoutDate: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="expenseCost">Total Cost</Label>
          <Input
            id="expenseCost"
            type="number"
            value={formData.expenseCost}
            onChange={(e) => setFormData({ ...formData, expenseCost: e.target.value })}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="expenseCurrency">Currency</Label>
          <Input
            id="expenseCurrency"
            value={formData.expenseCurrency}
            onChange={(e) => setFormData({ ...formData, expenseCurrency: e.target.value })}
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