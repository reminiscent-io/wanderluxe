import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from "../components/Navigation";
import HeroSection from "../components/trip/HeroSection";
import FlightCard from "../components/trip/FlightCard";
import TimelineEvent from "../components/trip/TimelineEvent";
import TransportationCard from "../components/trip/TransportationCard";
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const TripDetails = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();

  // Fetch trip details from Supabase
  const { data: trip, isLoading: tripLoading } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      if (!tripId) throw new Error('No trip ID provided');
      
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (error) {
        console.error('Error fetching trip:', error);
        toast.error('Failed to load trip details');
        throw error;
      }
      
      if (!data) {
        toast.error('Trip not found');
        navigate('/my-trips');
        throw new Error('Trip not found');
      }

      return data;
    },
    retry: false
  });

  const { events, isLoading: eventsLoading, updateEvent, deleteEvent } = useTimelineEvents(tripId);

  if (tripLoading || eventsLoading) {
    return (
      <div>
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-[60vh] bg-gray-200 rounded-lg mb-8"></div>
            <div className="h-32 bg-gray-200 rounded-lg mb-8"></div>
            <div className="space-y-12">
              <div className="h-96 bg-gray-200 rounded-lg"></div>
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return null;
  }

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
        date={`${trip.start_date} - ${trip.end_date}`}
        imageUrl={trip.cover_image_url || "https://images.unsplash.com/photo-1501854140801-50d01698950b"}
      />

      <div className="container mx-auto px-4 py-8">
        <FlightCard
          type="outbound"
          flightNumber="DL582"
          route="New York (JFK) → Naples (NAP)"
          date="June 1, 2024"
          departure="7:55 PM EDT"
          arrival="10:15 AM CEST"
        />
      </div>

      <div className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-earth-500 mb-8">Trip Timeline</h2>
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
                    ? "https://images.unsplash.com/photo-1516483638261-f4dbaf036963" // Naples cityscape
                    : event.title.includes('Positano')
                    ? "https://images.unsplash.com/photo-1533606688076-b6683a5f59f1" // Classic Positano view
                    : event.image_url || 'https://images.unsplash.com/photo-1501854140801-50d01698950b'
                }
                hotel={event.hotel || ''}
                hotelDetails={event.hotel_details || ''}
                activities={event.activities || []}
                index={index}
                onEdit={handleEditEvent}
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
      </div>

      <div className="container mx-auto px-4 py-8">
        <FlightCard
          type="return"
          flightNumber="DL585"
          route="Naples (NAP) → New York (JFK)"
          date="June 8, 2024"
          departure="11:45 AM CEST"
          arrival="3:25 PM EDT"
        />
      </div>
    </div>
  );
};

export default TripDetails;