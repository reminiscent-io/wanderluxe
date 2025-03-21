import React, { useEffect, useRef, useState } from 'react';
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader';

interface RestaurantSearchInputProps {
  value: string;
  onChange: (value: string, details?: google.maps.places.PlaceResult) => void;
  autoFocus?: boolean;
}

const RestaurantSearchInput: React.FC<RestaurantSearchInputProps> = ({
  value,
  onChange,
  autoFocus
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const autoCompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadAPI = async () => {
      const loaded = await loadGoogleMapsAPI();
      if (loaded) {
        setIsLoading(false);
        initializeAutocomplete();
      } else {
        setIsLoading(false);
        toast('Failed to initialize restaurant search', { variant: 'error' });
      }
    };
    loadAPI();
  }, []);

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google) return;
    try {
      if (autoCompleteRef.current) {
        google.maps.event.clearInstanceListeners(autoCompleteRef.current);
      }
      const options: google.maps.places.AutocompleteOptions = {
        fields: [
          'name', 
          'place_id', 
          'formatted_address', 
          'formatted_phone_number', 
          'website', 
          'rating'
        ],
        types: ['restaurant', 'food']
      };
      autoCompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, options);
      autoCompleteRef.current.addListener('place_changed', () => {
        if (!autoCompleteRef.current) return;
        const place = autoCompleteRef.current.getPlace();
        if (!place?.name) {
          toast('Please select a valid restaurant from the dropdown', { variant: 'error' });
          return;
        }
        onChange(place.name, place);
      });
    } catch (error) {
      console.error('Error initializing autocomplete:', error);
      toast('Failed to initialize restaurant search', { variant: 'error' });
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          id="restaurant"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
          placeholder={isLoading ? "Loading..." : "Search for a restaurant..."}
          className="bg-white"
          disabled={isLoading}
          autoFocus={autoFocus}
          autoComplete="off"
        />
      </div>
    </div>
  );
};

export default RestaurantSearchInput;
