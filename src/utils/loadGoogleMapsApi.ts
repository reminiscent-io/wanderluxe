
import { supabase } from '@/integrations/supabase/client';

let loadPromise: Promise<void> | null = null;

export const loadGoogleMapsApi = async () => {
  // If Google Maps API is already loaded, return immediately
  if (window.google?.maps) return;
  
  // If there's an existing promise loading the API, return it
  if (loadPromise !== null) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    supabase.functions.invoke('get-google-places-key')
      .then(({ data, error }) => {
        if (error) {
          reject(new Error('Failed to fetch Google Places API key'));
          return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;

        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Maps API script'));

        document.head.appendChild(script);
      })
      .catch((error) => {
        console.error('Error loading Google Maps API:', error);
        reject(new Error('Failed to initialize Google Maps API'));
      });
  });

  return loadPromise;
};
