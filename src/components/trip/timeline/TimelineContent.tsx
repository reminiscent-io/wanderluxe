
import React from 'react';
import { TripDay, HotelStay } from '@/types/trip';
import DayCard from '../day/DayCard';

interface TimelineContentProps {
  days?: TripDay[];
  dayIndexMap: Map<string, number>;
  hotelStays: HotelStay[];
  onDayDelete: (id: string) => void;
}

const TimelineContent: React.FC<TimelineContentProps> = ({
  days = [],
  dayIndexMap,
  hotelStays,
  onDayDelete
}) => {
  if (!days.length) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg">
        <p className="text-gray-500">No days added yet. Start by setting your trip dates above.</p>
      </div>
    );
  }

  // Sort days by date
  const sortedDays = [...days].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="space-y-8">
      {sortedDays.map((day, index) => {
        const dayIndex = dayIndexMap.get(day.day_id) || index + 1;
        
        return (
          <DayCard
            key={day.day_id}
            id={day.day_id}
            tripId={day.trip_id}
            date={day.date}
            title={day.title}
            activities={day.activities || []}
            imageUrl={day.image_url}
            index={dayIndex}
            onDelete={onDayDelete}
            hotelStays={hotelStays.filter(stay => {
              if (!stay.hotel_checkin_date || !stay.hotel_checkout_date) return false;
              
              const dayDate = new Date(day.date.split('T')[0]);
              const checkinDate = new Date(stay.hotel_checkin_date.split('T')[0]);
              const checkoutDate = new Date(stay.hotel_checkout_date.split('T')[0]);
              
              return dayDate >= checkinDate && dayDate < checkoutDate;
            })}
          />
        );
      })}
    </div>
  );
};

export default TimelineContent;
