import React from 'react';
import { Label } from "@/components/ui/label";
import { formatInternationalPhone } from '@/utils/phoneUtils';

interface HotelDetailsProps {
  address?: string;
  phone?: string;
}

const HotelDetails: React.FC<HotelDetailsProps> = ({
  address,
  phone
}) => {
  if (!address && !phone) return null;

  return (
    <div className="space-y-2">
      {address && (
        <div>
          <Label>Address</Label>
          <p className="text-sm text-gray-600">{address}</p>
        </div>
      )}
      {phone && (
        <div>
          <Label>Phone</Label>
          <p className="text-sm text-gray-600">{formatInternationalPhone(phone)}</p>
        </div>
      )}
    </div>
  );
};

export default HotelDetails;