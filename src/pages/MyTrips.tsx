import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Calendar, MapPin, Plane, Clock, Filter, Users, Share2, Globe, CheckCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

// New hero and stats components
import { ActiveTripCard, NextTripBoardingPass, DefaultHeroCard } from '@/components/trip/hero';
import { TravelStatsCard, MonthlyActivityChart } from '@/components/trip/stats';
import { useTravelStats } from '@/hooks/useTravelStats';

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
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('No user found');
        }

        // First get trips
        const { data: tripsData, error: tripsError } = await supabase
          .from('trips')
          .select(`*`)
          .eq('user_id', user.id)
          .eq('hidden', showHidden)
          .order('arrival_date', { ascending: true });

        if (tripsError) {
          throw tripsError;
        }
        
        if (!tripsData || tripsData.length === 0) {
          return [] as Trip[]; // Return empty array if no trips found
        }
        
        // Get which trips are shared with others
        const tripIds = tripsData.map(trip => trip.trip_id);
        
        // Original approach - just returning trips data directly without sharing info
        return tripsData.map(trip => ({
          ...trip,
          isShared: false,
          shareCount: 0
        }));
      } catch (error) {
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
        .eq('trip_id', tripId);

      if (error) {
        console.error('Error hiding trip:', error);
        throw error;
      }

      toast.success('Trip hidden successfully');
      queryClient.invalidateQueries({ queryKey: ['my-trips', showHidden] });
    } catch (error) {
      console.error('Failed to hide trip:', error);
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
      toast.error('Failed to delete trip');
    }
  };

  // Utility functions to categorize trips
  const getTripCategory = (trip: Trip): 'upcoming' | 'current' | 'past' => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const arrivalDate = new Date(trip.arrival_date || '');
    const departureDate = new Date(trip.departure_date || '');
    
    // Current trip: today is between arrival and departure (inclusive)
    if (today >= arrivalDate && today <= departureDate) {
      return 'current';
    }
    
    // Upcoming trip: arrival date is in the future
    if (arrivalDate > today) {
      return 'upcoming';
    }
    
    // Past trip: departure date is in the past
    return 'past';
  };

  // Memoize filtered and categorized trips to prevent unnecessary re-renders
  const { upcomingMyTrips, currentMyTrips, pastMyTrips } = useMemo(() => {
    if (!myTrips || !Array.isArray(myTrips)) return { upcomingMyTrips: [], currentMyTrips: [], pastMyTrips: [] };
    
    const filtered = myTrips.filter(trip => 
      trip && trip.destination && trip.destination.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const upcoming = filtered.filter(trip => getTripCategory(trip) === 'upcoming');
    const current = filtered.filter(trip => getTripCategory(trip) === 'current');
    const past = filtered.filter(trip => getTripCategory(trip) === 'past');

    return {
      upcomingMyTrips: upcoming,
      currentMyTrips: current,
      pastMyTrips: past
    };
  }, [myTrips, searchQuery]);

  const { upcomingSharedTrips, currentSharedTrips, pastSharedTrips } = useMemo(() => {
    if (!sharedTrips || !Array.isArray(sharedTrips)) return { upcomingSharedTrips: [], currentSharedTrips: [], pastSharedTrips: [] };
    
    const filtered = sharedTrips
      .filter(trip => trip && trip.destination) // Filter out any undefined trips
      .filter(trip =>
        trip.destination.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const upcoming = filtered.filter(trip => getTripCategory(trip) === 'upcoming');
    const current = filtered.filter(trip => getTripCategory(trip) === 'current');
    const past = filtered.filter(trip => getTripCategory(trip) === 'past');

    return {
      upcomingSharedTrips: upcoming,
      currentSharedTrips: current,
      pastSharedTrips: past
    };
  }, [sharedTrips, searchQuery]);

  if (!session) {
    return null; // Don't render anything while redirecting
  }

  // Calculate next upcoming trip and days until
  const nextTrip = useMemo(() => {
    const allUpcoming = [...upcomingMyTrips, ...upcomingSharedTrips].sort((a, b) => {
      const dateA = new Date(a.arrival_date || '');
      const dateB = new Date(b.arrival_date || '');
      return dateA.getTime() - dateB.getTime();
    });
    return allUpcoming[0];
  }, [upcomingMyTrips, upcomingSharedTrips]);

  const daysUntilNextTrip = useMemo(() => {
    if (!nextTrip || !nextTrip.arrival_date) return null;
    // Use UTC dates to be timezone agnostic
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const tripDateUTC = new Date(nextTrip.arrival_date + 'T00:00:00.000Z');
    return differenceInDays(tripDateUTC, todayUTC);
  }, [nextTrip]);

  // Determine hero state based on travel status
  const heroState = useMemo(() => {
    if (currentMyTrips.length > 0 || currentSharedTrips.length > 0) {
      return 'on-trip';
    }
    if (nextTrip && daysUntilNextTrip !== null && daysUntilNextTrip <= 14) {
      return 'pre-trip';
    }
    return 'default';
  }, [currentMyTrips, currentSharedTrips, nextTrip, daysUntilNextTrip]);

  // Calculate travel stats for the dashboard
  const travelStats = useTravelStats([...(myTrips || []), ...sharedTrips]);

  // Get the last completed trip for background image
  const lastCompletedTrip = useMemo(() => {
    return pastMyTrips[0] || pastSharedTrips[0] || null;
  }, [pastMyTrips, pastSharedTrips]);

  // Filter upcoming trips to avoid showing next trip twice when it's in hero
  const filteredUpcomingMyTrips = useMemo(() => {
    if (heroState === 'pre-trip' && nextTrip) {
      return upcomingMyTrips.filter(trip => trip.trip_id !== nextTrip.trip_id);
    }
    return upcomingMyTrips;
  }, [heroState, nextTrip, upcomingMyTrips]);

  // Calculate total trips stats
  const totalMyTrips = (myTrips || []).length;
  const totalSharedTrips = (sharedTrips || []).length;
  const totalCurrentTrips = currentMyTrips.length + currentSharedTrips.length;
  const totalUpcomingTrips = upcomingMyTrips.length + upcomingSharedTrips.length;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-sand-50 via-sand-50 to-earth-50">
      <Navigation />
      <div className="container mx-auto px-4 pt-20 pb-8">
        {/* Dynamic Travel Headquarters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          {/* Mobile: Full-bleed hero */}
          <div className="md:hidden">
            {heroState === 'on-trip' && (
              <ActiveTripCard
                trip={currentMyTrips[0] || currentSharedTrips[0]}
                onViewItinerary={() => navigate(`/trip/${(currentMyTrips[0] || currentSharedTrips[0]).trip_id}`)}
                fullBleed
                additionalTripsCount={totalCurrentTrips - 1}
              />
            )}
            {heroState === 'pre-trip' && nextTrip && (
              <NextTripBoardingPass
                trip={nextTrip}
                daysUntil={daysUntilNextTrip!}
                onViewTrip={() => navigate(`/trip/${nextTrip.trip_id}`)}
                className="-mx-4 rounded-none"
              />
            )}
            {heroState === 'default' && (
              <DefaultHeroCard
                onCreateTrip={() => navigate('/create-trip')}
                lastTripImage={lastCompletedTrip?.cover_image_url}
              />
            )}

            {/* Mobile: Swipeable Stats Row */}
            <div className="-mx-4 px-4 overflow-x-auto mt-4">
              <div className="flex gap-4 py-2 snap-x snap-mandatory
                            [-ms-overflow-style:none] [scrollbar-width:none]
                            [&::-webkit-scrollbar]:hidden">
                <div className="min-w-[200px] snap-start shrink-0">
                  <TravelStatsCard
                    title="Days Traveling"
                    value={travelStats.totalDaysTraveled}
                    subtitle="Total days explored"
                    icon={Globe}
                    gradient="blue"
                  />
                </div>
                <div className="min-w-[200px] snap-start shrink-0">
                  <TravelStatsCard
                    title="Trip Progress"
                    value={`${travelStats.completedTrips}/${travelStats.completionRate.total}`}
                    subtitle="Trips completed"
                    icon={CheckCircle}
                    gradient="green"
                    chart="donut"
                    chartData={travelStats.completionRate}
                  />
                </div>
                <div className="min-w-[200px] snap-start shrink-0">
                  <TravelStatsCard
                    title="Destinations"
                    value={travelStats.countriesVisited}
                    subtitle="Places visited"
                    icon={MapPin}
                    gradient="purple"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Desktop: Grid Layout */}
          <div className="hidden md:grid md:grid-cols-3 gap-6">
            {/* PRIMARY ACTION AREA - Spans 2 columns */}
            <div className="md:col-span-2">
              {heroState === 'on-trip' && (
                <ActiveTripCard
                  trip={currentMyTrips[0] || currentSharedTrips[0]}
                  onViewItinerary={() => navigate(`/trip/${(currentMyTrips[0] || currentSharedTrips[0]).trip_id}`)}
                  additionalTripsCount={totalCurrentTrips - 1}
                />
              )}
              {heroState === 'pre-trip' && nextTrip && (
                <NextTripBoardingPass
                  trip={nextTrip}
                  daysUntil={daysUntilNextTrip!}
                  onViewTrip={() => navigate(`/trip/${nextTrip.trip_id}`)}
                />
              )}
              {heroState === 'default' && (
                <DefaultHeroCard
                  onCreateTrip={() => navigate('/create-trip')}
                  lastTripImage={lastCompletedTrip?.cover_image_url}
                />
              )}
            </div>

            {/* STATS AREA - Spans 1 column */}
            <div className="md:col-span-1 space-y-4">
              <TravelStatsCard
                title="Life on the Road"
                value={travelStats.totalDaysTraveled}
                subtitle="Days spent exploring"
                icon={Globe}
                gradient="blue"
              />
              <MonthlyActivityChart data={travelStats.monthlyActivity} />
              <TravelStatsCard
                title="Trip Progress"
                value={`${travelStats.completedTrips}/${travelStats.completionRate.total}`}
                subtitle="Trips completed"
                icon={CheckCircle}
                gradient="green"
                chart="donut"
                chartData={travelStats.completionRate}
              />
            </div>
          </div>
        </motion.div>

        {/* Enhanced Search and Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="search"
                placeholder="Search destinations, dates..."
                className="pl-10 pr-4 py-3 bg-white border-earth-200 focus:border-earth-400 focus:ring-earth-400 rounded-xl shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/create-trip')} 
                className="bg-earth-600 hover:bg-earth-700 text-white px-6 py-3 rounded-xl shadow-sm flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Plan New Trip</span>
                <span className="sm:hidden">New Trip</span>
              </Button>
            </div>
          </div>
        </motion.div>
        
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
              <div className="space-y-12">
                {/* Current Trips Section */}
                {currentMyTrips.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="relative"
                  >
                    {/* Enhanced Section Header */}
                    <div className="flex items-center gap-3 mb-8 pb-4 border-b border-emerald-100">
                      <div className="bg-emerald-100 rounded-xl p-3">
                        <Plane className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-earth-800 flex items-center gap-3">
                          Currently Traveling
                          <Badge className="bg-emerald-500 text-white text-sm px-3 py-1">
                            {currentMyTrips.length}
                          </Badge>
                        </h2>
                        <p className="text-earth-600 text-sm mt-1">Your active adventures</p>
                      </div>
                    </div>

                    {/* Enhanced Grid for Current Trips - Featured Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {currentMyTrips.map((trip) => (
                        <motion.div
                          key={trip.trip_id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <TripCard
                            trip={{
                              ...trip,
                              start_date: trip.arrival_date,
                              end_date: trip.departure_date,
                              cover_image_url: trip.cover_image_url ? trip.cover_image_url : 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f'
                            }}
                            onHide={() => handleHideTrip(trip.trip_id)}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Upcoming Trips Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="relative"
                >
                  {/* Enhanced Section Header */}
                  <div className="flex items-center gap-3 mb-8 pb-4 border-b border-blue-100">
                    <div className="bg-blue-100 rounded-xl p-3">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-earth-800 flex items-center gap-3">
                        Upcoming Adventures
                        <Badge className="bg-blue-500 text-white text-sm px-3 py-1">
                          {filteredUpcomingMyTrips.length}
                        </Badge>
                      </h2>
                      <p className="text-earth-600 text-sm mt-1">Trips to look forward to</p>
                    </div>
                  </div>

                  {filteredUpcomingMyTrips.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filteredUpcomingMyTrips.map((trip, index) => (
                        <motion.div
                          key={trip.trip_id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1, duration: 0.3 }}
                        >
                          <TripCard
                            trip={{
                              ...trip,
                              start_date: trip.arrival_date,
                              end_date: trip.departure_date,
                              cover_image_url: trip.cover_image_url ? trip.cover_image_url : 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f'
                            }}
                            onHide={() => handleHideTrip(trip.trip_id)}
                          />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-12 text-center bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
                      <div className="max-w-md mx-auto">
                        <div className="bg-blue-100 rounded-full p-4 w-20 h-20 mx-auto mb-6">
                          <MapPin className="h-12 w-12 text-blue-600 mx-auto" />
                        </div>
                        <h3 className="text-xl font-semibold text-earth-800 mb-3">
                          Your Next Adventure Awaits
                        </h3>
                        <p className="text-earth-600 mb-6">
                          Ready to explore somewhere new? Let's plan your perfect getaway.
                        </p>
                        <Button 
                          onClick={() => navigate('/create-trip')} 
                          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium"
                        >
                          Plan Your Trip
                        </Button>
                      </div>
                    </Card>
                  )}
                </motion.div>

                {/* Past Trips Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="relative"
                >
                  {/* Enhanced Section Header */}
                  <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
                    <div className="bg-gray-100 rounded-xl p-3">
                      <Clock className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-earth-800 flex items-center gap-3">
                        Travel Memories
                        <Badge className="bg-gray-500 text-white text-sm px-3 py-1">
                          {pastMyTrips.length}
                        </Badge>
                      </h2>
                      <p className="text-earth-600 text-sm mt-1">Cherished adventures from the past</p>
                    </div>
                  </div>

                  {pastMyTrips.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {pastMyTrips.map((trip, index) => (
                        <motion.div
                          key={trip.trip_id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.3 }}
                        >
                          <TripCard
                            trip={{
                              ...trip,
                              start_date: trip.arrival_date,
                              end_date: trip.departure_date,
                              cover_image_url: trip.cover_image_url ? trip.cover_image_url : 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f'
                            }}
                            onHide={() => handleHideTrip(trip.trip_id)}
                          />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-8 text-center bg-gray-50 border-gray-100">
                      <div className="max-w-sm mx-auto">
                        <div className="bg-gray-100 rounded-full p-3 w-16 h-16 mx-auto mb-4">
                          <Clock className="h-10 w-10 text-gray-500 mx-auto" />
                        </div>
                        <p className="text-earth-500 text-lg">No past adventures yet</p>
                        <p className="text-earth-400 text-sm mt-1">Your travel memories will appear here</p>
                      </div>
                    </Card>
                  )}
                </motion.div>

                {/* Enhanced Empty State for No Trips */}
                {filteredUpcomingMyTrips.length === 0 && currentMyTrips.length === 0 && pastMyTrips.length === 0 && heroState !== 'pre-trip' && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                  >
                    <Card className="p-16 text-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-200 shadow-xl">
                      <div className="max-w-lg mx-auto">
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-6 w-28 h-28 mx-auto mb-8 shadow-lg">
                          <MapPin className="h-16 w-16 text-white mx-auto" />
                        </div>
                        <h3 className="text-3xl font-bold text-earth-800 mb-4">
                          Your Journey Begins Here
                        </h3>
                        <p className="text-earth-600 text-lg mb-8 leading-relaxed">
                          Ready to explore the world? Create your first trip and let the adventures begin. 
                          From dream destinations to detailed itineraries, we'll help you plan every step.
                        </p>
                        
                        {/* Features Preview */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-sm">
                          <div className="bg-white/70 rounded-lg p-4">
                            <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                            <p className="text-earth-700 font-medium">Smart Planning</p>
                          </div>
                          <div className="bg-white/70 rounded-lg p-4">
                            <Users className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                            <p className="text-earth-700 font-medium">Group Travel</p>
                          </div>
                          <div className="bg-white/70 rounded-lg p-4">
                            <Plane className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
                            <p className="text-earth-700 font-medium">AI Assistance</p>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={() => navigate('/create-trip')} 
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          Create Your First Trip
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </div>
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
              <div className="space-y-12">
                {/* Current Shared Trips Section */}
                {currentSharedTrips.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="relative"
                  >
                    {/* Enhanced Section Header */}
                    <div className="flex items-center gap-3 mb-8 pb-4 border-b border-emerald-100">
                      <div className="bg-emerald-100 rounded-xl p-3">
                        <Users className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-earth-800 flex items-center gap-3">
                          Currently Shared
                          <Badge className="bg-emerald-500 text-white text-sm px-3 py-1">
                            {currentSharedTrips.length}
                          </Badge>
                        </h2>
                        <p className="text-earth-600 text-sm mt-1">Active trips shared with you</p>
                      </div>
                    </div>

                    {/* Enhanced Grid for Current Trips - Featured Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {currentSharedTrips.map((trip) => (
                        <motion.div
                          key={trip.trip_id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <TripCard
                            trip={{
                              ...trip,
                              start_date: trip.arrival_date,
                              end_date: trip.departure_date,
                              cover_image_url: trip.cover_image_url ? trip.cover_image_url : 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f'
                            }}
                            isShared={true}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Upcoming Shared Trips Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="relative"
                >
                  {/* Enhanced Section Header */}
                  <div className="flex items-center gap-3 mb-8 pb-4 border-b border-purple-100">
                    <div className="bg-purple-100 rounded-xl p-3">
                      <Share2 className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-earth-800 flex items-center gap-3">
                        Upcoming Shared
                        <Badge className="bg-purple-500 text-white text-sm px-3 py-1">
                          {upcomingSharedTrips.length}
                        </Badge>
                      </h2>
                      <p className="text-earth-600 text-sm mt-1">Shared adventures to anticipate</p>
                    </div>
                  </div>

                  {upcomingSharedTrips.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {upcomingSharedTrips.map((trip, index) => (
                        <motion.div
                          key={trip.trip_id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1, duration: 0.3 }}
                        >
                          <TripCard
                            trip={{
                              ...trip,
                              start_date: trip.arrival_date,
                              end_date: trip.departure_date,
                              cover_image_url: trip.cover_image_url ? trip.cover_image_url : 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f'
                            }}
                            isShared={true}
                          />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-12 text-center bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100">
                      <div className="max-w-md mx-auto">
                        <div className="bg-purple-100 rounded-full p-4 w-20 h-20 mx-auto mb-6">
                          <Share2 className="h-12 w-12 text-purple-600 mx-auto" />
                        </div>
                        <h3 className="text-xl font-semibold text-earth-800 mb-3">
                          No Shared Adventures Yet
                        </h3>
                        <p className="text-earth-600 mb-6">
                          When someone shares a trip with you, it will appear here.
                        </p>
                      </div>
                    </Card>
                  )}
                </motion.div>

                {/* Past Shared Trips Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="relative"
                >
                  {/* Enhanced Section Header */}
                  <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
                    <div className="bg-gray-100 rounded-xl p-3">
                      <Clock className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-earth-800 flex items-center gap-3">
                        Shared Memories
                        <Badge className="bg-gray-500 text-white text-sm px-3 py-1">
                          {pastSharedTrips.length}
                        </Badge>
                      </h2>
                      <p className="text-earth-600 text-sm mt-1">Past shared adventures</p>
                    </div>
                  </div>

                  {pastSharedTrips.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {pastSharedTrips.map((trip, index) => (
                        <motion.div
                          key={trip.trip_id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.3 }}
                        >
                          <TripCard
                            trip={{
                              ...trip,
                              start_date: trip.arrival_date,
                              end_date: trip.departure_date,
                              cover_image_url: trip.cover_image_url ? trip.cover_image_url : 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f'
                            }}
                            isShared={true}
                          />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-8 text-center bg-gray-50 border-gray-100">
                      <div className="max-w-sm mx-auto">
                        <div className="bg-gray-100 rounded-full p-3 w-16 h-16 mx-auto mb-4">
                          <Clock className="h-10 w-10 text-gray-500 mx-auto" />
                        </div>
                        <p className="text-earth-500 text-lg">No shared memories yet</p>
                        <p className="text-earth-400 text-sm mt-1">Past shared trips will appear here</p>
                      </div>
                    </Card>
                  )}
                </motion.div>

                {/* Show message if no shared trips at all */}
                {upcomingSharedTrips.length === 0 && currentSharedTrips.length === 0 && pastSharedTrips.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-earth-500">No trips have been shared with you yet</p>
                  </div>
                )}
              </div>
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
