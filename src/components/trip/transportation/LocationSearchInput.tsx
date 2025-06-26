import React, { useEffect, useRef, useState } from 'react';
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader';

interface LocationSearchInputProps {
  value: string;
  onChange: (value: string, details?: google.maps.places.PlaceResult) => void;
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
        toast.error('Failed to initialize location search');
      }
    };
    loadAPI();
  }, []);

  // Reinitialize autocomplete when transportation type changes
  useEffect(() => {
    if (!isLoading && window.google) {
      initializeAutocomplete();
    }
  }, [transportationType, isLoading]);

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google) return;
    
    try {
      if (autoCompleteRef.current) {
        google.maps.event.clearInstanceListeners(autoCompleteRef.current);
      }

      // Configure autocomplete options based on transportation type
      const options: google.maps.places.AutocompleteOptions = {
        fields: [
          'name', 
          'place_id', 
          'formatted_address', 
          'geometry',
          'types'
        ]
      };

      // For flights, prioritize airports
      if (transportationType === 'flight') {
        options.types = ['airport'];
      } else {
        // For other transportation, use geocode which includes addresses and general places
        // Note: 'establishment' cannot be mixed with other types per Google Places API
        options.types = ['geocode'];
      }

      autoCompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, options);
      
      autoCompleteRef.current.addListener('place_changed', () => {
        if (!autoCompleteRef.current) return;
        
        try {
          const place = autoCompleteRef.current.getPlace();
          
          console.log('LocationSearchInput - place_changed event:', place);
          
          if (!place?.name && !place?.formatted_address) {
            console.log('LocationSearchInput - No valid place found');
            return;
          }

          // For airports, try to extract airport code or use name
          let displayValue = place.name || place.formatted_address || '';
          
          if (transportationType === 'flight' && place.name) {
            // Check if the name contains an airport code in parentheses
            const airportCodeMatch = place.name.match(/\(([A-Z]{3})\)/);
            if (airportCodeMatch) {
              displayValue = `${place.name}`;
            } else {
              displayValue = place.name;
            }
          }
          
          console.log('LocationSearchInput - Calling onChange with:', displayValue, place);
          onChange(displayValue, place);
          
          // Force the input to update with the selected value
          if (inputRef.current) {
            inputRef.current.value = displayValue;
          }
        } catch (error) {
          console.error('LocationSearchInput - Error in place_changed handler:', error);
          toast.error('Error processing location selection');
        }
      });
    } catch (error) {
      console.error('Error initializing autocomplete:', error);
      toast.error('Failed to initialize location search');
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
          placeholder={isLoading ? "Loading..." : placeholder}
          className="bg-white"
          disabled={isLoading}
          autoFocus={autoFocus}
          autoComplete="off"
        />
      </div>
    </div>
  );
};

export default LocationSearchInput;