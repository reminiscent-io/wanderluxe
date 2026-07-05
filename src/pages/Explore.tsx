import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { differenceInDays } from 'date-fns';
import Navigation from "../components/Navigation";
import { Button } from "@/components/ui/button";
import { usePublicTrips } from '@/hooks/usePublicTrips';
import TripCard from '../components/trip/TripCard';
import { Plus } from 'lucide-react';
import { Trip } from '@/types/trip';
import { useAuth } from "@/contexts/AuthContext";
import SEO, { SITE_URL } from '@/components/SEO';
import { buildTripPath } from '@/utils/tripUrl';
import { NextTripBoardingPass, DefaultHeroCard } from '@/components/trip/hero';
import { useTravelStats } from '@/hooks/useTravelStats';
import { DEFAULT_TRIP_IMAGE } from '@/constants/unsplash';
import {
  SectionHeader,
  TripSearch,
  TravelYearSection,
} from '@/components/trip/dashboard';

/** Whole-number nights between arrival and departure, or null if dates are missing. */
const getNights = (trip: Trip): number | null => {
  if (!trip.arrival_date || !trip.departure_date) return null;
  const ms = new Date(trip.departure_date).getTime() - new Date(trip.arrival_date).getTime();
  if (Number.isNaN(ms) || ms <= 0) return null;
  return Math.max(1, Math.round(ms / 86_400_000));
};

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

  const { data: publicTrips, isLoading } = usePublicTrips();

  // Search filter — matches destination, primary_destination, and date text
  const filteredTrips = useMemo(() => {
    if (!publicTrips) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return publicTrips.filter(trip => trip && trip.destination);
    }
    return publicTrips.filter(trip => {
      if (!trip || !trip.destination) return false;
      const haystack: string[] = [
        trip.destination ?? '',
        (trip as Trip & { primary_destination?: string }).primary_destination ?? '',
      ];
      const arrival = trip.arrival_date ? new Date(trip.arrival_date) : null;
      const departure = trip.departure_date ? new Date(trip.departure_date) : null;
      for (const date of [arrival, departure]) {
        if (date && !Number.isNaN(date.getTime())) {
          haystack.push(
            date.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
            date.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
          );
        }
      }
      return haystack.some(field => field.toLowerCase().includes(query));
    });
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
    const upcoming = filteredTrips
      .filter(trip => getTripCategory(trip) === 'upcoming')
      .sort((a, b) => new Date(a.arrival_date || '').getTime() - new Date(b.arrival_date || '').getTime());
    const current = filteredTrips.filter(trip => getTripCategory(trip) === 'current');
    const past = filteredTrips
      .filter(trip => getTripCategory(trip) === 'past')
      .sort((a, b) => new Date(b.departure_date || '').getTime() - new Date(a.departure_date || '').getTime());

    return { upcomingTrips: upcoming, currentTrips: current, pastTrips: past };
  }, [filteredTrips]);

  // Next upcoming trip drives the hero
  const nextTrip = useMemo(() => upcomingTrips[0], [upcomingTrips]);

  const daysUntilNextTrip = useMemo(() => {
    if (!nextTrip || !nextTrip.arrival_date) return null;
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const tripDateUTC = new Date(nextTrip.arrival_date + 'T00:00:00.000Z');
    return differenceInDays(tripDateUTC, todayUTC);
  }, [nextTrip]);

  const heroState = useMemo(() => {
    if (nextTrip && daysUntilNextTrip !== null && daysUntilNextTrip >= 0) {
      return 'pre-trip';
    }
    return 'default';
  }, [nextTrip, daysUntilNextTrip]);

  const travelStats = useTravelStats(publicTrips || []);

  const lastCompletedTrip = useMemo(() => pastTrips[0] || null, [pastTrips]);

  // Avoid showing the next trip twice when it's already in the hero
  const filteredUpcomingTrips = useMemo(() => {
    if (heroState === 'pre-trip' && nextTrip) {
      return upcomingTrips.filter(trip => trip.trip_id !== nextTrip.trip_id);
    }
    return upcomingTrips;
  }, [heroState, nextTrip, upcomingTrips]);

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

  const handleCtaClick = () => {
    if (window.gtag) {
      window.gtag('event', 'click', {
        event_category: 'Conversion',
        event_label: session ? 'Plan New Trip' : 'Get Started CTA',
        value: 1
      });
    }
    navigate(session ? '/create-trip' : '/auth');
  };

  const itemListJsonLd = publicTrips && publicTrips.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Curated trip itineraries",
        itemListElement: publicTrips.slice(0, 20).map((trip, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          url: `${SITE_URL}${buildTripPath(trip)}`,
          name: trip.destination,
        })),
      }
    : undefined;

  const totalPublicTrips = (publicTrips || []).length;

  return (
    <div className="flex flex-col min-h-screen bg-sand-50">
      <SEO
        title="Explore curated trip itineraries"
        description="Discover hand-crafted travel itineraries from Paris to Tokyo. Get inspired by expertly designed trips covering accommodations, activities, dining, and more."
        canonicalPath="/explore"
        jsonLd={itemListJsonLd}
      />
      <Navigation />
      <div className="container mx-auto px-4 pt-12 md:pt-20 pb-8 safe-pb">
        <h1 className="sr-only">Explore curated trip itineraries</h1>

        {/* Hero — single primary surface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          {heroState === 'pre-trip' && nextTrip && (
            <NextTripBoardingPass
              trip={nextTrip}
              daysUntil={daysUntilNextTrip!}
              onViewTrip={() => {
                handleTripClick(nextTrip, 'Hero');
                navigate(buildTripPath(nextTrip));
              }}
              className="-mx-4 rounded-none md:mx-0 md:rounded-2xl"
            />
          )}
          {heroState === 'default' && (
            <DefaultHeroCard
              onCreateTrip={handleCtaClick}
              lastTripImage={lastCompletedTrip?.cover_image_url}
            />
          )}
        </motion.div>

        {/* Travel Year — discoverable analytics, sits below the hero */}
        {totalPublicTrips > 0 && (
          <TravelYearSection data={travelStats.dailyActivity} />
        )}

        {/* Search + secondary CTA — single row, hero already carries the sunset CTA */}
        <div className="mb-8 flex items-center gap-2 sm:gap-3">
          <TripSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search destinations, dates..."
            ariaLabel="Search public trips"
            className="flex-1 max-w-none sm:max-w-md"
          />
          {/* Full label on tablet+ */}
          <Button
            onClick={handleCtaClick}
            variant="outline"
            className="hidden sm:inline-flex shrink-0 font-medium whitespace-nowrap"
          >
            <Plus className="h-4 w-4 mr-2" />
            {session ? 'Plan a trip' : 'Get started'}
          </Button>
          {/* Icon-only 44×44 on mobile to keep the fold breathable */}
          <Button
            onClick={handleCtaClick}
            variant="outline"
            size="icon"
            className="sm:hidden shrink-0 h-11 w-11 rounded-card"
            aria-label={session ? 'Plan a trip' : 'Get started'}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

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
          <div className="space-y-10 md:space-y-12">
            {/* Currently Traveling */}
            {currentTrips.length > 0 && (
              <section className="relative" aria-labelledby="explore-section-current">
                <SectionHeader
                  id="explore-section-current"
                  title="Currently traveling"
                  count={currentTrips.length}
                  countClassName="text-emerald-600"
                />
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
                      isExample={true}
                      linkTo={buildTripPath(trip)}
                      onNavigate={() => handleTripClick(trip, 'Current')}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* On the horizon */}
            <section className="relative" aria-labelledby="explore-section-upcoming">
              <SectionHeader
                id="explore-section-upcoming"
                title="On the horizon"
                count={filteredUpcomingTrips.length}
              />
              {filteredUpcomingTrips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {filteredUpcomingTrips.map((trip) => (
                    <TripCard
                      key={trip.trip_id}
                      trip={{
                        ...trip,
                        start_date: trip.arrival_date,
                        end_date: trip.departure_date,
                        cover_image_url: trip.cover_image_url || DEFAULT_TRIP_IMAGE
                      }}
                      isExample={true}
                      linkTo={buildTripPath(trip)}
                      onNavigate={() => handleTripClick(trip, 'Upcoming')}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-earth-500 text-sm">
                  {searchQuery
                    ? `No upcoming trips match "${searchQuery}".`
                    : 'New itineraries appear here as they go live.'}
                </p>
              )}
            </section>

            {/* Where they've been */}
            <section className="relative" aria-labelledby="explore-section-past">
              <SectionHeader
                id="explore-section-past"
                title="Where they've been"
                count={pastTrips.length}
                muted
              />
              {pastTrips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {pastTrips.map((trip) => (
                    <TripCard
                      key={trip.trip_id}
                      trip={{
                        ...trip,
                        start_date: trip.arrival_date,
                        end_date: trip.departure_date,
                        cover_image_url: trip.cover_image_url || DEFAULT_TRIP_IMAGE
                      }}
                      isExample={true}
                      linkTo={buildTripPath(trip)}
                      onNavigate={() => handleTripClick(trip, 'Past')}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-earth-500 text-sm">
                  {searchQuery
                    ? `No past trips match "${searchQuery}".`
                    : 'Past itineraries will appear here.'}
                </p>
              )}
            </section>

            {/* Search returned nothing across all sections */}
            {searchQuery && filteredTrips.length === 0 && (
              <div className="flex items-center justify-between gap-3 bg-sand-100 border border-sand-200 rounded-card px-4 py-3">
                <p className="text-earth-700 text-sm">
                  Nothing matched <span className="font-medium">&ldquo;{searchQuery}&rdquo;</span>.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-sm font-medium text-earth-700 hover:text-earth-900 underline-offset-4 hover:underline whitespace-nowrap"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        )}

        {/* All destinations — a crawlable hub. Always lists every public
            destination (independent of the search filter and the card grids
            above) so search engines find a descriptive <a href> to each
            itinerary in the server-rendered HTML, fixing the orphaned pages. */}
        {totalPublicTrips > 0 && (
          <nav
            aria-labelledby="all-destinations-heading"
            className="mt-16 pt-10 border-t border-sand-200"
          >
            <h2
              id="all-destinations-heading"
              className="font-display text-2xl md:text-3xl text-earth-700"
            >
              All destinations
            </h2>
            <p className="text-earth-500 text-sm mt-1 mb-6">
              Browse every curated itinerary.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
              {(publicTrips || [])
                .filter((trip) => trip && trip.slug && trip.is_public && trip.destination)
                .map((trip) => {
                  const nights = getNights(trip);
                  return (
                    <li key={trip.trip_id}>
                      <Link
                        to={buildTripPath(trip)}
                        onClick={() => handleTripClick(trip, 'All destinations')}
                        className="group inline-flex items-baseline gap-2 text-earth-700 hover:text-sunset-600 transition-colors"
                      >
                        <span className="font-medium underline-offset-4 group-hover:underline">
                          {trip.destination}
                        </span>
                        {nights && (
                          <span className="text-sm text-earth-400">
                            — {nights} {nights === 1 ? 'night' : 'nights'}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
};

export default Explore;
