import Navigation from "../components/Navigation";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import TripCard from "@/components/trip/TripCard";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Trip = Tables<"trips"> & {
  timeline_events: { date: string }[];
};

interface TripsData {
  userTrips: Trip[];
  exampleTrips: Trip[];
}

const MyTrips = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tripToHide] = useState<string | null>(null);

  const { data: trips = { userTrips: [], exampleTrips: [] }, refetch } = useQuery<TripsData>({
    queryKey: ['trips'],
    queryFn: async () => {
      const { data: userTrips, error: userError } = await supabase
        .from('trips')
        .select('*, timeline_events(date)')
        .neq('destination', 'Amalfi Coast')
        .order('start_date', { ascending: true });
      
      const { data: exampleTrips, error: exampleError } = await supabase
        .from('trips')
        .select('*, timeline_events(date)')
        .eq('destination', 'Amalfi Coast')
        .order('start_date', { ascending: true });
      
      if (userError || exampleError) throw userError || exampleError;
      
      return {
        userTrips: userTrips || [],
        exampleTrips: exampleTrips || []
      };
    },
  });

  const handleHideTrip = async (tripId: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ hidden: true })
        .eq('id', tripId);

      if (error) throw error;

      refetch();
      
      toast({
        title: "Trip hidden",
        description: "Your trip has been hidden from your view.",
      });
    } catch (error) {
      console.error('Error hiding trip:', error);
      toast({
        title: "Error",
        description: "Failed to hide trip. Please try again.",
        variant: "destructive",
      });
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const userTrips = trips.userTrips || [];
  const exampleTrips = trips.exampleTrips || [];

  const upcomingTrips = userTrips.filter(trip => {
    const endDate = trip.timeline_events?.length > 0 
      ? new Date(trip.timeline_events[trip.timeline_events.length - 1].date)
      : new Date(trip.end_date);
    return endDate >= today;
  });

  const pastTrips = userTrips.filter(trip => {
    const endDate = trip.timeline_events?.length > 0 
      ? new Date(trip.timeline_events[trip.timeline_events.length - 1].date)
      : new Date(trip.end_date);
    return endDate < today;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 pt-24">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">My Trips</h1>
        
        {exampleTrips.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Example Trips</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-5 w-5 text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Explore our curated example trips for inspiration
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exampleTrips.map((trip) => (
                <TripCard 
                  key={trip.id} 
                  trip={trip} 
                  isExample={true}
                  onHide={handleHideTrip}
                />
              ))}
            </div>
          </section>
        )}

        {userTrips.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">You haven't created any trips yet.</p>
            <button
              onClick={() => navigate("/create-trip")}
              className="text-earth-500 hover:text-earth-600 font-medium"
            >
              Create your first trip
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {upcomingTrips.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Upcoming Trips</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingTrips.map((trip) => (
                    <TripCard 
                      key={trip.id} 
                      trip={trip}
                      onHide={handleHideTrip}
                    />
                  ))}
                </div>
              </section>
            )}

            {pastTrips.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Past Trips</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastTrips.map((trip) => (
                    <TripCard 
                      key={trip.id} 
                      trip={trip}
                      onHide={handleHideTrip}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTrips;