
import { toast } from "sonner";

const SCRIPT_ID = 'google-maps-script';

export const loadGoogleMapsAPI = async (): Promise<boolean> => {
  if (window.google?.maps) return true;
  if (document.getElementById(SCRIPT_ID)) return true;

  try {
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google Places API key not found in environment variables');
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
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
