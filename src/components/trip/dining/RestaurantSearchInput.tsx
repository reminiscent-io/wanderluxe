
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
  const { isLoaded, hasError } = useGoogleMaps();
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (isLoaded && inputRef.current && !autocompleteRef.current) {
      try {
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ['name', 'formatted_address', 'place_id', 'website', 'formatted_phone_number', 'rating'],
          types: ['restaurant']
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.name) {
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
        toast.error('Failed to initialize restaurant search');
        setIsLoading(false);
      }
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, onChange]);

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
          disabled={isLoading || hasError}
          autoComplete="off"
          autoFocus={true}
        />
      </div>
    </div>
  );
};

export default RestaurantSearchInput;
