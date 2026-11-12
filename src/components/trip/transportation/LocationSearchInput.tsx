import React from 'react';
import { type PlaceResult } from '@/utils/googleMapsLoader';
import GooglePlacesAutocomplete from '../accommodation/GooglePlacesAutocomplete';

interface LocationSearchInputProps {
  value: string;
  onChange: (value: string, details?: PlaceResult) => void;
  placeholder?: string;
  autoFocus?: boolean;
  transportationType?: string | undefined;
}

const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
  value,
  onChange,
  placeholder = "Search for a location...",
  autoFocus,
  transportationType
}) => (
  <GooglePlacesAutocomplete
    value={value}
    // A picked place with no name falls back to its address
    onChange={(name, details) =>
      onChange(details ? details.name || details.formatted_address || '' : name, details)
    }
    autoFocus={autoFocus}
    // Airports only for flights; geocode (any address) for everything else
    searchType={transportationType === 'flight' ? 'airport' : 'geocode'}
    placeholder={placeholder}
    className="bg-white w-full max-w-full"
    wrapperClassName="space-y-2 w-full max-w-full"
    blockEnterWhenClosed={false}
  />
);

export default LocationSearchInput;
