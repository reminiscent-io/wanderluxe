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
import { Trip } from '@/types/trip';
import { useAuth } from "@/contexts/AuthContext";
import { acceptTripShare, getSharedTrips, removeTripShare } from '@/services/tripSharingService';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Calendar, MapPin, Plane, Clock, Users, Share2, Globe, CheckCircle } from 'lucide-react';
import { differenceInDays } from 'date-fns';

// New hero and stats components
import { ActiveTripCard, NextTripBoardingPass, DefaultHeroCard } from '@/components/trip/hero';
import { TravelStatsCard, MonthlyActivityChart } from '@/components/trip/stats';
import { useTravelStats } from '@/hooks/useTravelStats';
import { DEFAULT_TRIP_IMAGE } from '@/constants/unsplash';

const MyTrips = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const { session } = useAuth();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!session) {
      navigate('/auth');
    }
  }, [session, navigate]);

  const [showHidden, setShowHidden] = useState(false);
  const [tripFilter, setTripFilter] = useState<'all' | 'mine' | 'shared'>('all');

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
          .eq('is_public', false)
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
        shareId: share.id,
        share_status: (share as any).share_status ?? 'accepted',
        sharedById: share.shared_by_user_id,
        owner_name: share.owner_name || null,
        owner_email: share.owner_email || null
      };
    }
    return null;
  }).filter(trip => trip !== null) || [];

  const handleAcceptSharedTrip = async (shareId: string) => {
    const ok = await acceptTripShare(shareId);
    if (ok) {
      queryClient.invalidateQueries({ queryKey: ['shared-trips'] });
    }
  };

  const handleLeaveSharedTrip = async (shareId: string) => {
    const ok = await removeTripShare(shareId);
    if (ok) {
      queryClient.invalidateQueries({ queryKey: ['shared-trips'] });
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    try {
      // Remove all shares for this trip
      const { error: sharesError } = await supabase
        .from('trip_shares')
        .delete()
        .eq('trip_id', tripId);

      if (sharesError) {
        console.error('Error removing trip shares:', sharesError);
      }

      // Soft-delete: hide the trip instead of permanently deleting
      const { error } = await supabase
        .from('trips')
        .update({ hidden: true })
        .eq('trip_id', tripId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['my-trips'] });
      queryClient.invalidateQueries({ queryKey: ['shared-trips'] });
    } catch (error) {
      console.error('Failed to delete trip:', error);
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

  // Combine and filter all trips based on search and filter selection
  const { allTrips, upcomingTrips, currentTrips, pastTrips } = useMemo(() => {
    // Normalize my trips with isShared = false
    const normalizedMyTrips = (myTrips || [])
      .filter(trip => trip && trip.destination)
      .map(trip => ({ ...trip, isShared: false }));

    // Normalize shared trips with isShared = true
    const normalizedSharedTrips = (sharedTrips || [])
      .filter(trip => trip && trip.destination)
      .map(trip => ({ ...trip, isShared: true }));

    // Combine all trips
    let combined = [...normalizedMyTrips, ...normalizedSharedTrips];

    // Apply filter
    if (tripFilter === 'mine') {
      combined = combined.filter(trip => !trip.isShared);
    } else if (tripFilter === 'shared') {
      combined = combined.filter(trip => trip.isShared);
    }

    // Apply search
    const filtered = combined.filter(trip =>
      trip.destination.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Categorize by time
    const upcoming = filtered
      .filter(trip => getTripCategory(trip) === 'upcoming')
      .sort((a, b) => new Date(a.arrival_date || '').getTime() - new Date(b.arrival_date || '').getTime());
    const current = filtered.filter(trip => getTripCategory(trip) === 'current');
    const past = filtered
      .filter(trip => getTripCategory(trip) === 'past')
      .sort((a, b) => new Date(b.departure_date || '').getTime() - new Date(a.departure_date || '').getTime());

    return {
      allTrips: filtered,
      upcomingTrips: upcoming,
      currentTrips: current,
      pastTrips: past
    };
  }, [myTrips, sharedTrips, searchQuery, tripFilter]);

  // Keep these for backward compatibility with hero logic
  const upcomingMyTrips = useMemo(() =>
    (myTrips || []).filter(trip => trip && getTripCategory(trip) === 'upcoming'),
  [myTrips]);
  const currentMyTrips = useMemo(() =>
    (myTrips || []).filter(trip => trip && getTripCategory(trip) === 'current'),
  [myTrips]);
  const upcomingSharedTrips = useMemo(() =>
    (sharedTrips || []).filter(trip => trip && getTripCategory(trip) === 'upcoming'),
  [sharedTrips]);
  const currentSharedTrips = useMemo(() =>
    (sharedTrips || []).filter(trip => trip && getTripCategory(trip) === 'current'),
  [sharedTrips]);

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
    // Show next upcoming trip regardless of how far away it is
    if (nextTrip && daysUntilNextTrip !== null && daysUntilNextTrip >= 0) {
      return 'pre-trip';
    }
    return 'default';
  }, [currentMyTrips, currentSharedTrips, nextTrip, daysUntilNextTrip]);

  // Calculate travel stats for the dashboard
  const travelStats = useTravelStats([...(myTrips || []), ...sharedTrips]);

  // Get the last completed trip for background image
  const lastCompletedTrip = useMemo(() => {
    const allPast = [...(myTrips || []), ...(sharedTrips || [])]
      .filter(trip => trip && getTripCategory(trip) === 'past')
      .sort((a, b) => new Date(b.departure_date || '').getTime() - new Date(a.departure_date || '').getTime());
    return allPast[0] || null;
  }, [myTrips, sharedTrips]);

  // Filter upcoming trips to avoid showing next trip twice when it's in hero
  const filteredUpcomingTrips = useMemo(() => {
    if (heroState === 'pre-trip' && nextTrip) {
      return upcomingTrips.filter(trip => trip.trip_id !== nextTrip.trip_id);
    }
    return upcomingTrips;
  }, [heroState, nextTrip, upcomingTrips]);

  if (!session) {
    return null; // Don't render anything while redirecting
  }

  // Calculate total trips stats
  const totalMyTrips = (myTrips || []).length;
  const totalSharedTrips = (sharedTrips || []).length;
  const totalCurrentTrips = currentMyTrips.length + currentSharedTrips.length;
  const totalUpcomingTrips = upcomingMyTrips.length + upcomingSharedTrips.length;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-sand-50 via-sand-50 to-earth-50">
      <Navigation />
      <div className="container mx-auto px-4 pt-12 md:pt-20 pb-8">
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
                isPendingInvite={(nextTrip as any).isShared && (nextTrip as any).share_status === 'pending'}
                shareId={(nextTrip as any).shareId}
                ownerName={(nextTrip as any).owner_name}
                onAcceptInvite={handleAcceptSharedTrip}
                onDeclineInvite={handleLeaveSharedTrip}
              />
            )}
            {heroState === 'default' && (
              <DefaultHeroCard
                onCreateTrip={() => navigate('/create-trip')}
                lastTripImage={lastCompletedTrip?.cover_image_url}
              />
            )}

            {/* Mobile: Swipeable Stats Row */}
            <div className="-mx-4 px-4 overflow-x-auto mt-3">
              <div className="flex gap-3 py-1 snap-x snap-mandatory
                            [-ms-overflow-style:none] [scrollbar-width:none]
                            [&::-webkit-scrollbar]:hidden">
                <div className="min-w-[160px] snap-start shrink-0">
                  <TravelStatsCard
                    title="Days Traveling"
                    value={travelStats.totalDaysTraveled}
                    subtitle="Total days explored"
                    icon={Globe}
                    gradient="blue"
                    compact
                  />
                </div>
                <div className="min-w-[160px] snap-start shrink-0">
                  <TravelStatsCard
                    title="Trip Progress"
                    value={`${travelStats.completedTrips}/${travelStats.completionRate.total}`}
                    subtitle="Trips completed"
                    icon={CheckCircle}
                    gradient="green"
                    chart="donut"
                    chartData={travelStats.completionRate}
                    compact
                  />
                </div>
                <div className="min-w-[160px] snap-start shrink-0">
                  <TravelStatsCard
                    title="Destinations"
                    value={travelStats.countriesVisited}
                    subtitle="Places visited"
                    icon={MapPin}
                    gradient="purple"
                    compact
                  />
                </div>
              </div>
            </div>

            {/* Mobile: Full-width Activity Chart */}
            <div className="mt-3">
              <MonthlyActivityChart data={travelStats.dailyActivity} />
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
                  isPendingInvite={(nextTrip as any).isShared && (nextTrip as any).share_status === 'pending'}
                  shareId={(nextTrip as any).shareId}
                  ownerName={(nextTrip as any).owner_name}
                  onAcceptInvite={handleAcceptSharedTrip}
                  onDeclineInvite={handleLeaveSharedTrip}
                />
              )}
              {heroState === 'default' && (
                <DefaultHeroCard
                  onCreateTrip={() => navigate('/create-trip')}
                  lastTripImage={lastCompletedTrip?.cover_image_url}
                />
              )}
            </div>

            {/* STATS AREA - Spans 1 column, stretches to match hero */}
            <div className="md:col-span-1 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <TravelStatsCard
                  title="Life on the Road"
                  value={travelStats.totalDaysTraveled}
                  subtitle="Days spent exploring"
                  icon={Globe}
                  gradient="blue"
                  noBackground
                />
                <TravelStatsCard
                  title="Trip Progress"
                  value={`${travelStats.completedTrips}/${travelStats.completionRate.total}`}
                  subtitle="Trips completed"
                  icon={CheckCircle}
                  gradient="green"
                  chart="donut"
                  chartData={travelStats.completionRate}
                  noBackground
                />
              </div>
              <MonthlyActivityChart data={travelStats.dailyActivity} className="flex-1" />
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
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="search"
              placeholder="Search destinations, dates..."
              className="pl-10 pr-4 py-3 bg-white border-earth-200 focus:border-earth-400 focus:ring-earth-400 rounded-xl shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </motion.div>
        
        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 sm:gap-2 mb-6 sm:mb-8">
          <span className="text-xs sm:text-sm text-earth-600 mr-1 sm:mr-2">Show:</span>
          <button
            onClick={() => setTripFilter('all')}
            className={`px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
              tripFilter === 'all'
                ? 'bg-earth-600 text-white'
                : 'bg-white text-earth-600 border border-earth-200 hover:bg-earth-50'
            }`}
          >
            All Trips
            <Badge className="ml-1.5 sm:ml-2 bg-white/20 text-inherit text-[10px] sm:text-xs px-1.5 sm:px-2">
              {totalMyTrips + totalSharedTrips}
            </Badge>
          </button>
          <button
            onClick={() => setTripFilter('mine')}
            className={`px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
              tripFilter === 'mine'
                ? 'bg-earth-600 text-white'
                : 'bg-white text-earth-600 border border-earth-200 hover:bg-earth-50'
            }`}
          >
            My Trips
            <Badge className="ml-1.5 sm:ml-2 bg-white/20 text-inherit text-[10px] sm:text-xs px-1.5 sm:px-2">
              {totalMyTrips}
            </Badge>
          </button>
          <button
            onClick={() => setTripFilter('shared')}
            className={`px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 ${
              tripFilter === 'shared'
                ? 'bg-earth-600 text-white'
                : 'bg-white text-earth-600 border border-earth-200 hover:bg-earth-50'
            }`}
          >
            <Share2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Shared With Me</span>
            <span className="sm:hidden">Shared</span>
            <Badge className="ml-1 bg-white/20 text-inherit text-[10px] sm:text-xs px-1.5 sm:px-2">
              {totalSharedTrips}
            </Badge>
          </button>
        </div>

        {/* Unified Trip List */}
        {isLoadingMyTrips || isLoadingSharedTrips ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 bg-muted rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-12">
            {/* Current Trips Section */}
            {currentTrips.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="relative"
              >
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-emerald-100">
                  <div className="bg-emerald-100 rounded-xl p-3">
                    <Plane className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-earth-800 flex items-center gap-3">
                      Currently Traveling
                      <Badge className="bg-emerald-500 text-white text-sm px-3 py-1">
                        {currentTrips.length}
                      </Badge>
                    </h2>
                    <p className="text-earth-600 text-sm mt-1">Your active adventures</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {currentTrips.map((trip) => (
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
                          cover_image_url: trip.cover_image_url || DEFAULT_TRIP_IMAGE
                        }}
                        onDelete={!trip.isShared ? () => handleDeleteTrip(trip.trip_id) : undefined}
                        onAcceptInvite={trip.isShared ? handleAcceptSharedTrip : undefined}
                        onLeaveSharedTrip={trip.isShared ? handleLeaveSharedTrip : undefined}
                        isShared={trip.isShared}
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
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-sand-200">
                <div className="bg-sand-200 rounded-xl p-3">
                  <Calendar className="h-6 w-6 text-earth-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-earth-800 flex items-center gap-3">
                    Upcoming Adventures
                    <Badge className="bg-earth-500 text-white text-sm px-3 py-1">
                      {filteredUpcomingTrips.length}
                    </Badge>
                  </h2>
                  <p className="text-earth-600 text-sm mt-1">Trips to look forward to</p>
                </div>
              </div>

              {filteredUpcomingTrips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredUpcomingTrips.map((trip, index) => (
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
                          cover_image_url: trip.cover_image_url || DEFAULT_TRIP_IMAGE
                        }}
                        onDelete={!trip.isShared ? () => handleDeleteTrip(trip.trip_id) : undefined}
                        onAcceptInvite={trip.isShared ? handleAcceptSharedTrip : undefined}
                        onLeaveSharedTrip={trip.isShared ? handleLeaveSharedTrip : undefined}
                        isShared={trip.isShared}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Card className="p-6 text-center bg-gradient-to-br from-sand-50 to-earth-50 border-sand-200">
                  <h3 className="text-lg font-semibold text-earth-800 mb-1">
                    {tripFilter === 'shared' ? 'No Shared Adventures Yet' : 'Your Next Adventure Awaits'}
                  </h3>
                  <p className="text-sm text-earth-600">
                    {tripFilter === 'shared'
                      ? 'When someone shares a trip with you, it will appear here.'
                      : "Ready to explore somewhere new? Let's plan your perfect getaway."}
                  </p>
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
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-sand-200">
                <div className="bg-sand-100 rounded-xl p-3">
                  <Clock className="h-6 w-6 text-earth-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-earth-800 flex items-center gap-3">
                    Travel Memories
                    <Badge className="bg-earth-500 text-white text-sm px-3 py-1">
                      {pastTrips.length}
                    </Badge>
                  </h2>
                  <p className="text-earth-600 text-sm mt-1">Cherished adventures from the past</p>
                </div>
              </div>

              {pastTrips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {pastTrips.map((trip, index) => (
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
                          cover_image_url: trip.cover_image_url || DEFAULT_TRIP_IMAGE
                        }}
                        onDelete={!trip.isShared ? () => handleDeleteTrip(trip.trip_id) : undefined}
                        onAcceptInvite={trip.isShared ? handleAcceptSharedTrip : undefined}
                        onLeaveSharedTrip={trip.isShared ? handleLeaveSharedTrip : undefined}
                        isShared={trip.isShared}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center bg-secondary border-sand-200">
                  <div className="max-w-sm mx-auto">
                    <div className="bg-sand-100 rounded-full p-3 w-16 h-16 mx-auto mb-4">
                      <Clock className="h-10 w-10 text-earth-400 mx-auto" />
                    </div>
                    <p className="text-earth-500 text-lg">No past adventures yet</p>
                    <p className="text-earth-400 text-sm mt-1">Your travel memories will appear here</p>
                  </div>
                </Card>
              )}
            </motion.div>

            {/* Enhanced Empty State for No Trips */}
            {allTrips.length === 0 && heroState !== 'pre-trip' && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <Card className="p-16 text-center bg-gradient-to-br from-sand-50 via-sand-50 to-earth-50 border-sand-200 shadow-warm-xl">
                  <div className="max-w-lg mx-auto">
                    <div className="bg-gradient-to-br from-sunset-500 to-sunset-600 rounded-full p-6 w-28 h-28 mx-auto mb-8 shadow-warm-lg">
                      <MapPin className="h-16 w-16 text-white mx-auto" />
                    </div>
                    <h3 className="text-3xl font-bold text-earth-800 mb-4">
                      {tripFilter === 'shared' ? 'No Shared Trips Yet' : 'Your Journey Begins Here'}
                    </h3>
                    <p className="text-earth-600 text-lg mb-8 leading-relaxed">
                      {tripFilter === 'shared'
                        ? 'When someone shares a trip with you, it will appear here.'
                        : "Ready to explore the world? Create your first trip and let the adventures begin."}
                    </p>

                    {tripFilter !== 'shared' && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-sm">
                          <div className="bg-white/70 rounded-lg p-4">
                            <Calendar className="h-6 w-6 text-sunset-500 mx-auto mb-2" />
                            <p className="text-earth-700 font-medium">Smart Planning</p>
                          </div>
                          <div className="bg-white/70 rounded-lg p-4">
                            <Users className="h-6 w-6 text-earth-600 mx-auto mb-2" />
                            <p className="text-earth-700 font-medium">Group Travel</p>
                          </div>
                          <div className="bg-white/70 rounded-lg p-4">
                            <Plane className="h-6 w-6 text-sand-500 mx-auto mb-2" />
                            <p className="text-earth-700 font-medium">AI Assistance</p>
                          </div>
                        </div>

                        <Button
                          onClick={() => navigate('/create-trip')}
                          variant="sunset"
                          className="px-10 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105"
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          Create Your First Trip
                        </Button>
                      </>
                    )}
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

      </div>
    </div>
  );
};

export default MyTrips;
