import React from 'react';
import FlightCard from "./FlightCard";
import DayCard from "./DayCard";
import TransportationCard from "./TransportationCard";
import AccommodationsSection from "./AccommodationsSection";
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { useTripDays } from '@/hooks/use-trip-days';

interface TimelineViewProps {
  tripId: string | undefined;
}

const TimelineView: React.FC<TimelineViewProps> = ({ tripId }) => {
  const { events, isLoading: eventsLoading, updateEvent, deleteEvent, refetch } = useTimelineEvents(tripId);
  const { days, isLoading: daysLoading, addActivity } = useTripDays(tripId);

  const handleAddActivity = (dayId: string) => {
    // TODO: Implement activity form dialog
    console.log('Adding activity to day:', dayId);
  };

  if (eventsLoading || daysLoading) {
    return <div>Loading timeline...</div>;
  }

  // Filter unique hotel stays
  const uniqueHotelStays = events?.reduce((acc: any[], event) => {
    if (event.hotel && event.hotel_checkin_date) {
      const stayKey = `${event.hotel}-${event.hotel_checkin_date}`;
      if (!acc.find(stay => `${stay.hotel}-${stay.hotel_checkin_date}` === stayKey)) {
        acc.push(event);
      }
    }
    return acc;
  }, []) || [];

  return (
    <div className="space-y-8">
      <AccommodationsSection 
        tripId={tripId || ''} 
        onAccommodationChange={refetch}
        hotelStays={uniqueHotelStays}
      />

      <FlightCard
        type="outbound"
        flightNumber="DL582"
        route="New York (JFK) → Naples (NAP)"
        date="June 1, 2024"
        departure="7:55 PM EDT"
        arrival="10:15 AM CEST"
      />

      <div className="space-y-12">
        {days?.map((day, index) => (
          <div key={day.id}>
            <DayCard
              date={day.date}
              title={day.title}
              description={day.description}
              activities={day.activities}
              onAddActivity={() => handleAddActivity(day.id)}
              index={index}
            />
            
            {index < (days?.length || 0) - 1 && (
              <TransportationCard
                type="car"
                details="Transportation details to be planned"
                duration="TBD"
                index={index}
              />
            )}
          </div>
        ))}
      </div>

      <FlightCard
        type="return"
        flightNumber="DL585"
        route="Naples (NAP) → New York (JFK)"
        date="June 8, 2024"
        departure="11:45 AM CEST"
        arrival="3:25 PM EDT"
      />
    </div>
  );
};

export default TimelineView;