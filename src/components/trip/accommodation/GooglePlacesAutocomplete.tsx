
import React, { useEffect, useRef, useState } from 'react';
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (
    name: string, 
    details?: google.maps.places.Place
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
  const [isLoading, setIsLoading] = useState(true);
  const { isLoaded, hasError } = useGoogleMaps();
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    const initializeAutocomplete = () => {
      if (!inputRef.current || autocompleteRef.current) return;
      
      try {
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ['name', 'formatted_address', 'place_id', 'website', 'formatted_phone_number', 'rating'],
          types: ['lodging']
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.name) {
            setInputValue(place.name);
            onChange(place.name, {
              id: place.place_id,
              displayName: { text: place.name },
              formattedAddress: place.formatted_address,
              globalLocationNumber: place.formatted_phone_number,
              websiteURI: place.website,
              rating: place.rating
            } as google.maps.places.Place);
          }
        });

        autocompleteRef.current = autocomplete;
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing autocomplete:', error);
        toast.error('Failed to initialize hotel search');
        setIsLoading(false);
      }
    };

    if (isLoaded) {
      initializeAutocomplete();
    } else {
      setIsLoading(true);
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, onChange]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      value={inputValue}
      onChange={handleInputChange}
      className={className}
      placeholder={isLoading ? "Loading..." : placeholder}
      disabled={isLoading || hasError}
    />
  );
};

export default GooglePlacesAutocomplete;
