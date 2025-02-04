import React from 'react';
import { Label } from "@/components/ui/label";
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';
import HotelDetails from './HotelDetails';

interface HotelSearchInputProps {
  value: string;
  onChange: (hotelName: string, placeDetails?: google.maps.places.PlaceResult) => void;
}

const HotelSearchInput: React.FC<HotelSearchInputProps> = ({
  value,
  onChange
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="hotel">Hotel Name *</Label>
        <GooglePlacesAutocomplete
          value={value}
          onChange={onChange}
          className="mt-1"
        />
      </div>
    </div>
  );
};

export default HotelSearchInput;