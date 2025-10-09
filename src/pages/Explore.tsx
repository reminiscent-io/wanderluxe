import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navigation from "../components/Navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import TripCard from '../components/trip/TripCard';
import { Card, CardContent } from "@/components/ui/card";
import { Search, Calendar, MapPin, Compass, Sparkles, ArrowRight } from 'lucide-react';
import { Trip } from '@/types/trip';
import { useAuth } from "@/contexts/AuthContext";

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
      }, 500); // Debounce search tracking

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
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="relative bg-gradient-to-br from-earth-600 via-earth-700 to-earth-800 rounded-2xl p-8 md:p-12 shadow-xl overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }} />
            </div>
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <Compass className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight text-white">
                  Explore Trips
                </h1>
              </div>
              <p className="text-white/90 text-xl md:text-2xl font-medium mb-8 leading-relaxed max-w-3xl">
                Discover curated travel experiences and get inspired for your next adventure
              </p>

              {!session && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-6 w-6 text-yellow-300" />
                      <div>
                        <h3 className="text-white font-bold text-lg">Ready to plan your own trip?</h3>
                        <p className="text-white/80 text-sm">Create an account to build personalized itineraries</p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => {
                        if (window.gtag) {
                          window.gtag('event', 'click', {
                            event_category: 'Conversion',
                            event_label: 'Get Started - Header CTA',
                            value: 1
                          });
                        }
                        navigate('/auth');
                      }}
                      className="bg-white text-earth-800 hover:bg-white/90 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 whitespace-nowrap"
                    >
                      Get Started
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mb-8"
        >
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="search"
              placeholder="Search destinations..."
              className="pl-10 pr-4 py-3 bg-white border-earth-200 focus:border-earth-400 focus:ring-earth-400 rounded-xl shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-64 bg-gray-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-12">
            {currentTrips.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-emerald-100">
                  <div className="bg-emerald-100 rounded-xl p-3">
                    <MapPin className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-earth-800">
                      Happening Now
                    </h2>
                    <p className="text-earth-600 text-sm mt-1">Active travel experiences</p>
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

            {upcomingTrips.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-100">
                  <div className="bg-blue-100 rounded-xl p-3">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-earth-800">
                      Upcoming Adventures
                    </h2>
                    <p className="text-earth-600 text-sm mt-1">Future travel inspiration</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {upcomingTrips.map((trip, index) => (
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
              </motion.div>
            )}

            {pastTrips.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                  <div className="bg-gray-100 rounded-xl p-3">
                    <Compass className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-earth-800">
                      Past Adventures
                    </h2>
                    <p className="text-earth-600 text-sm mt-1">Travel memories and experiences</p>
                  </div>
                </div>

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
              </motion.div>
            )}

            {filteredTrips.length === 0 && !isLoading && (
              <Card className="p-12 text-center bg-gradient-to-br from-sand-50 to-earth-50 border-earth-100">
                <div className="max-w-md mx-auto">
                  <div className="bg-earth-100 rounded-full p-4 w-20 h-20 mx-auto mb-6">
                    <Compass className="h-12 w-12 text-earth-600 mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-earth-800 mb-3">
                    No Public Trips Yet
                  </h3>
                  <p className="text-earth-600 mb-6">
                    Check back soon for inspiring travel experiences!
                  </p>
                  {!session && (
                    <Button 
                      onClick={() => {
                        if (window.gtag) {
                          window.gtag('event', 'click', {
                            event_category: 'Conversion',
                            event_label: 'Create Your Own Trip - Empty State CTA',
                            value: 1
                          });
                        }
                        navigate('/auth');
                      }} 
                      className="bg-earth-600 hover:bg-earth-700 text-white px-8 py-3 rounded-xl font-medium"
                    >
                      Create Your Own Trip
                    </Button>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        {!session && filteredTrips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-12"
          >
            <Card className="p-8 md:p-12 text-center bg-gradient-to-br from-earth-600 to-earth-700 border-0 shadow-xl">
              <div className="max-w-2xl mx-auto">
                <Sparkles className="h-12 w-12 text-yellow-300 mx-auto mb-4" />
                <h3 className="text-3xl font-bold text-white mb-4">
                  Inspired? Start Planning Your Journey
                </h3>
                <p className="text-white/90 text-lg mb-8">
                  Create your personalized travel itinerary with AI-powered planning, collaborative features, and more
                </p>
                <Button 
                  onClick={() => {
                    if (window.gtag) {
                      window.gtag('event', 'click', {
                        event_category: 'Conversion',
                        event_label: 'Sign Up Free - Bottom CTA',
                        value: 1
                      });
                    }
                    navigate('/auth');
                  }} 
                  size="lg"
                  className="bg-white text-earth-800 hover:bg-white/90 px-10 py-4 rounded-xl font-bold text-lg flex items-center gap-3 mx-auto"
                >
                  Sign Up Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Explore;
