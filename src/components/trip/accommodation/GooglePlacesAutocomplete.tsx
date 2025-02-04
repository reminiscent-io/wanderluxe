import React, { useEffect, useRef, useState } from 'react';
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
  const [inputValue, setInputValue] = useState(value);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!inputRef.current || !window.google) return;

    try {
      const options: google.maps.places.AutocompleteOptions = {
        types: ['lodging'],
        fields: ['name', 'formatted_address', 'place_id', 'international_phone_number', 'website', 'formatted_phone_number']
      };

      // Clean up previous instance if it exists
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        options
      );

      autocompleteRef.current.addListener('place_changed', () => {
        if (!autocompleteRef.current) return;
        
        const place = autocompleteRef.current.getPlace();
        console.log('Selected place:', place);
        
        if (place.name) {
          setInputValue(place.name);
          onChange(place.name, {
            ...place,
            formatted_phone_number: place.international_phone_number || place.formatted_phone_number
          });
        }
      });

      return () => {
        if (autocompleteRef.current) {
          google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
      };
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
    }
  }, [onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      value={inputValue}
      onChange={handleInputChange}
      className={className}
      placeholder={placeholder}
    />
  );
};

export default GooglePlacesAutocomplete;