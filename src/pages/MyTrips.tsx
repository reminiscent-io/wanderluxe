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
import { Search, Share2, EyeOff } from 'lucide-react';
import { differenceInDays } from 'date-fns';

import { ActiveTripCard, NextTripBoardingPass, DefaultHeroCard } from '@/components/trip/hero';
import { MonthlyActivityChart } from '@/components/trip/stats';
import { useTravelStats } from '@/hooks/useTravelStats';
import { DEFAULT_TRIP_IMAGE } from '@/constants/unsplash';
import { cn } from '@/lib/utils';

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: React.ReactNode;
}

function FilterChip({ active, onClick, label, count, icon }: FilterChipProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors",
        active
          ? "bg-earth-600 text-white"
          : "bg-white text-earth-600 border border-earth-200 hover:bg-sand-100"
      )}
    >
      {icon}
      <span>{label}</span>
      <span className={cn("text-xs tabular-nums", active ? "opacity-70" : "text-earth-400")}>
        {count}
      </span>
    </button>
  );
}

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
          return [] as Trip[];
        }

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

  // Count of hidden trips — drives whether the "Show Hidden Trips" toggle renders
  const { data: hiddenCount = 0 } = useQuery({
    queryKey: ['my-trips-hidden-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { count, error } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('hidden', true)
        .eq('is_public', false);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!session
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
      queryClient.invalidateQueries({ queryKey: ['my-trips-hidden-count'] });
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
  const { upcomingTrips, currentTrips, pastTrips } = useMemo(() => {
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

    // Apply search — matches destination, primary_destination, and date text (e.g. "Dec", "December", "2026")
    const query = searchQuery.trim().toLowerCase();
    const filtered = !query ? combined : combined.filter(trip => {
      const haystack: string[] = [
        trip.destination ?? '',
        (trip as Trip & { primary_destination?: string }).primary_destination ?? '',
      ];
      const arrival = trip.arrival_date ? new Date(trip.arrival_date) : null;
      const departure = trip.departure_date ? new Date(trip.departure_date) : null;
      for (const date of [arrival, departure]) {
        if (date && !isNaN(date.getTime())) {
          haystack.push(
            date.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
            date.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
          );
        }
      }
      return haystack.some(field => field.toLowerCase().includes(query));
    });

    // Categorize by time
    const upcoming = filtered
      .filter(trip => getTripCategory(trip) === 'upcoming')
      .sort((a, b) => new Date(a.arrival_date || '').getTime() - new Date(b.arrival_date || '').getTime());
    const current = filtered.filter(trip => getTripCategory(trip) === 'current');
    const past = filtered
      .filter(trip => getTripCategory(trip) === 'past')
      .sort((a, b) => new Date(b.departure_date || '').getTime() - new Date(a.departure_date || '').getTime());

    return {
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

  const totalMyTrips = (myTrips || []).length;
  const totalSharedTrips = (sharedTrips || []).length;
  const totalCurrentTrips = currentMyTrips.length + currentSharedTrips.length;

  return (
    <div className="flex flex-col min-h-screen bg-sand-50">
      <Navigation />
      <div className="container mx-auto px-4 pt-12 md:pt-20 pb-8">
        {/* Hero — single primary surface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          {heroState === 'on-trip' && (
            <>
              <div className="md:hidden">
                <ActiveTripCard
                  trip={currentMyTrips[0] || currentSharedTrips[0]}
                  onViewItinerary={() => navigate(`/trip/${(currentMyTrips[0] || currentSharedTrips[0]).trip_id}`)}
                  fullBleed
                  additionalTripsCount={totalCurrentTrips - 1}
                />
              </div>
              <div className="hidden md:block">
                <ActiveTripCard
                  trip={currentMyTrips[0] || currentSharedTrips[0]}
                  onViewItinerary={() => navigate(`/trip/${(currentMyTrips[0] || currentSharedTrips[0]).trip_id}`)}
                  additionalTripsCount={totalCurrentTrips - 1}
                />
              </div>
            </>
          )}
          {heroState === 'pre-trip' && nextTrip && (
            <NextTripBoardingPass
              trip={nextTrip}
              daysUntil={daysUntilNextTrip!}
              onViewTrip={() => navigate(`/trip/${nextTrip.trip_id}`)}
              className="-mx-4 rounded-none md:mx-0 md:rounded-2xl"
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
        </motion.div>

        {/* Travel Year — sits below the hero, above the action layer */}
        {(myTrips?.length || sharedTrips?.length) ? (
          <section className="mb-10" aria-labelledby="travel-year-heading">
            <h2 id="travel-year-heading" className="font-display text-2xl md:text-3xl text-earth-800 mb-4">
              Your travel year
            </h2>
            <MonthlyActivityChart data={travelStats.dailyActivity} />
          </section>
        ) : null}

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-earth-400 h-4 w-4" />
            <Input
              type="search"
              placeholder="Search destinations, dates..."
              aria-label="Search trips"
              className="pl-10 pr-4 py-3 bg-white border-earth-200 focus:border-earth-400 focus:ring-earth-400 rounded-card shadow-warm-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 mb-8" role="tablist" aria-label="Filter trips">
          <FilterChip
            active={tripFilter === 'all'}
            onClick={() => setTripFilter('all')}
            label="All trips"
            count={totalMyTrips + totalSharedTrips}
          />
          <FilterChip
            active={tripFilter === 'mine'}
            onClick={() => setTripFilter('mine')}
            label="My trips"
            count={totalMyTrips}
          />
          <FilterChip
            active={tripFilter === 'shared'}
            onClick={() => setTripFilter('shared')}
            label="Shared with me"
            count={totalSharedTrips}
            icon={<Share2 className="h-3.5 w-3.5" />}
          />
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
            {showHidden && (
              <div className="bg-sand-100 border border-sand-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-earth-700 text-sm">
                  <EyeOff className="h-4 w-4 shrink-0" />
                  <span>You're viewing {hiddenCount} hidden {hiddenCount === 1 ? 'trip' : 'trips'}.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHidden(false)}
                  className="text-sm font-medium text-earth-700 hover:text-earth-900 underline-offset-4 hover:underline whitespace-nowrap"
                >
                  Show active trips
                </button>
              </div>
            )}

            {/* Current Trips Section */}
            {currentTrips.length > 0 && (
              <section className="relative" aria-labelledby="section-current">
                <header className="mb-6 flex items-baseline gap-3">
                  <h2 id="section-current" className="font-display text-3xl md:text-4xl text-earth-800">Currently traveling</h2>
                  <span className="text-emerald-600 text-base font-medium tabular-nums">{currentTrips.length}</span>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {currentTrips.map((trip) => (
                    <TripCard
                      key={trip.trip_id}
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
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming Trips Section */}
            <section className="relative" aria-labelledby="section-upcoming">
              <header className="mb-6 flex items-baseline gap-3">
                <h2 id="section-upcoming" className="font-display text-3xl md:text-4xl text-earth-800">On the horizon</h2>
                <span className="text-earth-400 text-base font-medium tabular-nums">{filteredUpcomingTrips.length}</span>
              </header>

              {filteredUpcomingTrips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredUpcomingTrips.map((trip) => (
                    <TripCard
                      key={trip.trip_id}
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
                  ))}
                </div>
              ) : (
                <p className="text-earth-500 text-sm">
                  {tripFilter === 'shared'
                    ? 'Trips shared with you will appear here.'
                    : 'Plan a trip to see it here.'}
                </p>
              )}
            </section>

            {/* Past Trips Section */}
            <section className="relative" aria-labelledby="section-past">
              <header className="mb-6 flex items-baseline gap-3">
                <h2 id="section-past" className="font-display text-3xl md:text-4xl text-earth-600">Where you've been</h2>
                <span className="text-earth-400 text-base font-medium tabular-nums">{pastTrips.length}</span>
              </header>

              {pastTrips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {pastTrips.map((trip) => (
                    <TripCard
                      key={trip.trip_id}
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
                  ))}
                </div>
              ) : (
                <p className="text-earth-500 text-sm">Past trips will appear here.</p>
              )}
            </section>
          </div>
        )}

        {!showHidden && hiddenCount > 0 && (
          <div className="flex justify-center mt-12">
            <Button
              variant="ghost"
              onClick={() => setShowHidden(true)}
              className="text-earth-500 hover:text-earth-700"
            >
              <EyeOff className="h-4 w-4 mr-2" />
              Show {hiddenCount} hidden {hiddenCount === 1 ? 'trip' : 'trips'}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
};

export default MyTrips;
