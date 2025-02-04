import React, { useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (
    name: string, 
    details: google.maps.places.PlaceResult
  ) => void;
  className?: string;
  placeholder?: string;
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  value,
  onChange,
  className,
  placeholder = "Search for hotels..."
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!inputRef.current || !window.google) return;

    try {
      const options: google.maps.places.AutocompleteOptions = {
        types: ['lodging'],
        fields: ['name', 'formatted_address', 'place_id', 'international_phone_number', 'website']
      };

      const autocompleteInstance = new window.google.maps.places.Autocomplete(
        inputRef.current,
        options
      );

      autocompleteInstance.addListener('place_changed', () => {
        const place = autocompleteInstance.getPlace();
        if (place.name) {
          onChange(place.name, {
            ...place,
            formatted_phone_number: place.international_phone_number || place.formatted_phone_number
          });
        }
      });

      return () => {
        google.maps.event.clearInstanceListeners(autocompleteInstance);
      };
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
    }
  }, [onChange]);

  return (
    <Input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => e.target.value}
      className={className}
      placeholder={placeholder}
    />
  );
};

export default GooglePlacesAutocomplete;