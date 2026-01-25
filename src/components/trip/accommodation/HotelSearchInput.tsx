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
  locationContext?: string; // e.g., "Paris, France" to bias search results
}

const HotelSearchInput: React.FC<HotelSearchInputProps> = ({
  value,
  onChange,
  locationContext
}) => {

  return (
    <div className="space-y-2">
      <GooglePlacesAutocomplete
        value={value}
        onChange={onChange}
        placeholder="Start typing to search for hotels..."
        locationContext={locationContext}
      />
    </div>
  );
};

export default HotelSearchInput;
