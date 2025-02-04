import React, { useEffect, useRef, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RestaurantDetails {
  name: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  place_id: string;
  rating?: number;
}

interface RestaurantSearchInputProps {
  onPlaceSelect: (place: RestaurantDetails) => void;
  defaultValue?: string;
}

const RestaurantSearchInput: React.FC<RestaurantSearchInputProps> = ({
  onPlaceSelect,
  defaultValue = ''
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const autoCompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadGooglePlacesAPI = async () => {
      try {
        const { data: { key }, error } = await supabase.functions.invoke('get-google-places-key');
        
        if (error || !key) {
          console.error('Error fetching API key:', error);
          toast.error('Failed to initialize restaurant search');
          setIsLoading(false);
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
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        };
      } catch (error) {
        console.error('Error initializing Google Places:', error);
        toast.error('Failed to initialize restaurant search');
        setIsLoading(false);
      }
    };

    loadGooglePlacesAPI();
  }, []);

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google) return;

    try {
      // Clean up previous instance if it exists
      if (autoCompleteRef.current) {
        google.maps.event.clearInstanceListeners(autoCompleteRef.current);
      }

      const options: google.maps.places.AutocompleteOptions = {
        fields: ['name', 'place_id', 'formatted_address', 'formatted_phone_number', 'website', 'rating'],
        types: ['restaurant', 'food']
      };

      autoCompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, options);

      autoCompleteRef.current.addListener('place_changed', () => {
        if (!autoCompleteRef.current) return;
        
        const place = autoCompleteRef.current.getPlace();
        console.log('Selected restaurant:', place);

        if (!place || !place.name) {
          toast.error('Please select a valid restaurant from the dropdown');
          return;
        }

        const restaurantDetails: RestaurantDetails = {
          name: place.name,
          place_id: place.place_id || `custom-${Date.now()}`,
          formatted_address: place.formatted_address,
          formatted_phone_number: place.formatted_phone_number,
          website: place.website,
          rating: place.rating
        };

        setInputValue(place.name);
        onPlaceSelect(restaurantDetails);
      });
    } catch (error) {
      console.error('Error initializing autocomplete:', error);
      toast.error('Failed to initialize restaurant search');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Allow direct input without requiring selection
    if (newValue === '') {
      onPlaceSelect({
        name: '',
        place_id: `custom-${Date.now()}`
      });
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="restaurant">Restaurant Name</Label>
      <Input
        ref={inputRef}
        type="text"
        id="restaurant"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={isLoading ? "Loading..." : "Search for a restaurant..."}
        className="w-full bg-white"
        disabled={isLoading}
      />
    </div>
  );
};

export default RestaurantSearchInput;