import Navigation from "../components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Trash } from "lucide-react";
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
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);

  const { data: trips = [], refetch } = useQuery({
    queryKey: ['trips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('start_date', { ascending: true });
      
      if (error) {
        console.error('Error fetching trips:', error);
        throw error;
      }
      
      return data || [];
    },
  });

  const handleDeleteTrip = async (tripId: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;

      refetch();
      
      toast({
        title: "Trip deleted",
        description: "Your trip has been successfully deleted.",
      });
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast({
        title: "Error",
        description: "Failed to delete trip. Please try again.",
        variant: "destructive",
      });
    }
    setTripToDelete(null);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingTrips = trips.filter(trip => {
    const endDate = new Date(trip.end_date);
    return endDate >= today;
  });

  const pastTrips = trips.filter(trip => {
    const endDate = new Date(trip.end_date);
    return endDate < today;
  });

  const TripCard = ({ trip }: { trip: Trip }) => (
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
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {trip.destination}
              </h3>
              <p className="text-sm text-gray-500">
                {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
              </p>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-500 hover:text-red-600"
                >
                  <Trash className="h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Trip</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this trip? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteTrip(trip.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
        
        {trips.length === 0 ? (
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