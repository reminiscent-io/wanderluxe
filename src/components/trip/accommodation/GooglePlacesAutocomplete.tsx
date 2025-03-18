import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (name: string, details?: google.maps.places.PlaceResult) => void;
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeGooglePlaces = async () => {
      const loaded = await loadGoogleMapsAPI();
      if (loaded) {
        setIsLoading(false);
        initializeAutocomplete();
      } else {
        console.error('Failed to load Google Maps API');
      }
    };
    initializeGooglePlaces();
  }, []);

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google) return;
    try {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
      const options: google.maps.places.AutocompleteOptions = {
        types: ['lodging'],
        fields: [
          'name', 
          'formatted_address', 
          'place_id', 
          'international_phone_number', 
          'website', 
          'formatted_phone_number'
        ]
      };
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        options
      );
      autocompleteRef.current.addListener('place_changed', () => {
        if (!autocompleteRef.current) return;
        const place = autocompleteRef.current.getPlace();
        if (place.name) {
          setInputValue(place.name);
          onChange(place.name, place);
        }
      });
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
    }
  };

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (!autocompleteRef.current) {
      onChange(newValue);
    }
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      value={inputValue}
      onChange={handleInputChange}
      className={`${className} relative z-50`}
      placeholder={placeholder}
      disabled={isLoading}
    />
  );
};

export default GooglePlacesAutocomplete;
