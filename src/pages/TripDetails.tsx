import React from 'react';
import { useParams } from 'react-router-dom';
import Navigation from "../components/Navigation";
import HeroSection from "../components/trip/HeroSection";
import FlightCard from "../components/trip/FlightCard";
import TimelineEvent from "../components/trip/TimelineEvent";
import TransportationCard from "../components/trip/TransportationCard";
import { useTimelineEvents } from '@/hooks/use-timeline-events';

const TripDetails = () => {
  const { tripId } = useParams();
  const trips = JSON.parse(localStorage.getItem('trips') || '[]');
  const trip = trips.find((t: any) => t.id.toString() === tripId);

  const { events, updateEvent, deleteEvent } = useTimelineEvents(tripId || '');

  if (!trip) {
    return (
      <div>
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold">Trip not found</h1>
        </div>
      </div>
    );
  }

  // For now, we'll use placeholder data similar to Amalfi example
  const timelineEvents = [
    {
      id: '1',
      date: "Day 1",
      title: "Arrival",
      description: "Begin your journey",
      image: "https://images.unsplash.com/photo-1501854140801-50d01698950b",
      hotel: "Hotel Example",
      hotelDetails: "4-star hotel with great views",
      activities: [
        "Check-in at 3 PM",
        "Welcome dinner",
        "Evening orientation"
      ]
    }
  ];

  const handleEditEvent = (id: string, data: any) => {
    updateEvent.mutate({ id, ...data });
  };

  const handleDeleteEvent = (id: string) => {
    deleteEvent.mutate(id);
  };

  return (
    <div className="min-h-screen bg-sand-50">
      <Navigation />
      
      <HeroSection 
        title={trip.destination}
        date={trip.startDate}
        imageUrl="https://images.unsplash.com/photo-1501854140801-50d01698950b"
      />

      <div className="container mx-auto px-4 py-8">
        <FlightCard
          type="outbound"
          flightNumber="TBD"
          route={`Your City → ${trip.destination}`}
          date={trip.startDate}
          departure="TBD"
          arrival="TBD"
        />
      </div>

      <div className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-earth-500 mb-8">Trip Timeline</h2>
        <div className="space-y-12">
          {timelineEvents.map((event, index) => (
            <div key={event.id}>
              <TimelineEvent
                id={event.id}
                date={event.date}
                title={event.title}
                description={event.description}
                image={event.image}
                hotel={event.hotel}
                hotelDetails={event.hotelDetails}
                activities={event.activities}
                index={index}
                onEdit={handleEditEvent}
                onDelete={handleDeleteEvent}
              />
              {index < timelineEvents.length - 1 && (
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
      </div>

      <div className="container mx-auto px-4 py-8">
        <FlightCard
          type="return"
          flightNumber="TBD"
          route={`${trip.destination} → Your City`}
          date={trip.endDate}
          departure="TBD"
          arrival="TBD"
        />
      </div>
    </div>
  );
};

export default TripDetails;