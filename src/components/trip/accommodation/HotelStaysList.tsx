
import React from 'react';
import HotelStayCard from './HotelStayCard';

interface HotelStaysListProps {
  hotelStays: Array<{
    stay_id: string;
    trip_id: string;
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

  // Validate and filter stays
  const validStays = hotelStays.filter(stay => 
    stay.stay_id && typeof stay.stay_id === 'string' && stay.trip_id
  );

  // Enhanced sorting
  const sortedStays = [...validStays].sort((a, b) => {
    const dateA = new Date(a.hotel_checkin_date).getTime();
    const dateB = new Date(b.hotel_checkin_date).getTime();
    return dateB - dateA || a.stay_id.localeCompare(b.stay_id);
  });

  return (
    <div className="space-y-4">
      {sortedStays.map((stay) => (
        <HotelStayCard
          key={`hotel-stay-${stay.stay_id}`}
          stay={stay}
          onEdit={() => onEdit(stay.stay_id)}
          onDelete={() => onDelete(stay.stay_id)}
          formatDateRange={formatDateRange}
        />
      ))}
    </div>
  );
}

export default HotelStaysList;
