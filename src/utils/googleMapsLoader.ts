
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Loads the Google Maps API with Places library
 * Returns a promise that resolves when the API is loaded
 */
export const loadGoogleMapsAPI = async (): Promise<boolean> => {
  // If Google Maps is already loaded, return immediately
  if (window.google && window.google.maps) {
    return true;
  }

  try {
    // Fetch the API key from the Supabase function
    const { data: { key }, error } = await supabase.functions.invoke('get-google-places-key');

    if (error || !key) {
      console.error('Error fetching Google Places API key:', error);
      toast.error('Failed to initialize location search');
      return false;
    }

    // Create a promise that resolves when the script loads
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        resolve(true);
      };
      
      script.onerror = () => {
        console.error('Google Maps script failed to load');
        toast.error('Failed to load location search');
        reject(false);
      };
      
      document.head.appendChild(script);
    });
  } catch (error) {
    console.error('Error initializing Google Maps API:', error);
    toast.error('Failed to initialize location search');
    return false;
  }
};
