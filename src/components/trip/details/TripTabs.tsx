import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TimelineView from "../TimelineView";
import BudgetView from "../BudgetView";
import PackingView from "../PackingView";
import VisionBoardView from "../vision-board/VisionBoardView";
import { Calendar, BarChart2, List, Lightbulb } from 'lucide-react';
import { Trip } from '@/types/trip';

interface TripTabsProps {
  tripId: string | undefined;
  displayData: Trip;
}

const TripTabs: React.FC<TripTabsProps> = ({ tripId, displayData }) => {
  return (
    <Tabs defaultValue="timeline" className="w-full h-[calc(100vh-24rem)] flex flex-col mt-0">
      {/* Update TabsList: use min-w-max instead of w-full */}
      <TabsList className="flex min-w-max overflow-x-auto no-scrollbar mb-8 rounded-xl p-1 bg-transparent gap-2 pl-4 md:pl-1">
        <TabsTrigger 
          value="timeline"
          className="data-[state=active]:bg-earth-500 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-earth-500 px-8 py-4 rounded-lg transition-all duration-200 hover:bg-earth-100 data-[state=active]:hover:bg-earth-600 flex items-center gap-2 flex-shrink-0"
        >
          <Calendar className="w-5 h-5" />
          Timeline
        </TabsTrigger>
        <TabsTrigger 
          value="vision-board"
          className="data-[state=active]:bg-earth-500 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-earth-500 px-8 py-4 rounded-2xl transition-all duration-200 hover:bg-earth-100 data-[state=active]:hover:bg-earth-600 flex items-center gap-2 flex-shrink-0"
        >
          <Lightbulb className="w-5 h-5" />
          Vision Board
        </TabsTrigger>
        <TabsTrigger 
          value="budget"
          className="data-[state=active]:bg-earth-500 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-earth-500 px-8 py-4 rounded-lg transition-all duration-200 hover:bg-earth-100 data-[state=active]:hover:bg-earth-600 flex items-center gap-2 flex-shrink-0"
        >
          <BarChart2 className="w-5 h-5" />
          Budget
        </TabsTrigger>
        <TabsTrigger 
          value="packing"
          className="data-[state=active]:bg-earth-500 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-earth-500 px-8 py-4 rounded-lg transition-all duration-200 hover:bg-earth-100 data-[state=active]:hover:bg-earth-600 flex items-center gap-2 flex-shrink-0"
        >
          <List className="w-5 h-5" />
          Packing List
        </TabsTrigger>
      </TabsList>

      <TabsContent value="vision-board" className="flex-1 overflow-auto">
        <VisionBoardView tripId={tripId} />
      </TabsContent>

      <TabsContent value="timeline" className="flex-1 overflow-auto">
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
      </TabsContent>

      <TabsContent value="budget" className="flex-1 overflow-auto">
        <BudgetView tripId={tripId} />
      </TabsContent>

      <TabsContent value="packing" className="flex-1 overflow-auto">
        <PackingView tripId={tripId} />
      </TabsContent>
    </Tabs>
  );
};

export default TripTabs;
