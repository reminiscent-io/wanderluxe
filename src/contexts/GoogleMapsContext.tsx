
import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader';

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
        const loaded = await loadGoogleMapsAPI();
        setIsLoaded(loaded);
        setHasError(!loaded);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setHasError(true);
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
