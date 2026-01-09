import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import HeroSection from "../components/trip/HeroSection";
import Sidebar, { SidebarHandle } from "@/components/layout/Sidebar";
import BottomNavigation from "@/components/layout/BottomNavigation";
import QuickAddSheet from "@/components/layout/QuickAddSheet";
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

  const activeTab = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/timeline')) return 'timeline';
    if (path.includes('/budget')) return 'budget';
    if (path.includes('/booking')) return 'booking';
    if (path.includes('/chat')) return 'chat';
    if (path.includes('/vision-board')) return 'vision-board';
    return 'timeline';
  }, [location.pathname]);

  useEffect(() => {
    if (tripId && location.pathname === `/trip/${tripId}`) {
      navigate(`/trip/${tripId}/timeline`, { replace: true });
    }
  }, [tripId, location.pathname, navigate]);

  const { trip, tripLoading, tripError, previousTrip } = useTripQuery(tripId);
  useTripSubscription(tripId);

  // Quick add sheet state
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Ref to access Sidebar methods
  const sidebarRef = useRef<SidebarHandle>(null);

  const handleQuickAddAction = (action: "accommodation" | "transportation" | "activity" | "dining" | "import") => {
    // Open the appropriate dialog or navigate based on the action
    switch (action) {
      case "accommodation":
        sidebarRef.current?.openAccommodationDialog();
        break;
      case "transportation":
        sidebarRef.current?.openTransportationDialog();
        break;
      case "activity":
        sidebarRef.current?.openActivityDialog();
        break;
      case "dining":
        sidebarRef.current?.openReservationDialog();
        break;
      case "import":
        // Navigate to chat view for AI import/scan
        navigate(`/trip/${tripId}/chat`);
        break;
    }
  };

  if (tripLoading && !previousTrip) return <TripDetailsSkeleton />;
  if (permissionsLoading) return <TripDetailsSkeleton />;
  if (tripError) return <TripDetailsError />;

  const displayData = trip || previousTrip;
  if (!displayData) return <TripDetailsError message="The requested trip could not be found." />;

  if (!canView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sand-50 via-sand-50 to-earth-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="bg-earth-100 rounded-full p-4 w-20 h-20 mx-auto mb-6">
            <Lock className="h-12 w-12 text-earth-600 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-earth-800 mb-3">Access Restricted</h2>
          <p className="text-earth-600 mb-6">
            {session
              ? "You don't have permission to view this trip. Please contact the trip owner for access."
              : "This is a private trip. Please sign in to continue."}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate(-1)} variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            {!session && (
              <Button onClick={() => navigate('/auth')} className="bg-earth-600 hover:bg-earth-700 text-white">
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

  const sidebar = <Sidebar ref={sidebarRef} tripId={tripId} activeTab={activeTab} onTabChange={handleTabChange} />;

  return (
    // Offset the page content by the fixed navbar height so the hero touches the bottom of the nav
    <div className="flex min-h-screen">
      {sidebar}
      <main className="flex-1 pl-0 md:pl-[280px] transition-all duration-300">
        <div className="min-h-screen flex flex-col">
          {/* Global header is already fixed via AppLayout; no page-level header here */}

          {/* Ensure no unintended top margin before the hero */}
          <div className="w-full mt-0">
            <HeroSection
              tripId={tripId}
              title={displayData.destination}
              imageUrl={displayData.cover_image_url || "https://images.unsplash.com/photo-1578894381163-e72c17f2d45f"}
              arrivalDate={displayData.arrival_date}
              departureDate={displayData.departure_date}
              isLoading={tripLoading && !previousTrip}
              canEdit={canEdit}
            />
          </div>

          <div className="relative flex-1 bg-sand-50/95 w-full z-10">
            <div className="max-w-none mx-auto px-4 py-8 pb-24 md:pb-8">
              {!canEdit && (
                <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700 font-medium">
                        {session
                          ? "You're viewing this trip in read-only mode. Contact the trip owner for edit access."
                          : "You're viewing this public trip. Sign in to create your own trips!"}
                      </p>
                    </div>
                    {!session && (
                      <div className="ml-auto">
                        <Button onClick={() => navigate('/auth')} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                          Sign In
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'timeline' && (
                <ErrorBoundary>
                  <TimelineView
                    tripId={tripId}
                    tripDates={{
                      arrival_date: displayData?.arrival_date && displayData.arrival_date.trim() !== '' ? displayData.arrival_date : null,
                      departure_date: displayData?.departure_date && displayData.departure_date.trim() !== '' ? displayData.departure_date : null
                    }}
                    tripDestination={displayData.destination}
                    canEdit={canEdit}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 'chat' && <ChatView tripId={tripId || ''} canEdit={canEdit} />}
              {activeTab === 'vision-board' && <VisionBoardView tripId={tripId} canEdit={canEdit} />}
              {activeTab === 'budget' && <BudgetView tripId={tripId} canEdit={canEdit} />}
              {activeTab === 'booking' && <BookingView tripId={tripId} canEdit={canEdit} />}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNavigation
        tripId={tripId}
        onQuickAddClick={() => setQuickAddOpen(true)}
        onDetailsClick={() => sidebarRef.current?.openSidebarSheet()}
      />

      {/* Quick Add Sheet */}
      <QuickAddSheet
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onSelectAction={handleQuickAddAction}
      />
    </div>
  );
};

export default TripDetails;
