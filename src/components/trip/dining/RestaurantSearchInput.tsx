import React, { useEffect, useRef, useState } from 'react';
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';

interface RestaurantDetails {
  name: string;
  place_id?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  trip_id?: string;
}

interface RestaurantSearchInputProps {
  value: string;
  onChange: (restaurantName: string, placeDetails?: google.maps.places.Place) => void;
  autoFocus?: boolean;
}

const RestaurantSearchInput: React.FC<RestaurantSearchInputProps> = ({
  value,
  onChange
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const placesWidgetRef = useRef<google.maps.places.PlacesWidget | null>(null);

  const { isLoaded, hasError } = useGoogleMaps();

  useEffect(() => {
    if (isLoaded) {
      setIsLoading(false);
      initializeAutocomplete();
    } else if (hasError) {
      setIsLoading(false);
      toast.error('Failed to initialize restaurant search');
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
        fields: ['name', 'id', 'formattedAddress', 'globalLocationNumber', 'websiteURI', 'rating'],
        types: ['restaurant']
      };

      const widget = new window.google.maps.places.PlacesWidget(inputRef.current, placeOptions);
      placesWidgetRef.current = widget;

      widget.addListener('placeSelect', (place: google.maps.places.Place) => {
        console.log('Selected restaurant:', place);

        if (!place?.displayName) {
          toast.error('Please select a valid restaurant from the dropdown');
          return;
        }

        onChange(place.displayName.text, place);
      });
    } catch (error) {
      console.error('Error initializing autocomplete:', error);
      toast.error('Failed to initialize restaurant search');
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          id="restaurant"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isLoading ? "Loading..." : "Search for a restaurant..."}
          className="w-full bg-white"
          disabled={isLoading}
          autoComplete="off"
          autoFocus={true}
        />
      </div>
    </div>
  );
};

export default RestaurantSearchInput;