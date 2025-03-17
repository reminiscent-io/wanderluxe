
import { supabase } from '@/integrations/supabase/client';

let loadPromise: Promise<void> | null = null;

export const loadGoogleMapsAPI = async () => {
  // If Google Maps API is already loaded, return immediately
  if (window.google?.maps) return true;
  
  // If there's an existing promise loading the API, return it
  if (loadPromise !== null) return loadPromise;

  try {
    const { data, error } = await supabase.functions.invoke('get-google-places-key');
    
    if (error) {
      console.error('Failed to fetch Google Places API key:', error);
      return false;
    }

    return new Promise<boolean>((resolve) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=places&v=weekly&loading=async`;
      script.async = true;
      script.defer = true;

      script.onload = () => resolve(true);
      script.onerror = () => {
        console.error('Failed to load Google Maps API script');
        resolve(false);
      };

      document.head.appendChild(script);
    });
  } catch (error) {
    console.error('Error loading Google Maps API:', error);
    return false;
  }
};
