import React, { useEffect, useRef, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';

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
  const [apiKey, setApiKey] = useState<string>('');

  useEffect(() => {
    const loadGooglePlacesKey = async () => {
      try {
        const { data: { key } } = await supabase.functions.invoke('get-google-places-key');
        if (key) {
          setApiKey(key);
          // Load the Google Places script with the API key
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
          script.async = true;
          script.defer = true;
          script.onload = () => setIsGoogleLoaded(true);
          document.head.appendChild(script);
        }
      } catch (error) {
        console.error('Error loading Google Places API key:', error);
      }
    };

    loadGooglePlacesKey();

    // Cleanup function to remove the script when component unmounts
    return () => {
      const script = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
      if (script) {
        document.head.removeChild(script);
      }
    };
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