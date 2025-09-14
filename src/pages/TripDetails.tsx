import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Navigation from "../components/Navigation";
import HeroSection from "../components/trip/HeroSection";
import Sidebar from "@/components/layout/Sidebar";
import { useTripQuery } from '@/hooks/useTripQuery';
import { useTripSubscription } from '@/components/trip/details/useTripSubscription';
import TripDetailsSkeleton from '@/components/trip/details/TripDetailsSkeleton';
import TripDetailsError from '@/components/trip/details/TripDetailsError';
import TimelineView from "../components/trip/TimelineView";
import BudgetView from "../components/trip/BudgetView";
import BookingView from "../components/trip/BookingView";
import VisionBoardView from "../components/trip/vision-board/VisionBoardView";
import ChatView from "../components/trip/chat/ChatView";
import ErrorBoundary from "@/components/ErrorBoundary";


const TripDetails = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const [activeTab, setActiveTab] = useState('timeline');

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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const sidebar = <Sidebar tripId={tripId} activeTab={activeTab} onTabChange={handleTabChange} />;

  return (
    <div className="flex min-h-screen">
      {sidebar}
      <main className="flex-1 pl-0 md:pl-[280px] transition-all duration-300">
        <div className="min-h-screen flex flex-col">
          <Navigation mobileMenuTrigger={sidebar} />

          <div className="w-full">
            <HeroSection 
              tripId={tripId}
              title={displayData.destination}
              imageUrl={displayData.cover_image_url || "https://images.unsplash.com/photo-1578894381163-e72c17f2d45f"} //Default Trip Hero Image
              arrivalDate={displayData.arrival_date}
              departureDate={displayData.departure_date}
              isLoading={tripLoading && !previousTrip}
            />
          </div>

          <div className="relative flex-1 bg-sand-50/95 w-full z-10 -mt-1">
            <div className="max-w-full mx-auto px-4 py-8">
              {/* Render content based on active tab */}
              {activeTab === 'timeline' && (
                <ErrorBoundary>
                  <TimelineView 
                    tripId={tripId}
                    tripDates={{
                      arrival_date: displayData?.arrival_date && displayData.arrival_date.trim() !== '' 
                        ? displayData.arrival_date 
                        : null,
                      departure_date: displayData?.departure_date && displayData.departure_date.trim() !== '' 
                        ? displayData.departure_date 
                        : null
                    }}
                    tripDestination={displayData.destination}
                  />
                </ErrorBoundary>
              )}
              
              {activeTab === 'chat' && (
                <ChatView tripId={tripId || ''} />
              )}
              
              {activeTab === 'vision-board' && (
                <VisionBoardView tripId={tripId} />
              )}
              
              {activeTab === 'budget' && (
                <BudgetView tripId={tripId} />
              )}
              
              {activeTab === 'booking' && (
                <BookingView tripId={tripId} />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TripDetails;