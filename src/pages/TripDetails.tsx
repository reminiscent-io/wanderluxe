import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from "../components/Navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import HeroSection from "../components/trip/HeroSection";
import TimelineView from "../components/trip/TimelineView";
import BudgetView from "../components/trip/BudgetView";
import PackingView from "../components/trip/PackingView";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, BarChart2, List } from 'lucide-react';

const TripDetails = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const { data: trip, isLoading: tripLoading } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      if (!tripId) throw new Error('No trip ID provided');
      
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
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

      return data;
    },
    retry: false
  });

  if (tripLoading) {
    return (
      <div>
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-[60vh] bg-gray-200 rounded-lg mb-8"></div>
            <div className="h-32 bg-gray-200 rounded-lg mb-8"></div>
            <div className="space-y-12">
              <div className="h-96 bg-gray-200 rounded-lg"></div>
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <Navigation />
      
      <HeroSection 
        title={trip.destination}
        date={`${trip.start_date} - ${trip.end_date}`}
        imageUrl={trip.cover_image_url || "https://images.unsplash.com/photo-1501854140801-50d01698950b"}
      />

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 rounded-xl p-1 bg-transparent">
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
          
          <TabsContent value="timeline">
            <TimelineView tripId={tripId} />
          </TabsContent>
          
          <TabsContent value="budget">
            <BudgetView tripId={tripId} />
          </TabsContent>
          
          <TabsContent value="packing">
            <PackingView tripId={tripId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TripDetails;