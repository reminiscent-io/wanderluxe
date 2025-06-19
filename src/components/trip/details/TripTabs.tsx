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

interface TripTabsProps {
  tripId: string | undefined;
  displayData: Trip;
}

const TripTabs: React.FC<TripTabsProps> = ({ tripId, displayData }) => {
  return (
    <Tabs defaultValue="timeline" className="w-full flex flex-col mt-0">
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
    </Tabs>
  );
};

export default TripTabs;
