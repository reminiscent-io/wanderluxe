
import React from 'react';
import { Label } from "@/components/ui/label";

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
    <>
      {address && (
        <div>
          <Label>Address</Label>
          <p className="text-sm text-gray-600">{address}</p>
        </div>
      )}
      {phone && (
        <div>
          <Label>Phone</Label>
          <p className="text-sm text-gray-600">{phone}</p>
        </div>
      )}
    </>
  );
};

export default HotelContactInfo;
