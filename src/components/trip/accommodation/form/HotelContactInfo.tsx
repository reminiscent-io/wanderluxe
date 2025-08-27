
import React from 'react';
import { Label } from "@/components/ui/label";
import { MapPin, Phone } from "lucide-react";

interface HotelContactInfoProps {
  address?: string;
  phone?: string;
}

const HotelContactInfo: React.FC<HotelContactInfoProps> = ({
  address,
  phone
}) => {
  if (!address && !phone) return null;
  
  return (
    <div className="space-y-2 p-3 bg-gray-50 rounded-md border max-w-full overflow-hidden">
      {/* Address and Phone on same line */}
      {(address || phone) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <Label className="text-xs text-gray-600">Address</Label>
                <p className="text-sm text-gray-800 break-words">{address}</p>
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
        </div>
      )}
    </div>
  );
};

export default HotelContactInfo;
