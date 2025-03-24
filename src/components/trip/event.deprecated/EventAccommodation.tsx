import React from 'react';
import { Building2, ExternalLink } from "lucide-react";

interface EventAccommodationProps {
  hotel: string;
  hotelDetails: string;
  hotelUrl: string;
  hotelCheckinDate: string;
  hotelCheckoutDate: string;
}

const EventAccommodation: React.FC<EventAccommodationProps> = ({
  hotel,
  hotelDetails,
  hotelUrl,
  hotelCheckinDate,
  hotelCheckoutDate
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-earth-500">
        <Building2 className="h-4 w-4" />
        <h4 className="font-medium">Accommodation</h4>
      </div>
      
      <div className="pl-6">
        <div className="flex items-start justify-between">
          <div>
            <h5 className="font-medium">{hotel}</h5>
            <p className="text-sm text-gray-600">{hotelDetails}</p>
            {(hotelCheckinDate || hotelCheckoutDate) && (
              <p className="text-sm text-gray-500 mt-1">
                {hotelCheckinDate && `Check-in: ${hotelCheckinDate}`}
                {hotelCheckoutDate && ` • Check-out: ${hotelCheckoutDate}`}
              </p>
            )}
          </div>
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
      </div>
    </div>
  );
};

export default EventAccommodation;