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
          setIsPlacesSelecting(true);
          const place = autoCompleteRef.current.getPlace();
          
          if (!place?.name && !place?.formatted_address) {
            setIsPlacesSelecting(false);
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
          
          // Force the input to update with the selected value
          if (inputRef.current) {
            inputRef.current.value = displayValue;
          }
          
          // Use setTimeout to ensure Google Places completes its work before triggering onChange
          setTimeout(() => {
            onChange(displayValue, place);
            setIsPlacesSelecting(false);
          }, 100);
          
        } catch (error) {
          console.error('LocationSearchInput - Error in place_changed handler:', error);
          toast.error('Error processing location selection');
          setIsPlacesSelecting(false);
        }
      });
    } catch (error) {
      console.error('Error initializing autocomplete:', error);
      toast.error('Failed to initialize location search');
    }
  };

  // Track if we're in the middle of a Google Places selection
  const [isPlacesSelecting, setIsPlacesSelecting] = useState(false);

  // Update input value when prop changes, but not during Places selection
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value && !isPlacesSelecting) {
      inputRef.current.value = value;
    }
  }, [value, isPlacesSelecting]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          defaultValue={value}
          onChange={(e) => {
            // Only trigger onChange for manual typing, not during Google Places selection
            if (!isPlacesSelecting) {
              onChange(e.target.value);
            }
          }}
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