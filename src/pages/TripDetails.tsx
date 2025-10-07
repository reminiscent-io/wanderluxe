import React, { useMemo, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
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
import { useTripPermissions } from '@/hooks/use-trip-permissions';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";

const TripDetails = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { canView, canEdit, isLoading: permissionsLoading } = useTripPermissions(tripId);
  
  // Determine active tab from URL
  const activeTab = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/timeline')) return 'timeline';
    if (path.includes('/budget')) return 'budget';
    if (path.includes('/booking')) return 'booking';
    if (path.includes('/chat')) return 'chat';
    if (path.includes('/vision-board')) return 'vision-board';
    return 'timeline'; // default
  }, [location.pathname]);
  
  // Redirect to timeline if at base trip URL
  useEffect(() => {
    if (tripId && location.pathname === `/trip/${tripId}`) {
      navigate(`/trip/${tripId}/timeline`, { replace: true });
    }
  }, [tripId, location.pathname, navigate]);

  // Use the custom hook for trip data fetching
  const { trip, tripLoading, tripError, previousTrip } = useTripQuery(tripId);

  // Use the custom hook for real-time subscriptions
  useTripSubscription(tripId);

  // Handle loading state with skeleton UI
  if (tripLoading && !previousTrip) {
    return <TripDetailsSkeleton />;
  }

  // Handle permissions loading
  if (permissionsLoading) {
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

  // Handle access denied - user cannot view this trip
  if (!canView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sand-50 via-sand-50 to-earth-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="bg-earth-100 rounded-full p-4 w-20 h-20 mx-auto mb-6">
            <Lock className="h-12 w-12 text-earth-600 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-earth-800 mb-3">
            Access Restricted
          </h2>
          <p className="text-earth-600 mb-6">
            {session 
              ? "You don't have permission to view this trip. Please contact the trip owner for access."
              : "This is a private trip. Please sign in to continue."}
          </p>
          <div className="flex gap-3 justify-center">
            <Button 
              onClick={() => navigate(-1)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            {!session && (
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-earth-600 hover:bg-earth-700 text-white"
              >
                Sign In
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  const handleTabChange = (tab: string) => {
    navigate(`/trip/${tripId}/${tab}`);
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
            <div className="max-w-none mx-auto px-4 py-8">
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