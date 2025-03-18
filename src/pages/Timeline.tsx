import { createContext, useContext, useState, useEffect } from 'react';

import { GoogleMapsProvider } from '@/contexts/GoogleMapsContext';


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