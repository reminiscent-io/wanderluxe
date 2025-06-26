import React from 'react';
import { Label } from "@/components/ui/label";
import { ExternalLink, MapPin, Phone, Star } from 'lucide-react';

interface RestaurantContactInfoProps {
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
}

const RestaurantContactInfo: React.FC<RestaurantContactInfoProps> = ({
  address,
  phone,
  website,
  rating
}) => {
  if (!address && !phone && !website && !rating) return null;
  
  return (
    <div className="space-y-2 p-3 bg-gray-50 rounded-md border">
      {address && (
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <Label className="text-xs text-gray-600">Address</Label>
            <p className="text-sm text-gray-800">{address}</p>
          </div>
        </div>
      )}
      
      {phone && (
        <div className="flex items-start gap-2">
          <Phone className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <Label className="text-xs text-gray-600">Phone</Label>
            <p className="text-sm text-gray-800">{phone}</p>
          </div>
        </div>
      )}
      
      {website && (
        <div className="flex items-start gap-2">
          <ExternalLink className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <Label className="text-xs text-gray-600">Website</Label>
            <a 
              href={website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        </div>
      )}
      
      {rating && (
        <div className="flex items-start gap-2">
          <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div>
            <Label className="text-xs text-gray-600">Rating</Label>
            <p className="text-sm text-gray-800">{rating.toFixed(1)} / 5.0</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantContactInfo;