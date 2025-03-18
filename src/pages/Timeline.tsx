import { createContext, useContext, useState, useEffect } from 'react';

const GoogleMapsContext = createContext(null);

export const GoogleMapsProvider = ({ children }) => {
  const [apiLoaded, setApiLoaded] = useState(false);

  useEffect(() => {
    const loadApi = async () => {
      // Replace with your actual Google Maps API key and libraries
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setApiLoaded(true);
      document.body.appendChild(script);
    };

    if (!apiLoaded) {
      loadApi();
    }
  }, [apiLoaded]);


  return (
    <GoogleMapsContext.Provider value={{ apiLoaded }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

export const useGoogleMaps = () => {
  const context = useContext(GoogleMapsContext);
  if (context === null) {
    throw new Error('useGoogleMaps must be used within a GoogleMapsProvider');
  }
  return context;
};


import { GoogleMapsProvider } from '@/contexts/GoogleMapsContext';

function Timeline() {
  return (
    <GoogleMapsProvider>
      <div className="min-h-screen bg-background">
        {/* Rest of the Timeline component */}
      </div>
    </GoogleMapsProvider>
  );
}

export default Timeline;