import React from 'react';
import { type PlaceResult } from '@/utils/googleMapsLoader';
import GooglePlacesAutocomplete from '../accommodation/GooglePlacesAutocomplete';

interface RestaurantSearchInputProps {
  value: string;
  onChange: (value: string, details?: PlaceResult) => void;
  autoFocus?: boolean;
}

const RestaurantSearchInput: React.FC<RestaurantSearchInputProps> = ({
  value,
  onChange,
  autoFocus
}) => (
  <GooglePlacesAutocomplete
    value={value}
    onChange={onChange}
    autoFocus={autoFocus}
    // 'establishment' covers restaurants, bars, cafes, etc.
    searchType="establishment"
    id="restaurant"
    placeholder="Search for a restaurant..."
    className="bg-white"
    wrapperClassName="space-y-2"
    blockEnterWhenClosed={false}
  />
);

export default RestaurantSearchInput;
