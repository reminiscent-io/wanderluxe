import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

let loadPromise: Promise<boolean> | null = null;

export const loadGoogleMapsAPI = async (): Promise<boolean> => {
  // If already loaded, return immediately.
  if (window.google && window.google.maps) {
    return true;
  }
  // Return the existing promise if a load is in progress.
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<boolean>(async (resolve) => {
    try {
      // Retrieve the API key from Supabase Edge Function.
      const { data: { key }, error } = await supabase.functions.invoke('get-google-places-key');
      if (error || !key) {
        console.error('Error fetching Google Places API key:', error);
        toast('Failed to initialize location search', { variant: 'error' });
        resolve(false);
        return;
      }

      // Create and inject the script.
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        console.error('Google Maps script failed to load');
        toast('Failed to load location search', { variant: 'error' });
        resolve(false);
      };
      document.head.appendChild(script);
    } catch (error) {
      console.error('Error initializing Google Maps API:', error);
      toast('Failed to initialize location search', { variant: 'error' });
      resolve(false);
    }
  });

  return loadPromise;
};
