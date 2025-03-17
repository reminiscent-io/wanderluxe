import React, { useEffect, useRef, useState } from 'react';
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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

  useEffect(() => {
    const loadAPI = async () => {
      try {
        const { loadGoogleMapsAPI } = await import('@/utils/googleMapsLoader');
        const loaded = await loadGoogleMapsAPI();
        if (loaded) {
          setIsLoading(false);
          initializeAutocomplete();
        } else {
          setIsLoading(false);
          toast.error('Failed to initialize restaurant search');
        }
      } catch (error) {
        console.error('Error initializing Google Places:', error);
        toast.error('Failed to initialize restaurant search');
        setIsLoading(false);
      }
    };

    loadAPI();
  }, []);

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google) return;

    try {
      // Clean up previous instance if it exists
      if (placesWidgetRef.current) {
        placesWidgetRef.current.dispose();
      }

      const sessionToken = new google.maps.places.AutocompleteSessionToken();
      
      const autocomplete = new google.maps.places.AutocompleteService();
      
      inputRef.current.addEventListener('input', async (e: Event) => {
        const input = (e.target as HTMLInputElement).value;
        
        if (!input) return;

        try {
          const request = {
            input,
            types: ['restaurant'],
            sessionToken,
            fields: ['name', 'formatted_address', 'place_id', 'phone_number', 'website', 'rating'],
          };

          const predictions = await autocomplete.getPlacePredictions(request);
          
          if (predictions?.predictions) {
            // Get details for the first prediction
            const placeId = predictions.predictions[0].place_id;
            const placeResult = await new google.maps.places.PlacesService(document.createElement('div'))
              .getDetails({ placeId, fields: request.fields });

            if (placeResult) {
              onChange(placeResult.name || input, placeResult);
            }
          }
        } catch (error) {
          console.error('Error getting place predictions:', error);
          toast.error('Error searching for restaurants');
        }
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