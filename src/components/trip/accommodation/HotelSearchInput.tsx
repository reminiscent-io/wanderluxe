import React from 'react';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';

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

  return (
    <div className="space-y-2">
      <GooglePlacesAutocomplete
        value={value}
        onChange={onChange}
        placeholder="Start typing to search for hotels..."
      />
    </div>
  );
};

export default HotelSearchInput;
