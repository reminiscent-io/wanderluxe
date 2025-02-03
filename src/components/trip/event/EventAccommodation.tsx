import React from 'react';
import { ExternalLink, MapPin, Phone } from "lucide-react";

interface EventAccommodationProps {
  hotel: string;
  hotelDetails: string;
  hotelUrl?: string;
  hotelAddress?: string;
  hotelPhone?: string;
}

const EventAccommodation: React.FC<EventAccommodationProps> = ({ 
  hotel, 
  hotelDetails, 
  hotelUrl,
  hotelAddress,
  hotelPhone
}) => {
  if (!hotel) return null;

  return (
    <div className="mb-4">
      <h4 className="font-semibold text-earth-500">Accommodation</h4>
      <div className="flex items-center gap-2">
        <p className="font-medium">{hotel}</p>
        {hotelUrl && (
          <a 
            href={hotelUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-earth-500 hover:text-earth-600"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
      {hotelAddress && (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <MapPin className="h-4 w-4" />
          <p>{hotelAddress}</p>
        </div>
      )}
      {hotelPhone && (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Phone className="h-4 w-4" />
          <p>{hotelPhone}</p>
        </div>
      )}
      <p className="text-sm text-gray-600">{hotelDetails}</p>
    </div>
  );
};

export default EventAccommodation;