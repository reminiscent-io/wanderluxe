import React from 'react';
import { Card } from "@/components/ui/card";
import { Hotel } from "lucide-react";
import { formatDateRange } from '@/utils/dateUtils';

interface AccommodationGroupProps {
  hotel: string;
  hotelDetails?: string;
  checkinDate: string;
  checkoutDate: string;
  children: React.ReactNode;
}

const AccommodationGroup: React.FC<AccommodationGroupProps> = ({
  hotel,
  hotelDetails,
  checkinDate,
  checkoutDate,
  children
}) => {
  return (
    <div className="space-y-6">
      <Card className="p-6 bg-sand-50">
        <div className="flex items-start gap-4">
          <Hotel className="h-5 w-5 text-earth-500 mt-1" />
          <div>
            <h3 className="text-xl font-semibold">{hotel}</h3>
            <p className="text-sm text-gray-600">{formatDateRange(checkinDate, checkoutDate)}</p>
            {hotelDetails && (
              <p className="text-sm text-gray-600 mt-2">{hotelDetails}</p>
            )}
          </div>
        </div>
      </Card>
      <div className="pl-4 border-l-2 border-sand-200 space-y-6">
        {children}
      </div>
    </div>
  );
};

export default AccommodationGroup;