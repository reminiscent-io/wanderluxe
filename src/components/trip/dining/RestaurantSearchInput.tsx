import React, { useEffect, useRef, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RestaurantDetails {
  name: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  place_id: string;
  rating?: number;
}

interface RestaurantSearchInputProps {
  onPlaceSelect: (place: RestaurantDetails) => void;
  defaultValue?: string;
}

const RestaurantSearchInput: React.FC<RestaurantSearchInputProps> = ({
  onPlaceSelect,
  defaultValue = ''
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);
  const autoCompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!inputRef.current || !window.google) return;

    const options: google.maps.places.AutocompleteOptions = {
      types: ['restaurant'],
      fields: ['name', 'place_id', 'formatted_address', 'formatted_phone_number', 'website', 'rating']
    };

    autoCompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      options
    );

    autoCompleteRef.current.addListener('place_changed', () => {
      if (!autoCompleteRef.current) return;

      const place = autoCompleteRef.current.getPlace();
      if (!place.place_id) return;

      onPlaceSelect({
        name: place.name || '',
        place_id: place.place_id,
        formatted_address: place.formatted_address,
        formatted_phone_number: place.formatted_phone_number,
        website: place.website,
        rating: place.rating
      });
    });

    return () => {
      if (autoCompleteRef.current) {
        google.maps.event.clearInstanceListeners(autoCompleteRef.current);
      }
    };
  }, [onPlaceSelect]);

  return (
    <div className="space-y-2">
      <Label htmlFor="restaurant">Restaurant Name</Label>
      <Input
        ref={inputRef}
        type="text"
        id="restaurant"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Search for a restaurant..."
        className="w-full"
      />
    </div>
  );
};

export default RestaurantSearchInput;