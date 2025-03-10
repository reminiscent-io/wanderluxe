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
  trip_id?: string;
}

interface RestaurantSearchInputProps {
  onPlaceSelect: (place: RestaurantDetails) => void;
  defaultValue?: string;
  tripId?: string;
}

const RestaurantSearchInput: React.FC<RestaurantSearchInputProps> = ({
  onPlaceSelect,
  defaultValue = '',
  tripId
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const autoCompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the input field when component mounts with a higher priority
    if (inputRef.current) {
      // Use a shorter timeout and try multiple times to ensure focus
      const focusAttempt = () => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      };
      
      // Try immediately
      focusAttempt();
      
      // And also with timeouts to handle dialog transition
      const timers = [
        setTimeout(focusAttempt, 10),
        setTimeout(focusAttempt, 50),
        setTimeout(focusAttempt, 100)
      ];
      
      return () => {
        timers.forEach(timer => clearTimeout(timer));
      };
    }
  }, []);
  
  useEffect(() => {
    const loadAPI = async () => {
      try {
        // Import the shared Google Maps loader
        const { loadGoogleMapsAPI } = await import('@/utils/googleMapsLoader');
        
        // Load Google Maps API
        const isLoaded = await loadGoogleMapsAPI();
        
        if (isLoaded) {
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
      if (autoCompleteRef.current) {
        google.maps.event.clearInstanceListeners(autoCompleteRef.current);
      }

      const options: google.maps.places.AutocompleteOptions = {
        fields: ['name', 'place_id', 'formatted_address', 'formatted_phone_number', 'website', 'rating'],
        types: ['restaurant', 'food']
      };

      autoCompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, options);

      // Ensure the Autocomplete dropdown is positioned correctly
      autoCompleteRef.current.addListener('place_changed', () => {
        if (!autoCompleteRef.current) return;

        const place = autoCompleteRef.current.getPlace();
        console.log('Selected restaurant:', place);

        if (!place?.name) {
          toast.error('Please select a valid restaurant from the dropdown');
          return;
        }

        const restaurantDetails: RestaurantDetails = {
          name: place.name,
          place_id: place.place_id || `custom-${Date.now()}`,
          formatted_address: place.formatted_address,
          formatted_phone_number: place.formatted_phone_number,
          website: place.website,
          rating: place.rating,
          trip_id: tripId // Must match the database column name (trip_id)
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
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          id="restaurant"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={isLoading ? "Loading..." : "Search for a restaurant..."}
          className="w-full bg-white"
          disabled={isLoading}
          autoComplete="off" // Prevent browser autocomplete interfering
        />
      </div>

      {/* This ensures the Google autocomplete dropdown renders properly */}
      <style jsx global>{`
        .pac-container {
          z-index: 10000;
          width: auto !important;
          position: absolute !important;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          border-radius: 6px;
          overflow: hidden;
          margin-top: 2px;
        }

        .pac-item {
          padding: 8px 12px;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
        }

        .pac-item:hover {
          background-color: #f9fafb;
        }

        .pac-item-selected {
          background-color: #f3f4f6;
        }

        /* Make sure dropdown is visible and interactive */
        .pac-container:after {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          pointer-events: auto;
          z-index: -1;
        }
      `}</style>
    </div>
  );
};

// Added handleSaveReservation function to address database issues
const handleSaveReservation = async (reservationData, tripId) => {
  try {
    if (!tripId) {
      console.error("Missing trip_id - cannot save reservation");
      throw new Error("Missing trip_id");
    }
    
    const dataWithTripId = {
      ...reservationData,
      trip_id: tripId,
    };

    const result = await supabase
      .from('restaurant_reservations')
      .insert(dataWithTripId);

    if (result.error) {
      console.error("Error saving reservation:", result.error);
      throw result.error; // Re-throw for proper error handling
    }

    // Handle success
    return result.data;
  } catch (error) {
    console.error("Error saving reservation:", error);
    throw error; // Re-throw for proper error handling
  }
};

export default RestaurantSearchInput;