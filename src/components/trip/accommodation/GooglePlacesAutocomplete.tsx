
import React, { useEffect, useRef, useState } from 'react';
import { Input } from "@/components/ui/input";
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader';
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
  const placesWidgetRef = useRef<google.maps.places.PlacesWidget | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { isLoaded, hasError } = useGoogleMaps();

  useEffect(() => {
    if (isLoaded) {
      setIsLoading(false);
      initializeAutocomplete();
    } else if (hasError) {
      setIsLoading(false);
      toast.error('Failed to initialize hotel search');
    }
  }, [isLoaded, hasError]);

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google) return;

    try {
      // Clean up previous instance if it exists
      if (placesWidgetRef.current) {
        placesWidgetRef.current.dispose();
      }

      const placeOptions: google.maps.places.PlaceOptions = {
        fields: ['displayName', 'formattedAddress', 'globalLocationNumber', 'websiteURI'],
        types: ['lodging']
      };

      const widget = new window.google.maps.places.PlacesWidget(inputRef.current, placeOptions);
      placesWidgetRef.current = widget;

      widget.addListener('placeSelect', (place: google.maps.places.Place) => {
        console.log('Selected hotel:', place);
        
        if (!place?.displayName) {
          toast.error('Please select a valid hotel from the dropdown');
          return;
        }

        setInputValue(place.displayName.text);
        onChange(place.displayName.text, place);
      });
    } catch (error) {
      console.error('Error initializing autocomplete:', error);
      toast.error('Failed to initialize hotel search');
    }
  };

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (!placesWidgetRef.current) {
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
