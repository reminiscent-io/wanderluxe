import React from 'react';
import FlightCard from "./FlightCard";
import TimelineEvent from "./TimelineEvent";
import TransportationCard from "./TransportationCard";
import { useTimelineEvents } from '@/hooks/use-timeline-events';

interface TimelineViewProps {
  tripId: string | undefined;
}

const TimelineView: React.FC<TimelineViewProps> = ({ tripId }) => {
  const { events, isLoading, updateEvent, deleteEvent } = useTimelineEvents(tripId);

  if (isLoading) {
    return <div>Loading timeline...</div>;
  }

  // Create wrapper functions to pass the correct function signatures
  const handleUpdateEvent = (id: string, data: any) => {
    updateEvent.mutate({ id, ...data });
  };

  const handleDeleteEvent = (id: string) => {
    deleteEvent.mutate(id);
  };

  return (
    <div className="space-y-8">
      <FlightCard
        type="outbound"
        flightNumber="DL582"
        route="New York (JFK) → Naples (NAP)"
        date="June 1, 2024"
        departure="7:55 PM EDT"
        arrival="10:15 AM CEST"
      />

      <div className="space-y-12">
        {events?.map((event, index) => (
          <div key={event.id}>
            <TimelineEvent
              id={event.id}
              date={event.date}
              title={event.title}
              description={event.description || ''}
              image={
                event.title.includes('Naples') 
                  ? "https://images.unsplash.com/photo-1516483638261-f4dbaf036963"
                  : event.title.includes('Positano')
                  ? "https://images.unsplash.com/photo-1533606688076-b6683a5f59f1"
                  : event.image_url || 'https://images.unsplash.com/photo-1501854140801-50d01698950b'
              }
              hotel={event.hotel || ''}
              hotel_details={event.hotel_details || ''}
              hotel_checkin_date={event.hotel_checkin_date || ''}
              hotel_checkout_date={event.hotel_checkout_date || ''}
              hotel_url={event.hotel_url || ''}
              activities={event.activities || []}
              index={index}
              onEdit={handleUpdateEvent}
              onDelete={handleDeleteEvent}
            />
            {index < (events?.length || 0) - 1 && (
              <TransportationCard
                type={index === 0 ? "car" : "car"}
                details={index === 0 ? "Private car service from Naples Airport to Hotel" : "Transportation details to be planned"}
                duration={index === 0 ? "45 minutes - Arrival at 1:00 PM" : "TBD"}
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