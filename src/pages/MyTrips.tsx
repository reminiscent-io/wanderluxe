import Navigation from "../components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { EyeOff, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface Trip {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
}

const MyTrips = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tripToHide, setTripToHide] = useState<string | null>(null);

  const { data: trips = [], refetch } = useQuery({
    queryKey: ['trips'],
    queryFn: async () => {
      const { data: userTrips, error: userError } = await supabase
        .from('trips')
        .select('*')
        .neq('destination', 'Amalfi Coast')
        .order('start_date', { ascending: true });
      
      const { data: exampleTrips, error: exampleError } = await supabase
        .from('trips')
        .select('*')
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
    setTripToHide(null);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const userTrips = trips.userTrips || [];
  const exampleTrips = trips.exampleTrips || [];

  const upcomingTrips = userTrips.filter(trip => {
    const endDate = new Date(trip.end_date);
    return endDate >= today;
  });

  const pastTrips = userTrips.filter(trip => {
    const endDate = new Date(trip.end_date);
    return endDate < today;
  });

  const TripCard = ({ trip, isExample = false }: { trip: Trip, isExample?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div 
              className="cursor-pointer flex-grow"
              onClick={() => navigate(`/trip/${trip.id}`)}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold text-gray-900">
                  {trip.destination}
                </h3>
                {isExample && (
                  <Info className="h-5 w-5 text-gray-500" title="Example Trip" />
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
              </p>
            </div>
            
            {!isExample && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-500 hover:text-gray-600"
                  >
                    <EyeOff className="h-5 w-5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hide Trip</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to hide this trip? You won't be able to see it in your trips list anymore.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleHideTrip(trip.id)}
                      className="bg-gray-600 hover:bg-gray-700"
                    >
                      Hide
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 pt-24">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">My Trips</h1>
        
        {exampleTrips.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Example Trips</h2>
              <Info className="h-5 w-5 text-gray-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exampleTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} isExample={true} />
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
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              </section>
            )}

            {pastTrips.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Past Trips</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastTrips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} />
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