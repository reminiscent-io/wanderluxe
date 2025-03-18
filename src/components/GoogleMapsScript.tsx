
import React from 'react';

interface GoogleMapsScriptProps {
  apiKey: string;
}

const GoogleMapsScript: React.FC<GoogleMapsScriptProps> = ({ apiKey }) => {
  return (
    <script 
      async 
      defer 
      src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`}
    />
  );
};

export default GoogleMapsScript;
