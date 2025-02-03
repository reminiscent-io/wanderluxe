import React, { useEffect, useRef, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Declare the google types globally
declare global {
  interface Window {
    google: typeof google;
  }
}

interface HotelSearchInputProps {
  value: string;
  onChange: (value: string, placeDetails?: google.maps.places.PlaceResult) => void;
  disabled?: boolean;
}

const HotelSearchInput: React.FC<HotelSearchInputProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

  useEffect(() => {
    // Check if Google Places API is loaded
    const checkGoogleLoaded = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsGoogleLoaded(true);
      } else {
        // If not loaded, check again in 100ms
        setTimeout(checkGoogleLoaded, 100);
      }
    };

    checkGoogleLoaded();
  }, []);

  useEffect(() => {
    if (!inputRef.current || disabled || !isGoogleLoaded) return;

    try {
      const options: google.maps.places.AutocompleteOptions = {
        types: ['lodging'],
        fields: ['name', 'formatted_address', 'place_id', 'formatted_phone_number', 'website']
      };

      const autocompleteInstance = new window.google.maps.places.Autocomplete(
        inputRef.current,
        options
      );

      autocompleteInstance.addListener('place_changed', () => {
        const place = autocompleteInstance.getPlace();
        if (place.name) {
          onChange(place.name, place);
        }
      });

      setAutocomplete(autocompleteInstance);

      return () => {
        if (autocomplete) {
          window.google.maps.event.clearInstanceListeners(autocomplete);
        }
      };
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
    }
  }, [onChange, disabled, isGoogleLoaded]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow manual input while maintaining the controlled component pattern
    onChange(e.target.value);
  };

  return (
    <div>
      <Label htmlFor="hotel">Hotel Name *</Label>
      <Input
        ref={inputRef}
        id="hotel"
        value={value}
        onChange={handleInputChange}
        disabled={disabled}
        className={disabled ? "bg-gray-100" : ""}
        placeholder="Search for a hotel..."
        required
      />
    </div>
  );
};

export default HotelSearchInput;