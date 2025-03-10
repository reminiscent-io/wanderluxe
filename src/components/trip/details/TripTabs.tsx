
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
    <Tabs defaultValue="timeline" className="w-full mt-0">
      <TabsList className="grid w-full grid-cols-4 mb-8 rounded-xl p-1 bg-transparent">
        <TabsTrigger 
          value="vision-board"
          className="data-[state=active]:bg-earth-500 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-earth-500 px-8 py-4 rounded-lg transition-all duration-200 hover:bg-earth-100 data-[state=active]:hover:bg-earth-600 flex items-center gap-2"
        >
          <Lightbulb className="w-5 h-5" />
          Vision Board
        </TabsTrigger>
        <TabsTrigger 
          value="timeline"
          className="data-[state=active]:bg-earth-500 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-earth-500 px-8 py-4 rounded-lg transition-all duration-200 hover:bg-earth-100 data-[state=active]:hover:bg-earth-600 flex items-center gap-2"
        >
          <Calendar className="w-5 h-5" />
          Timeline
        </TabsTrigger>
        <TabsTrigger 
          value="budget"
          className="data-[state=active]:bg-earth-500 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-earth-500 px-8 py-4 rounded-lg transition-all duration-200 hover:bg-earth-100 data-[state=active]:hover:bg-earth-600 flex items-center gap-2"
        >
          <BarChart2 className="w-5 h-5" />
          Budget
        </TabsTrigger>
        <TabsTrigger 
          value="packing"
          className="data-[state=active]:bg-earth-500 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-earth-500 px-8 py-4 rounded-lg transition-all duration-200 hover:bg-earth-100 data-[state=active]:hover:bg-earth-600 flex items-center gap-2"
        >
          <List className="w-5 h-5" />
          Packing List
        </TabsTrigger>
      </TabsList>
        
      <TabsContent value="vision-board">
        <VisionBoardView tripId={tripId} />
      </TabsContent>

      <TabsContent value="timeline">
        <TimelineView 
          tripId={tripId}
          tripDates={{
            arrival_date: displayData.arrival_date,
            departure_date: displayData.departure_date,
            arrivalDate: displayData.arrival_date,
            departureDate: displayData.departure_date
          }}
        />
      </TabsContent>
        
      <TabsContent value="budget">
        <BudgetView tripId={tripId} />
      </TabsContent>
        
      <TabsContent value="packing">
        <PackingView tripId={tripId} />
      </TabsContent>
    </Tabs>
  );
};

export default TripTabs;
