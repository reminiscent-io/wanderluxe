import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navigation from "../components/Navigation";
import HeroSection from "../components/trip/HeroSection";
import { useTripQuery } from '@/hooks/useTripQuery';
import { useTripSubscription } from '@/components/trip/details/useTripSubscription';
import TripDetailsSkeleton from '@/components/trip/details/TripDetailsSkeleton';
import TripDetailsError from '@/components/trip/details/TripDetailsError';
import TripTabs from '@/components/trip/details/TripTabs';

const TripDetails = () => {
  const { tripId } = useParams<{ tripId: string }>();

  console.log('TripDetails rendering with tripId:', tripId);

  // Add state to preserve trip data across renders
  const [cachedTripData, setCachedTripData] = useState(null);

  // Use the custom hook for trip data fetching
  const { data: tripData, isLoading, isError, error } = useTripQuery(tripId);

  // Use the custom hook for real-time subscriptions
  useTripSubscription(tripId);

  // Update cached data when new data arrives, but only if it has valid values
  useEffect(() => {
    if (tripData) {
      console.log('New trip data received:', tripData);
      // Only update cached data if the new data has valid values
      if (tripData.destination && tripData.arrival_date && tripData.departure_date) {
        console.log('Updating cached trip data with valid new data');
        setCachedTripData(tripData);
      } else {
        console.log('New trip data is missing essential fields, keeping cached data');
      }
    }
  }, [tripData]);

  // Use cached data if available, otherwise use the latest trip data
  const displayData = cachedTripData || tripData;

  // Handle loading state with skeleton UI
  if (isLoading && !displayData) {
    return <TripDetailsSkeleton />;
  }

  // Handle error state
  if (isError) {
    return <TripDetailsError error={error} />;
  }

  // Don't render if we don't have data yet
  if (!displayData) {
    return <TripDetailsSkeleton />;
  }

  console.log('Rendering TripDetails with data:', {
    destination: displayData.destination,
    arrival_date: displayData.arrival_date,
    departure_date: displayData.departure_date
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <div className="w-full" style={{ height: '500px' }}>
        <HeroSection 
          title={displayData.destination}
          imageUrl={displayData.cover_image_url || "https://images.unsplash.com/photo-1578894381163-e72c17f2d45f"}
          arrivalDate={displayData.arrival_date}
          departureDate={displayData.departure_date}
          isLoading={isLoading && !cachedTripData}
        />
      </div>

      <div className="relative flex-1 bg-sand-50/95 w-full z-10">
        <div className="container mx-auto px-4 py-8">
          <TripTabs tripId={tripId} displayData={displayData} />
        </div>
      </div>
    </div>
  );
};

export default TripDetails;