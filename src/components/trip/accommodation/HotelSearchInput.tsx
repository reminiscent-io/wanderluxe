import React, { useEffect, useRef, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  useEffect(() => {
    if (!inputRef.current || disabled) return;

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
  }, [onChange, disabled]);

  return (
    <div>
      <Label htmlFor="hotel">Hotel Name *</Label>
      <Input
        ref={inputRef}
        id="hotel"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={disabled ? "bg-gray-100" : ""}
        placeholder="Search for a hotel..."
      />
    </div>
  );
};

export default HotelSearchInput;