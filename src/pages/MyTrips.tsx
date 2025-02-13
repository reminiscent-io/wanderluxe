
import React, { useState } from 'react';
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

const MyTrips = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
    }
  });

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

  return (
    <div>
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">My Trips</h1>
          <Button onClick={() => navigate('/trips/create')}>
            '' // Create New Trip
          </Button>
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
                trip={trip}
                onHide={() => {}}
              />
            ))}
          </div>
        )}
      </div>

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
  );
};

export default MyTrips;
