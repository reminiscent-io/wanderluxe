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
  onDelete: (stay: { hotel: string; hotel_checkin_date: string; hotel_checkout_date: string; }) => void;
  formatDateRange: (checkinDate: string, checkoutDate: string) => string;
}

const HotelStaysList: React.FC<HotelStaysListProps> = ({
  hotelStays,
  onEdit,
  onDelete,
  formatDateRange,
}) => {
  if (hotelStays.length === 0) return null;

  // Sort hotel stays by check-in date in descending order
  const sortedStays = [...hotelStays].sort((a, b) => 
    new Date(b.hotel_checkin_date).getTime() - new Date(a.hotel_checkin_date).getTime()
  );

  return (
    <div className="space-y-4">
      {sortedStays.map((stay) => (
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