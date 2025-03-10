import React, { useEffect } from 'react';
import { Label } from "@/components/ui/label";
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';
import { loadGoogleMapsApi } from '@/utils/loadGoogleMapsApi';

declare global {
  interface Window {
    google: any;
    initGoogleMaps?: () => void;
  }
}

interface HotelSearchInputProps {
  value: string;
  onChange: (hotelName: string, placeDetails?: google.maps.places.PlaceResult) => void;
}

const HotelSearchInput: React.FC<HotelSearchInputProps> = ({
  value,
  onChange
}) => {
  useEffect(() => {
    if (!window.google) {
      loadGoogleMapsApi().catch(console.error);
    }
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor="hotel">Hotel Name *</Label>
      <GooglePlacesAutocomplete
        value={value}
        onChange={onChange}
        placeholder="Start typing to search for hotels..."
      />
    </div>
  );
};

export default HotelSearchInput;