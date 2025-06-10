import React, { useEffect, useRef, useState } from 'react';
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader';
import { MapPin, AlertCircle } from 'lucide-react';

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
  const [hasGooglePlaces, setHasGooglePlaces] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const autoCompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadAPI = async () => {
      const loaded = await loadGoogleMapsAPI();
      if (loaded) {
        setHasGooglePlaces(true);
        initializeAutocomplete();
      } else {
        console.warn('Google Places API not available, falling back to manual entry');
      }
      setIsLoading(false);
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
        if (place?.name) {
          setIsManualEntry(false);
          onChange(place.name, place);
        }
      });
    } catch (error) {
      console.error('Error initializing autocomplete:', error);
      setHasGooglePlaces(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setIsManualEntry(true);
    onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Allow manual entry on Enter press
      if (value.trim()) {
        setIsManualEntry(true);
      }
    }
  };

  const getPlaceholder = () => {
    if (isLoading) return "Loading...";
    if (hasGooglePlaces) return "Search for a restaurant or enter manually...";
    return "Enter restaurant name...";
  };

  const getHelpText = () => {
    if (!hasGooglePlaces) {
      return (
        <div className="flex items-center gap-1 text-sm text-amber-600 mt-1">
          <AlertCircle className="h-3 w-3" />
          <span>Enter restaurant details manually</span>
        </div>
      );
    }
    if (isManualEntry && value.trim()) {
      return (
        <div className="flex items-center gap-1 text-sm text-blue-600 mt-1">
          <MapPin className="h-3 w-3" />
          <span>Manual entry - you can add address details in the form below</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          id="restaurant"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          className="bg-white"
          disabled={isLoading}
          autoFocus={autoFocus}
          autoComplete="off"
        />
      </div>
      {getHelpText()}
    </div>
  );
};

export default RestaurantSearchInput;
