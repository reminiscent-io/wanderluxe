import React, { useEffect, useRef, useState } from 'react';
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (
    name: string, 
    details?: google.maps.places.PlaceResult
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeGooglePlaces = async () => {
      try {
        // Get the API key from Supabase Edge Function
        const { data: { key }, error } = await supabase.functions.invoke('get-google-places-key');
        
        if (error) {
          console.error('Error fetching Google Places API key:', error);
          return;
        }

        // Load the Google Places script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          setIsLoading(false);
          initializeAutocomplete();
        };
        document.head.appendChild(script);

        return () => {
          document.head.removeChild(script);
        };
      } catch (error) {
        console.error('Error initializing Google Places:', error);
        setIsLoading(false);
      }
    };

    initializeGooglePlaces();
  }, []);

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google) return;

    try {
      // Clean up previous instance if it exists
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }

      const options: google.maps.places.AutocompleteOptions = {
        types: ['lodging'],
        fields: ['name', 'formatted_address', 'place_id', 'international_phone_number', 'website', 'formatted_phone_number']
      };

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
    // Only trigger onChange with the text value when user is typing
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
      className={className}
      placeholder={placeholder}
      disabled={isLoading}
    />
  );
};

export default GooglePlacesAutocomplete;