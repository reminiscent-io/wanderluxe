import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from "../components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import TripCard from '../components/trip/TripCard';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Trip } from '@/types/trip';
import { useAuth } from "@/contexts/AuthContext";
import { Plus } from 'lucide-react';

const MyTrips = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { session } = useAuth();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!session) {
      navigate('/auth');
    }
  }, [session, navigate]);

  const { data: trips, isLoading } = useQuery({
    queryKey: ['my-trips'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('trips')
        .select(`*`)
        .eq('user_id', user.id)
        .eq('hidden', false)
        .order('arrival_date', { ascending: true });

      if (error) throw error;
      return data as Trip[];
    },
    enabled: !!session // Only run query if user is authenticated
  });

  const handleHideTrip = async (tripId: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ hidden: true })
        .eq('trip_id', tripId);

      if (error) throw error;

      toast.success('Trip hidden successfully');
      queryClient.invalidateQueries({ queryKey: ['my-trips'] });
    } catch (error) {
      console.error('Error hiding trip:', error);
      toast.error('Failed to hide trip');
    }
  };

  const handleDeleteTrip = async () => {
    if (!selectedTrip) return;

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('trip_id', selectedTrip.trip_id);

      if (error) throw error;

      toast.success('Trip deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedTrip(null);
      queryClient.invalidateQueries({ queryKey: ['my-trips'] });
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast.error('Failed to delete trip');
    }
  };

  const filteredTrips = trips?.filter(trip =>
    trip.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!session) {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="flex flex-col min-h-screen bg-sand-50">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="mb-12 text-center">
          <div className="h-px bg-earth-200 max-w-[1024px] mx-auto mb-8"></div>
          <h1 className="text-4xl font-light tracking-tight text-earth-900">My Trips</h1>
          <div className="h-px bg-earth-200 max-w-[1024px] mx-auto mt-8"></div>
        </div>

        <Input
          type="search"
          placeholder="Search trips..."
          className="max-w-sm mb-6"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 bg-gray-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips?.map((trip) => (
              <TripCard
                key={trip.trip_id}
                trip={{
                  ...trip,
                  cover_image_url: trip.cover_image_url || 'https://images.unsplash.com/photo-1501854140801-50d01698950b'
                }}
                onHide={() => handleHideTrip(trip.trip_id)}
              />
            ))}
          </div>
        )}

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the trip
                and all its associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTrip}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default MyTrips;
