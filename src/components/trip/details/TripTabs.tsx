import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TimelineView from "../TimelineView";
import BudgetView from "../BudgetView";
import BookingView from "../BookingView";
import VisionBoardView from "../vision-board/VisionBoardView";
import ChatView from "../chat/ChatView";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Calendar, BarChart2, List, Lightbulb, MessageCircle } from 'lucide-react';
import { Trip } from '@/types/trip';
import { useTransportationEvents } from '@/hooks/use-transportation-events';

interface TripTabsProps {
  tripId: string | undefined;
  displayData: Trip;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const TripTabs: React.FC<TripTabsProps> = ({ tripId, displayData, activeTab = 'timeline', onTabChange }) => {
  const { transportations } = useTransportationEvents(tripId || '');
  
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full flex flex-col mt-0">
      <div className="w-full overflow-x-auto no-scrollbar flex justify-center">
        <TabsList className="flex w-fit mb-8 rounded-xl p-1 bg-transparent gap-1 md:gap-2 px-2 md:px-4">
        <TabsTrigger 
          value="timeline"
          className="data-[state=active]:bg-earth-500 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-earth-500 px-3 md:px-8 py-3 md:py-4 rounded-lg transition-all duration-200 hover:bg-earth-100 data-[state=active]:hover:bg-earth-600 flex items-center gap-1 md:gap-2 flex-shrink-0 text-sm md:text-base"
        >
          <Calendar className="w-4 h-4 md:w-5 md:h-5" />
          Timeline
        </TabsTrigger>
        <TabsTrigger 
          value="chat"
          className="data-[state=active]:bg-earth-500 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-earth-500 px-3 md:px-8 py-3 md:py-4 rounded-lg transition-all duration-200 hover:bg-earth-100 data-[state=active]:hover:bg-earth-600 flex items-center gap-1 md:gap-2 flex-shrink-0 text-sm md:text-base"
        >
          <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
          Chat
        </TabsTrigger>
        <TabsTrigger 
          value="vision-board"
          className="data-[state=active]:bg-earth-500 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-earth-500 px-3 md:px-8 py-3 md:py-4 rounded-lg md:rounded-2xl transition-all duration-200 hover:bg-earth-100 data-[state=active]:hover:bg-earth-600 flex items-center gap-1 md:gap-2 flex-shrink-0 text-sm md:text-base"
        >
          <Lightbulb className="w-4 h-4 md:w-5 md:h-5" />
          Vision
        </TabsTrigger>
        <TabsTrigger 
          value="budget"
          className="data-[state=active]:bg-earth-500 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-earth-500 px-3 md:px-8 py-3 md:py-4 rounded-lg transition-all duration-200 hover:bg-earth-100 data-[state=active]:hover:bg-earth-600 flex items-center gap-1 md:gap-2 flex-shrink-0 text-sm md:text-base"
        >
          <BarChart2 className="w-4 h-4 md:w-5 md:h-5" />
          Budget
        </TabsTrigger>
        <TabsTrigger 
          value="booking"
          className="data-[state=active]:bg-earth-500 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-earth-500 px-3 md:px-8 py-3 md:py-4 rounded-lg transition-all duration-200 hover:bg-earth-100 data-[state=active]:hover:bg-earth-600 flex items-center gap-1 md:gap-2 flex-shrink-0 text-sm md:text-base"
        >
          <List className="w-4 h-4 md:w-5 md:h-5" />
          Booking
        </TabsTrigger>
      </TabsList>
      </div>

      <TabsContent value="vision-board" className="flex-1 overflow-auto">
        <VisionBoardView tripId={tripId} />
      </TabsContent>

      <TabsContent value="timeline" className="flex-1 overflow-auto">
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
          />
        </ErrorBoundary>
      </TabsContent>

      <TabsContent value="chat" className="flex-1 overflow-auto">
        <ChatView tripId={tripId || ''} />
      </TabsContent>

      <TabsContent value="budget" className="flex-1 overflow-auto">
        <BudgetView tripId={tripId} />
      </TabsContent>

      <TabsContent value="booking" className="flex-1 overflow-auto">
        <BookingView tripId={tripId} />
      </TabsContent>

      {/* Timeline subsections */}
      <TabsContent value="trip-dates" className="flex-1 overflow-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-earth-700 mb-6">Trip Dates</h2>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-sand-700 mb-2">Arrival Date</label>
                <p className="text-lg text-earth-600">
                  {displayData?.arrival_date ? new Date(displayData.arrival_date).toLocaleDateString() : 'Not set'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-sand-700 mb-2">Departure Date</label>
                <p className="text-lg text-earth-600">
                  {displayData?.departure_date ? new Date(displayData.departure_date).toLocaleDateString() : 'Not set'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="accommodations" className="flex-1 overflow-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-earth-700 mb-6">Accommodations</h2>
          <div className="space-y-4">
            {displayData?.accommodations && displayData.accommodations.length > 0 ? (
              displayData.accommodations.map((accommodation, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-earth-600 mb-2">{accommodation.hotel}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-sand-600">
                    <div>
                      <span className="font-medium">Address:</span> {accommodation.hotel_address}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {accommodation.hotel_phone}
                    </div>
                    <div>
                      <span className="font-medium">Cost:</span> {accommodation.cost} {accommodation.currency}
                    </div>
                  </div>
                  {accommodation.hotel_details && (
                    <p className="mt-3 text-sand-600">{accommodation.hotel_details}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <p className="text-sand-600">No accommodations added yet</p>
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="transportation" className="flex-1 overflow-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-earth-700 mb-6">Transportation</h2>
          <div className="space-y-4">
            {displayData?.transportation && displayData.transportation.length > 0 ? (
              displayData.transportation.map((transport, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-earth-600 mb-2">
                    {transport.type.charAt(0).toUpperCase() + transport.type.slice(1)}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-sand-600">
                    <div>
                      <span className="font-medium">From:</span> {transport.from_location}
                    </div>
                    <div>
                      <span className="font-medium">To:</span> {transport.to_location}
                    </div>
                    <div>
                      <span className="font-medium">Cost:</span> {transport.cost} {transport.currency}
                    </div>
                  </div>
                  {transport.details && (
                    <p className="mt-3 text-sand-600">{transport.details}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <p className="text-sand-600">No transportation added yet</p>
              </div>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default TripTabs;
