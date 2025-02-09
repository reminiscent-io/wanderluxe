import React from 'react';
import HotelStayCard from './HotelStayCard';

interface HotelStaysListProps {
  hotelStays: Array<{
    stay_id: string;
    hotel: string;
    hotel_details?: string;
    hotel_url?: string;
    hotel_checkin_date: string;
    hotel_checkout_date: string;
  }>;
  onEdit: (stayId: string) => void;
  onDelete: (stay: { 
    hotel: string; 
    hotel_checkin_date: string; 
    hotel_checkout_date: string; 
  }) => void;
  formatDateRange: (checkinDate: string, checkoutDate: string) => string;
}

const HotelStaysList: React.FC<HotelStaysListProps> = ({
  hotelStays,
  onEdit,
  onDelete,
  formatDateRange,
}) => {
  if (hotelStays.length === 0) return null;

  // Enhanced sorting with fallback
  const sortedStays = [...hotelStays].sort((a, b) => {
    const dateA = new Date(a.hotel_checkin_date).getTime();
    const dateB = new Date(b.hotel_checkin_date).getTime();
    return dateB - dateA || a.stay_id.localeCompare(b.stay_id);
  });

  // Filter out invalid entries
  const validStays = sortedStays.filter(stay => 
    stay.stay_id && typeof stay.stay_id === 'string'
  );

  return (
    <div className="space-y-4">
      {validStays.map((stay) => (
        <HotelStayCard
          key={`hotel-stay-${stay.stay_id}`}
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
