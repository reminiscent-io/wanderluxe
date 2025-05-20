import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from "../components/Navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import TripCard from '../components/trip/TripCard';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";
import { Trip } from '@/types/trip';
import { useAuth } from "@/contexts/AuthContext";
import { getSharedTrips } from '@/services/tripSharingService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const [showHidden, setShowHidden] = useState(false);
  const [activeTab, setActiveTab] = useState("my-trips");

  // Query for user's own trips with info on whether they're shared
  const { data: myTrips, isLoading: isLoadingMyTrips } = useQuery({
    queryKey: ['my-trips', showHidden],
    queryFn: async () => {
      try {
        console.log('Fetching user trips...');
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          console.log('No user found');
          throw new Error('No user found');
        }

        console.log('User found, fetching trips for user:', user.id);

        // First get trips
        const { data: tripsData, error: tripsError } = await supabase
          .from('trips')
          .select(`*`)
          .eq('user_id', user.id)
          .eq('hidden', showHidden)
          .order('arrival_date', { ascending: true });

        if (tripsError) {
          console.error('Error fetching trips:', tripsError);
          throw tripsError;
        }
        
        console.log('Trips data:', tripsData?.length, tripsData);
        
        if (!tripsData || tripsData.length === 0) {
          console.log('No trips found');
          return [] as Trip[]; // Return empty array if no trips found
        }
        
        // Get which trips are shared with others
        const tripIds = tripsData.map(trip => trip.trip_id);
        console.log('Trip IDs:', tripIds);
        
        // Original approach - just returning trips data directly without sharing info
        return tripsData.map(trip => ({
          ...trip,
          isShared: false,
          shareCount: 0
        }));
      } catch (error) {
        console.error('Error in myTrips query:', error);
        throw error;
      }
    },
    enabled: !!session // Only run query if user is authenticated
  });
  
  // Query for trips shared with the user
  const { data: sharedTripsResult, isLoading: isLoadingSharedTrips } = useQuery({
    queryKey: ['shared-trips'],
    queryFn: async () => {
      return await getSharedTrips();
    },
    enabled: !!session // Only run query if user is authenticated
  });
  
  // Extract actual trip data from the shared trips result
  const sharedTrips = sharedTripsResult?.data?.map(share => {
    // Make sure we correctly map the trip data from the response
    if (share && share.trips) {
      return {
        ...share.trips,
        isShared: true,
        sharedById: share.shared_by_user_id
      };
    }
    return null;
  }).filter(trip => trip !== null) || [];

  const handleHideTrip = async (tripId: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ hidden: true })
        .eq('trip_id', tripId)
        .select();

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

  console.log('myTrips data for filtering:', myTrips);
  
  // Filter trips based on search query (with additional null checks)
  const filteredMyTrips = myTrips && Array.isArray(myTrips) 
    ? myTrips.filter(trip => 
        trip && trip.destination && trip.destination.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];
  
  console.log('Filtered my trips:', filteredMyTrips?.length);

  // Filter shared trips, ensuring we handle undefined trips properly
  const filteredSharedTrips = sharedTrips && Array.isArray(sharedTrips)
    ? sharedTrips
        .filter(trip => trip && trip.destination) // Filter out any undefined trips
        .filter(trip =>
          trip.destination.toLowerCase().includes(searchQuery.toLowerCase())
        )
    : [];

  if (!session) {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="flex flex-col min-h-screen bg-sand-50">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="mb-12 text-center">
          <div className="h-px bg-earth-200 max-w-[1024px] mx-auto mb-8"></div>
          <h1 className="text-5xl font-serif font-bold leading-tight tracking-wide text-earth-900">
            My Trips
          </h1>
          <div className="h-px bg-earth-200 max-w-[1024px] mx-auto mt-8"></div>
        </div>

        <Input
          type="search"
          placeholder="Search trips..."
          className="max-w-sm mb-6"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <Tabs
          defaultValue="my-trips"
          className="mb-8"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="my-trips">My Trips</TabsTrigger>
            <TabsTrigger value="shared-trips">Shared With Me</TabsTrigger>
          </TabsList>

          <TabsContent value="my-trips">
            {isLoadingMyTrips ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-64 bg-gray-100 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <>
                {filteredMyTrips && filteredMyTrips.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMyTrips.map((trip) => {
                      console.log('Rendering trip card for:', trip.destination);
                      return (
                        <TripCard
                          key={trip.trip_id}
                          trip={{
                            ...trip,
                            cover_image_url: trip.cover_image_url ? trip.cover_image_url : 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f'
                          }}
                          onHide={() => handleHideTrip(trip.trip_id)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-earth-500 mb-4">You haven't created any trips yet</p>
                    <Button onClick={() => navigate('/create-trip')}>Create Your First Trip</Button>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-center mt-12">
              <Button
                variant="ghost"
                onClick={() => setShowHidden(!showHidden)}
                className="text-earth-500 hover:text-earth-600"
              >
                {showHidden ? 'Show Active Trips' : 'Show Hidden Trips'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="shared-trips">
            {isLoadingSharedTrips ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-64 bg-gray-100 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <>
                {filteredSharedTrips && filteredSharedTrips.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSharedTrips.map((trip) => (
                      <TripCard
                        key={trip.trip_id}
                        trip={{
                          ...trip,
                          cover_image_url: trip.cover_image_url ? trip.cover_image_url : 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f'
                        }}
                        // The trip already has isShared & sharedById properties from our earlier transformation
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-earth-500">No trips have been shared with you yet</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
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
