import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SCRIPT_ID = 'google-maps-script';

/**
 * Loads the Google Maps API with the Places library.
 * Returns a promise that resolves to true when loaded, or false if it fails.
 */
export const loadGoogleMapsAPI = async (): Promise<boolean> => {
  // If Google Maps is already loaded, return immediately.
  if (window.google?.maps) return true;
  if (document.getElementById(SCRIPT_ID)) return true;

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.head.appendChild(script);
  });
};