
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SCRIPT_ID = 'google-maps-script';

/**
 * Loads the Google Maps API with the Places library.
 */
export const loadGoogleMapsAPI = async (): Promise<boolean> => {
  if (window.google?.maps) return true;
  if (document.getElementById(SCRIPT_ID)) return true;

  try {
    const { data, error } = await supabase.functions.invoke('get-google-places-key');
    
    if (error || !data?.key) {
      console.error('Error fetching Google Places API key:', error);
      toast('Failed to initialize location search');
      return false;
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;

      script.onload = () => resolve(true);
      script.onerror = () => {
        console.error('Failed to load Google Maps API');
        toast('Failed to initialize location search');
        resolve(false);
      };

      document.head.appendChild(script);
    });
  } catch (error) {
    console.error('Error loading Google Maps API:', error);
    toast('Failed to initialize location search');
    return false;
  }
};
