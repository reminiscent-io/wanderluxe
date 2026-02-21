import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { differenceInDays } from 'date-fns';
import Navigation from "../components/Navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import TripCard from '../components/trip/TripCard';
import { Card } from "@/components/ui/card";
import { Search, Calendar, MapPin, Clock, Plane, Plus, Globe, CheckCircle } from 'lucide-react';
import { Trip } from '@/types/trip';
import { useAuth } from "@/contexts/AuthContext";

// Import hero and stats components from MyTrips
import { NextTripBoardingPass, DefaultHeroCard } from '@/components/trip/hero';
import { TravelStatsCard, MonthlyActivityChart } from '@/components/trip/stats';

const Explore = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { session } = useAuth();

  // Track page view on component mount
  useEffect(() => {
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: 'Explore Trips',
        page_location: window.location.href,
        page_path: window.location.pathname,
        user_authenticated: !!session
      });
    }
  }, [session]);

  const { data: publicTrips, isLoading } = useQuery({
    queryKey: ['public-trips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('is_public', true)
        .order('arrival_date', { ascending: true });

      if (error) {
        console.error('Error fetching public trips:', error);
        throw error;
      }

      return data as Trip[];
    },
  });

  const filteredTrips = useMemo(() => {
    if (!publicTrips) return [];

    return publicTrips.filter(trip =>
      trip && trip.destination && trip.destination.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [publicTrips, searchQuery]);

  // Track search queries
  useEffect(() => {
    if (searchQuery && window.gtag) {
      const timeoutId = setTimeout(() => {
        window.gtag('event', 'search', {
          search_term: searchQuery,
          event_category: 'Explore',
          event_label: 'Destination Search',
          results_count: filteredTrips.length
        });
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, filteredTrips.length]);

  const getTripCategory = (trip: Trip): 'upcoming' | 'current' | 'past' => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const arrivalDate = new Date(trip.arrival_date || '');
    const departureDate = new Date(trip.departure_date || '');

    if (today >= arrivalDate && today <= departureDate) {
      return 'current';
    }

    if (arrivalDate > today) {
      return 'upcoming';
    }

    return 'past';
  };

  const { upcomingTrips, currentTrips, pastTrips } = useMemo(() => {
    const upcoming = filteredTrips.filter(trip => getTripCategory(trip) === 'upcoming');
    const current = filteredTrips.filter(trip => getTripCategory(trip) === 'current');
    const past = filteredTrips.filter(trip => getTripCategory(trip) === 'past');

    return {
      upcomingTrips: upcoming,
      currentTrips: current,
      pastTrips: past
    };
  }, [filteredTrips]);

  // Calculate next upcoming trip for hero
  const nextTrip = useMemo(() => {
    const allUpcoming = [...upcomingTrips].sort((a, b) => {
      const dateA = new Date(a.arrival_date || '');
      const dateB = new Date(b.arrival_date || '');
      return dateA.getTime() - dateB.getTime();
    });
    return allUpcoming[0];
  }, [upcomingTrips]);

  const daysUntilNextTrip = useMemo(() => {
    if (!nextTrip || !nextTrip.arrival_date) return null;
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const tripDateUTC = new Date(nextTrip.arrival_date + 'T00:00:00.000Z');
    return differenceInDays(tripDateUTC, todayUTC);
  }, [nextTrip]);

  // Determine hero state
  const heroState = useMemo(() => {
    if (currentTrips.length > 0) {
      return 'on-trip';
    }
    if (nextTrip && daysUntilNextTrip !== null && daysUntilNextTrip >= 0) {
      return 'pre-trip';
    }
    return 'default';
  }, [currentTrips, nextTrip, daysUntilNextTrip]);

  // Calculate simple stats for public trips
  const travelStats = useMemo(() => {
    const allTrips = publicTrips || [];
    const completed = pastTrips.length;
    const total = allTrips.length;

    // Calculate total days traveled from past trips
    let totalDays = 0;
    pastTrips.forEach(trip => {
      if (trip.arrival_date && trip.departure_date) {
        const arrival = new Date(trip.arrival_date);
        const departure = new Date(trip.departure_date);
        totalDays += Math.max(0, differenceInDays(departure, arrival) + 1);
      }
    });

    // Get unique destinations
    const destinations = new Set(allTrips.map(t => t.destination?.split(',')[0]?.trim()).filter(Boolean));

    // Monthly activity (simplified)
    const monthlyActivity = Array.from({ length: 12 }, (_, i) => ({
      month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
      trips: allTrips.filter(t => {
        const date = new Date(t.arrival_date || '');
        return date.getMonth() === i;
      }).length
    }));

    return {
      totalDaysTraveled: totalDays,
      completedTrips: completed,
      completionRate: { completed, total },
      countriesVisited: destinations.size,
      monthlyActivity
    };
  }, [publicTrips, pastTrips]);

  // Get last completed trip for background
  const lastCompletedTrip = useMemo(() => {
    return pastTrips[0] || null;
  }, [pastTrips]);

  // Filter upcoming trips to avoid showing next trip twice
  const filteredUpcomingTrips = useMemo(() => {
    if (heroState === 'pre-trip' && nextTrip) {
      return upcomingTrips.filter(trip => trip.trip_id !== nextTrip.trip_id);
    }
    return upcomingTrips;
  }, [heroState, nextTrip, upcomingTrips]);

  // Track trip click
  const handleTripClick = (trip: Trip, category: string) => {
    if (window.gtag) {
      window.gtag('event', 'select_content', {
        event_category: 'Explore',
        event_label: `Trip Click - ${category}`,
        content_type: 'trip',
        item_id: trip.trip_id,
        destination: trip.destination,
        trip_category: category.toLowerCase()
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-sand-50 via-sand-50 to-earth-50">
      <Navigation />
      <div className="container mx-auto px-4 pt-20 pb-8">
        {/* Dynamic Hero Section - Same as MyTrips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          {/* Mobile: Full-bleed hero */}
          <div className="md:hidden">
            {heroState === 'pre-trip' && nextTrip && (
              <NextTripBoardingPass
                trip={nextTrip}
                daysUntil={daysUntilNextTrip!}
                onViewTrip={() => navigate(`/trip/${nextTrip.trip_id}`)}
                className="-mx-4 rounded-none"
              />
            )}
            {(heroState === 'default' || heroState === 'on-trip') && (
              <DefaultHeroCard
                onCreateTrip={() => navigate(session ? '/create-trip' : '/auth')}
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
              {heroState === 'pre-trip' && nextTrip && (
                <NextTripBoardingPass
                  trip={nextTrip}
                  daysUntil={daysUntilNextTrip!}
                  onViewTrip={() => navigate(`/trip/${nextTrip.trip_id}`)}
                />
              )}
              {(heroState === 'default' || heroState === 'on-trip') && (
                <DefaultHeroCard
                  onCreateTrip={() => navigate(session ? '/create-trip' : '/auth')}
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

        {/* Search and Actions - Same as MyTrips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="search"
                placeholder="Search destinations..."
                className="pl-10 pr-4 py-3 bg-white border-earth-200 focus:border-earth-400 focus:ring-earth-400 rounded-xl shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (window.gtag) {
                    window.gtag('event', 'click', {
                      event_category: 'Conversion',
                      event_label: session ? 'Plan New Trip' : 'Get Started CTA',
                      value: 1
                    });
                  }
                  navigate(session ? '/create-trip' : '/auth');
                }}
                className="px-6 py-3 rounded-xl shadow-sm flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{session ? 'Plan New Trip' : 'Get Started'}</span>
                <span className="sm:hidden">{session ? 'New Trip' : 'Start'}</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Trip Sections */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
                    <p className="text-earth-600 text-sm mt-1">Active adventures</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {currentTrips.map((trip) => (
                    <motion.div
                      key={trip.trip_id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => handleTripClick(trip, 'Current')}
                    >
                      <TripCard
                        trip={{
                          ...trip,
                          start_date: trip.arrival_date,
                          end_date: trip.departure_date,
                          cover_image_url: trip.cover_image_url || 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f'
                        }}
                        isExample={true}
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
                      onClick={() => handleTripClick(trip, 'Upcoming')}
                    >
                      <TripCard
                        trip={{
                          ...trip,
                          start_date: trip.arrival_date,
                          end_date: trip.departure_date,
                          cover_image_url: trip.cover_image_url || 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f'
                        }}
                        isExample={true}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center bg-gradient-to-br from-sand-50 to-earth-50 border-sand-200">
                  <div className="max-w-md mx-auto">
                    <div className="bg-sand-200 rounded-full p-4 w-20 h-20 mx-auto mb-6">
                      <MapPin className="h-12 w-12 text-earth-600 mx-auto" />
                    </div>
                    <h3 className="text-xl font-semibold text-earth-800 mb-3">
                      Your Next Adventure Awaits
                    </h3>
                    <p className="text-earth-600 mb-6">
                      Ready to explore somewhere new? Let's plan your perfect getaway.
                    </p>
                    <Button
                      onClick={() => navigate(session ? '/create-trip' : '/auth')}
                      className="px-8 py-3 rounded-xl font-medium"
                    >
                      {session ? 'Plan Your Trip' : 'Get Started'}
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
                      onClick={() => handleTripClick(trip, 'Past')}
                    >
                      <TripCard
                        trip={{
                          ...trip,
                          start_date: trip.arrival_date,
                          end_date: trip.departure_date,
                          cover_image_url: trip.cover_image_url || 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f'
                        }}
                        isExample={true}
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
                    <p className="text-earth-400 text-sm mt-1">Travel memories will appear here</p>
                  </div>
                </Card>
              )}
            </motion.div>

            {/* Empty State for No Trips and No Search */}
            {filteredUpcomingTrips.length === 0 && currentTrips.length === 0 && pastTrips.length === 0 && !searchQuery && heroState !== 'pre-trip' && (
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
                      Your Journey Begins Here
                    </h3>
                    <p className="text-earth-600 text-lg mb-8 leading-relaxed">
                      Ready to explore the world? Create your first trip and let the adventures begin.
                      From dream destinations to detailed itineraries, we'll help you plan every step.
                    </p>
                    <Button
                      onClick={() => navigate(session ? '/create-trip' : '/auth')}
                      size="lg"
                      className="px-10 py-4 rounded-xl text-lg font-semibold shadow-warm-lg hover:shadow-warm-xl transition-all duration-300"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      {session ? 'Create Your First Trip' : 'Get Started Free'}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Search Empty State */}
            {filteredTrips.length === 0 && searchQuery && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <Card className="p-16 text-center bg-gradient-to-br from-sand-50 to-earth-50 border-earth-200 shadow-warm-xl">
                  <div className="max-w-lg mx-auto">
                    <div className="bg-earth-100 rounded-full p-6 w-28 h-28 mx-auto mb-8">
                      <Search className="h-16 w-16 text-earth-600 mx-auto" />
                    </div>
                    <h3 className="text-3xl font-bold text-earth-800 mb-4">
                      No Trips Found
                    </h3>
                    <p className="text-earth-600 text-lg mb-8 leading-relaxed">
                      We couldn't find any trips matching "{searchQuery}". Try a different search term.
                    </p>
                    <Button
                      onClick={() => setSearchQuery('')}
                      variant="outline"
                      className="px-8 py-3 rounded-xl font-medium"
                    >
                      Clear Search
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;
