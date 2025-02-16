import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from "../components/Navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import HeroSection from "../components/trip/HeroSection";
import TimelineView from "../components/trip/TimelineView";
import BudgetView from "../components/trip/BudgetView";
import PackingView from "../components/trip/PackingView";
import VisionBoardView from "../components/trip/vision-board/VisionBoardView";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, BarChart2, List, Lightbulb } from 'lucide-react';

const TripDetails = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();

  console.log('TripDetails rendering with tripId:', tripId);

  const { data: trip, isLoading: tripLoading } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      if (!tripId) throw new Error('No trip ID provided');
      
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          accommodations(
            stay_id,
            hotel,
            hotel_details,
            hotel_url,
            hotel_checkin_date,
            hotel_checkout_date,
            cost,
            currency,
            hotel_address,
            hotel_phone,
            hotel_place_id,
            hotel_website
          )
        `)
        .eq('trip_id', tripId)
        .single();

      if (error) {
        console.error('Error fetching trip:', error);
        toast.error('Failed to load trip details');
        throw error;
      }
      
      if (!data) {
        toast.error('Trip not found');
        navigate('/my-trips');
        throw new Error('Trip not found');
      }

      console.log('Trip data fetched:', data);
      return data;
    },
    retry: false
  });

  if (tripLoading) {
    return (
      <div>
        <Navigation />
        <div className="h-[500px] w-full bg-gray-200 animate-pulse" />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
            <div className="h-96 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <div className="w-full" style={{ height: '500px' }}>
        <HeroSection 
          title={trip.destination || 'No Title Available'}
          date={`${trip.arrival_date} - ${trip.departure_date}`}
          imageUrl={trip.cover_image_url || "https://images.unsplash.com/photo-1578894381163-e72c17f2d45f"}
          arrivalDate={trip.arrival_date}
          departureDate={trip.departure_date}
        />
      </div>

      <div className="flex-1 bg-sand-50/95 w-full">
        <div className="container mx-auto px-4 py-8">
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8 rounded-xl p-1 bg-transparent">
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
              <TabsTrigger 
                value="vision-board"
                className="data-[state=active]:bg-earth-500 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-earth-500 px-8 py-4 rounded-lg transition-all duration-200 hover:bg-earth-100 data-[state=active]:hover:bg-earth-600 flex items-center gap-2"
              >
                <Lightbulb className="w-5 h-5" />
                Vision Board
              </TabsTrigger>
            </TabsList>
              
            <TabsContent value="timeline">
              <TimelineView tripId={tripId} />
            </TabsContent>
              
            <TabsContent value="budget">
              <BudgetView tripId={tripId} />
            </TabsContent>
              
            <TabsContent value="packing">
              <PackingView tripId={tripId} />
            </TabsContent>

            <TabsContent value="vision-board">
              <VisionBoardView tripId={tripId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default TripDetails;
