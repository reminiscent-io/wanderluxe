import React, { useEffect, useRef, useState } from 'react';
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader';

interface RestaurantSearchInputProps {
  value: string;
  onChange: (restaurantName: string, placeDetails?: google.maps.places.PlaceResult) => void;
}

const RestaurantSearchInput: React.FC<RestaurantSearchInputProps> = ({
  value,
  onChange
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
          placeholder={isLoading ? "Loading..." : "Search for a restaurant..."}
          className="w-full bg-white"
          disabled={isLoading}
          autoComplete="off"
        />
      </div>
      <style jsx>{`
        .pac-container {
          z-index: 9999 !important;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          margin-top: 4px;
          background-color: white;
          pointer-events: auto;
        }
        .pac-item {
          padding: 8px 12px;
          cursor: pointer;
          font-family: inherit;
        }
        .pac-item:hover {
          background-color: #f7fafc;
        }
        .pac-item-selected {
          background-color: #edf2f7;
        }
      `}</style>
    </div>
  );
};

export default RestaurantSearchInput;
