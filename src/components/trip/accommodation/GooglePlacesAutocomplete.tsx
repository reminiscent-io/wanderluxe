import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader';
import { toast } from 'sonner';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (name: string, details?: google.maps.places.PlaceResult) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  value,
  onChange,
  className,
  placeholder = "Search for hotels...",
  autoFocus
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const autoCompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadAPI = async () => {
      try {
        const loaded = await loadGoogleMapsAPI();
        if (loaded) {
          setIsLoading(false);
          initializeAutocomplete();
        } else {
          setIsLoading(false);
          toast('Failed to initialize hotel search');
        }
      } catch (error) {
        console.error('Error initializing Google Places:', error);
        setIsLoading(false);
        toast('Failed to initialize hotel search');
      }
    };
    loadAPI();
  }, []);

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google) return;

    if (autoCompleteRef.current) {
      google.maps.event.clearInstanceListeners(autoCompleteRef.current);
    }

    autoCompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ['lodging'],
        fields: ['name', 'formatted_address', 'place_id', 'website', 'formatted_phone_number']
      }
    );

    autoCompleteRef.current.addListener('place_changed', () => {
      if (!autoCompleteRef.current) return;
      const place = autoCompleteRef.current.getPlace();
      if (!place?.name) {
        toast('Please select a valid hotel from the dropdown', { variant: 'error' });
        return;
      }
      onChange(place.name, place);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  return (
    <>
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className={`${className} relative z-50`}
        placeholder={placeholder}
        disabled={isLoading}
        autoFocus={autoFocus}
      />
      <style jsx global>{`
        .pac-container {
          z-index: 9999 !important;
          pointer-events: auto !important;
        }
      `}</style>
    </>
  );
};

export default GooglePlacesAutocomplete;