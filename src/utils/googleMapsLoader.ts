import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Google Places Proxy API functions
export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  website?: string;
  formatted_phone_number?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface AutocompleteResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface GooglePlacesResponse {
  predictions?: AutocompleteResult[];
  result?: PlaceResult;
  status: string;
}

/**
 * Search for places using our secure Google Places proxy
 * @param input Search query
 * @param types Place types (e.g., 'establishment', 'lodging', 'restaurant')
 * @returns Array of autocomplete predictions
 */
export const searchPlaces = async (
  input: string,
  types: string = 'establishment'
): Promise<AutocompleteResult[]> => {
  try {
    const params = new URLSearchParams({
      input,
      types,
      language: 'en'
    });
    
    const { data, error } = await supabase.functions.invoke(`google-places-proxy?${params}`, {
      method: 'GET'
    });

    if (error) {
      console.error('Error searching places:', error);
      toast.error('Failed to search locations');
      return [];
    }

    const response: GooglePlacesResponse = data;
    if (response.status === 'OK' && response.predictions) {
      return response.predictions;
    } else {
      console.warn('Google Places API returned non-OK status:', response.status);
      return [];
    }
  } catch (error) {
    console.error('Error in searchPlaces:', error);
    toast.error('Failed to search locations');
    return [];
  }
};

/**
 * Get detailed information about a specific place
 * @param placeId Google Places place ID
 * @returns Detailed place information
 */
export const getPlaceDetails = async (placeId: string): Promise<PlaceResult | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('google-places-proxy', {
      method: 'POST',
      body: JSON.stringify({ placeId })
    });

    if (error) {
      console.error('Error getting place details:', error);
      toast.error('Failed to get location details');
      return null;
    }

    const response: GooglePlacesResponse = data;
    if (response.status === 'OK' && response.result) {
      return response.result;
    } else {
      console.warn('Google Places API returned non-OK status:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error in getPlaceDetails:', error);
    toast.error('Failed to get location details');
    return null;
  }
};

// Legacy function for backward compatibility - now returns true immediately
// since we no longer need to load the Google Maps JavaScript API
export const loadGoogleMapsAPI = async (): Promise<boolean> => {
  // We no longer load the Google Maps API since we use our secure proxy
  // Return true for backward compatibility with existing components
  return true;
};
