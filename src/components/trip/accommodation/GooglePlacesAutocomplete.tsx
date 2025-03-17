
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
  const [isLoading, setIsLoading] = useState(true);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken>();

  useEffect(() => {
    const initializeGooglePlaces = async () => {
      try {
        const { data: { key }, error } = await supabase.functions.invoke('get-google-places-key');
        
        if (error) {
          console.error('Error fetching Google Places API key:', error);
          return;
        }

        // Load the Google Places script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&v=weekly`;
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
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      
      const autocompleteService = new google.maps.places.AutocompleteService();
      const placesService = new google.maps.places.PlacesService(document.createElement('div'));

      inputRef.current.addEventListener('input', async (e: Event) => {
        const input = (e.target as HTMLInputElement).value;
        if (!input) return;

        try {
          const request = {
            input,
            types: ['lodging'],
            sessionToken: sessionTokenRef.current,
          };

          const predictions = await autocompleteService.getPlacePredictions(request);
          
          if (predictions?.predictions?.[0]) {
            const placeResult = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
              placesService.getDetails(
                {
                  placeId: predictions.predictions[0].place_id,
                  fields: ['name', 'formatted_address', 'place_id', 'international_phone_number', 'website']
                },
                (result, status) => {
                  if (status === google.maps.places.PlacesServiceStatus.OK && result) {
                    resolve(result);
                  } else {
                    reject(status);
                  }
                }
              );
            });

            setInputValue(placeResult.name || input);
            onChange(placeResult.name || input, placeResult);
          }
        } catch (error) {
          console.error('Error getting place predictions:', error);
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
    if (!sessionTokenRef.current) {
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
