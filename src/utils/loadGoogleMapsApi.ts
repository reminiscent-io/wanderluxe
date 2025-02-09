import { supabase } from '@/integrations/supabase/client';

let loadPromise: Promise<void> | null = null;

export const loadGoogleMapsApi = async () => {
  if (window.google?.maps) return;
  if (loadPromise) return loadPromise;

  loadPromise = new Promise(async (resolve, reject) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-google-places-key');
      if (error) throw error;

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;

      script.onload = () => resolve();
      script.onerror = (error) => reject(error);

      document.head.appendChild(script);
    } catch (error) {
      console.error('Error loading Google Maps API:', error);
      reject(error);
    }
  });

  return loadPromise;
};