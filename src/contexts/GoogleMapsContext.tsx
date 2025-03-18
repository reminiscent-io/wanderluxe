
import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader';
import { toast } from 'sonner';

interface GoogleMapsContextType {
  isLoaded: boolean;
  hasError: boolean;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  hasError: false
});

export const GoogleMapsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        if (window.google?.maps) {
          setIsLoaded(true);
          return;
        }

        const loaded = await loadGoogleMapsAPI();
        if (!loaded) {
          throw new Error('Failed to load Google Maps API');
        }
        setIsLoaded(true);
        setHasError(false);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        toast.error('Failed to load Google Maps API');
        setHasError(true);
        setIsLoaded(false);
      }
    };

    initializeGoogleMaps();
  }, []);

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, hasError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

export const useGoogleMaps = () => useContext(GoogleMapsContext);
