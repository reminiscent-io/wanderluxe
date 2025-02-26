
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from "../components/Navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import HeroSection from "../components/trip/HeroSection";
import TimelineView from "../components/trip/TimelineView";
import BudgetView from "../components/trip/BudgetView";
import PackingView from "../components/trip/PackingView";
import VisionBoardView from "../components/trip/vision-board/VisionBoardView";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, BarChart2, List, Lightbulb } from 'lucide-react';
import { Trip } from '@/types/trip';

const TripDetails = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  console.log('TripDetails rendering with tripId:', tripId);

  const previousTrip = queryClient.getQueryData<Trip>(['trip', tripId]);

  const { data: trip, isLoading: tripLoading, error: tripError } = useQuery<Trip>({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      if (!tripId) {
        console.error('No trip ID provided');
        throw new Error('No trip ID provided');
      }
      
      console.log('Fetching trip data for ID:', tripId);
      
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
        .maybeSingle();

      if (error) {
        console.error('Error fetching trip:', error);
        toast.error('Failed to load trip details');
        throw error;
      }
      
      if (!data) {
        console.error('Trip not found:', tripId);
        toast.error('Trip not found');
        navigate('/my-trips');
        throw new Error('Trip not found');
      }

      console.log('Trip data fetched successfully:', data);
      return data as Trip;
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    retry: 2,
    enabled: !!tripId,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    placeholderData: previousTrip,
  });

  React.useEffect(() => {
    if (!tripId) return;

    console.log('Setting up real-time subscription for trip:', tripId);

    const channel = supabase
      .channel(`trip-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          console.log('Trip update received:', payload);
          queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accommodations',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          console.log('Accommodation update received:', payload);
          queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);

  // Handle loading state with skeleton UI
  if (tripLoading && !previousTrip) {
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

  // Handle error state
  if (tripError) {
    return (
      <div>
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">Error Loading Trip</h2>
            <p className="text-gray-600 mt-2">Unable to load trip details. Please try again later.</p>
            <button 
              onClick={() => navigate('/my-trips')}
              className="mt-4 px-4 py-2 bg-earth-500 text-white rounded hover:bg-earth-600"
            >
              Return to My Trips
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayData = trip || previousTrip;

  if (!displayData) {
    return (
      <div>
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">Trip Not Found</h2>
            <p className="text-gray-600 mt-2">The requested trip could not be found.</p>
            <button 
              onClick={() => navigate('/my-trips')}
              className="mt-4 px-4 py-2 bg-earth-500 text-white rounded hover:bg-earth-600"
            >
              Return to My Trips
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <div className="w-full" style={{ height: '500px' }}>
        <HeroSection 
          title={displayData.destination}
          imageUrl={displayData.cover_image_url || "https://images.unsplash.com/photo-1578894381163-e72c17f2d45f"}
          arrivalDate={displayData.arrival_date}
          departureDate={displayData.departure_date}
          isLoading={tripLoading && !previousTrip}
        />
      </div>

      <div className="relative flex-1 bg-sand-50/95 w-full z-10">
        <div className="container mx-auto px-4 py-8">
          <Tabs defaultValue="vision-board" className="w-full">
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
                  arrival_date: displayData?.arrival_date || null,
                  departure_date: displayData?.departure_date || null
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
        </div>
      </div>
    </div>
  );
};

export default TripDetails;
