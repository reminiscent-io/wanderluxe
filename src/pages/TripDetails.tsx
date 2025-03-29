import React from 'react';
import { useParams } from 'react-router-dom';
import Navigation from "../components/Navigation";
import HeroSection from "../components/trip/HeroSection";
import { useTripQuery } from '@/hooks/useTripQuery';
import { useTripSubscription } from '@/components/trip/details/useTripSubscription';
import TripDetailsSkeleton from '@/components/trip/details/TripDetailsSkeleton';
import TripDetailsError from '@/components/trip/details/TripDetailsError';
import TripTabs from '@/components/trip/details/TripTabs';
import AccommodationsSection from '@/components/trip/AccommodationsSection';
import TransportationSection from '@/components/trip/TransportationSection';


const TripDetails = () => {
  const { tripId } = useParams<{ tripId: string }>();

  console.log('TripDetails rendering with tripId:', tripId);

  // Use the custom hook for trip data fetching
  const { trip, tripLoading, tripError, previousTrip } = useTripQuery(tripId);

  // Use the custom hook for real-time subscriptions
  useTripSubscription(tripId);

  // Handle loading state with skeleton UI
  if (tripLoading && !previousTrip) {
    return <TripDetailsSkeleton />;
  }

  // Handle error state
  if (tripError) {
    return <TripDetailsError />;
  }

  const displayData = trip || previousTrip;

  // If no data is available
  if (!displayData) {
    return <TripDetailsError message="The requested trip could not be found." />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <div className="w-full">
        <HeroSection 
          title={displayData.destination}
          imageUrl={displayData.cover_image_url || "https://images.unsplash.com/photo-1578894381163-e72c17f2d45f"} //Default Trip Hero Image
          arrivalDate={displayData.arrival_date}
          departureDate={displayData.departure_date}
          isLoading={tripLoading && !previousTrip}
        />
      </div>

      <div className="relative flex-1 bg-sand-50/95 w-full z-10 -mt-1">
        <div className="container mx-auto px-4 py-8">
          <TripTabs tripId={tripId} displayData={displayData} />
        </div>
      </div>
    </div>
  );
};

export default TripDetails;
