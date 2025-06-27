import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Navigation from "../components/Navigation";
import HeroSection from "../components/trip/HeroSection";
import Sidebar from "@/components/layout/Sidebar";
import SecondarySidebar from "@/components/layout/SecondarySidebar";
import { useTripQuery } from '@/hooks/useTripQuery';
import { useTripSubscription } from '@/components/trip/details/useTripSubscription';
import TripDetailsSkeleton from '@/components/trip/details/TripDetailsSkeleton';
import TripDetailsError from '@/components/trip/details/TripDetailsError';
import TripTabs from '@/components/trip/details/TripTabs';
import AccommodationsSection from '@/components/trip/AccommodationsSection';
import TransportationSection from '@/components/trip/TransportationSection';
import { cn } from '@/lib/utils';


const TripDetails = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const [activeTab, setActiveTab] = useState('timeline');
  const [secondarySidebarOpen, setSecondarySidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

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

  const handleSubItemClick = (subItemId: string) => {
    setActiveSection(subItemId);
    setSecondarySidebarOpen(true);
  };

  const handleCloseSecondarySidebar = () => {
    setSecondarySidebarOpen(false);
    setActiveSection(null);
  };

  const sidebar = <Sidebar 
    tripId={tripId} 
    activeTab={activeTab} 
    onTabChange={handleTabChange}
    onSubItemClick={handleSubItemClick}
  />;

  return (
    <div className="flex min-h-screen">
      {sidebar}
      <SecondarySidebar 
        isOpen={secondarySidebarOpen}
        onClose={handleCloseSecondarySidebar}
        activeSection={activeSection}
        tripId={tripId}
        displayData={displayData}
      />
      <main className={`flex-1 pl-0 md:pl-[280px] transition-all duration-300 ${secondarySidebarOpen ? "md:pl-[600px]" : "md:pl-[280px]"}`}>
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
            <div className="container mx-auto px-4 py-8">
              <TripTabs tripId={tripId} displayData={displayData} activeTab={activeTab} onTabChange={handleTabChange} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TripDetails;