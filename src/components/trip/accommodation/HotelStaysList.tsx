import React from 'react';
import HotelStayCard from './HotelStayCard';

interface HotelStaysListProps {
  hotelStays: Array<{
    id: string;
    hotel: string;
    hotel_details?: string;
    hotel_url?: string;
    hotel_checkin_date: string;
    hotel_checkout_date: string;
  }>;
  onEdit: (stayId: string) => void;
  onDelete: (stayId: string) => void;
  formatDateRange: (checkinDate: string, checkoutDate: string) => string;
}

const HotelStaysList: React.FC<HotelStaysListProps> = ({
  hotelStays,
  onEdit,
  onDelete,
  formatDateRange,
}) => {
  if (hotelStays.length === 0) return null;

  return (
    <div className="space-y-4">
      {hotelStays.map((stay) => (
        <HotelStayCard
          key={stay.id}
          stay={stay}
          onEdit={onEdit}
          onDelete={onDelete}
          formatDateRange={formatDateRange}
        />
      ))}
    </div>
  );
};

export default HotelStaysList;