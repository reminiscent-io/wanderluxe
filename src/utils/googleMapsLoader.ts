
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SCRIPT_ID = 'google-maps-script';

export const loadGoogleMapsAPI = async (): Promise<boolean> => {
  if (window.google?.maps) return true;
  if (document.getElementById(SCRIPT_ID)) return true;

  try {
    const { data, error } = await supabase.functions.invoke('get-google-places-key');
    
    if (error) {
      console.error('Error fetching Google Places API key:', error);
      toast.error('Failed to fetch API key');
      return false;
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=places`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log('Google Maps API loaded successfully');
        resolve(true);
      };

      script.onerror = (error) => {
        console.error('Google Maps API failed to load:', error);
        toast.error('Failed to load Google Maps');
        resolve(false);
      };

      document.head.appendChild(script);
    });
  } catch (error) {
    console.error('Error initializing Google Maps API:', error);
    toast.error('Failed to initialize Google Maps');
    return false;
  }
};
