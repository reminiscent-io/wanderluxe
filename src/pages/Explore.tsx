import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import Navigation from "../components/Navigation";
import { Button } from "@/components/ui/button";
import { usePublicTrips } from '@/hooks/usePublicTrips';
import TripCard from '../components/trip/TripCard';
import { Plus } from 'lucide-react';
import { Trip } from '@/types/trip';
import { useAuth } from "@/contexts/AuthContext";
import SEO, { SITE_URL } from '@/components/SEO';
import { buildTripPath, tripTitle } from '@/utils/tripUrl';
import { DEFAULT_TRIP_IMAGE } from '@/constants/unsplash';
import { groupByRegion } from '@/lib/regions';
import { SectionHeader, TripSearch } from '@/components/trip/dashboard';

/** Whole-number nights between arrival and departure, or null if dates are missing. */
const getNights = (trip: Trip): number | null => {
  if (!trip.arrival_date || !trip.departure_date) return null;
  const ms = new Date(trip.departure_date).getTime() - new Date(trip.arrival_date).getTime();
  if (Number.isNaN(ms) || ms <= 0) return null;
  return Math.max(1, Math.round(ms / 86_400_000));
};

/**
 * Explore: the public index of showcase itineraries.
 *
 * This used to reuse the My Trips dashboard wholesale (a countdown to the
 * "next" showcase trip, a Travel Year chart, upcoming/current/past buckets).
 * A visitor has no upcoming trip here, and a curated itinerary is not an
 * event that passes. It is now a destination index: heading, search, and a
 * grid grouped by region, with every card an evergreen "N nights · Month".
 */
const Explore = () => {
  const navigate = useNavigate();
  // The homepage's JSON-LD SearchAction advertises /explore?search={term}, so
  // the query lives in the URL: seeded from it on load, written back (replace,
  // not push) as the user types, so a result set is shareable and the back
  // button never walks through keystrokes.
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') ?? '');
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = searchParams.get('search') ?? '';
      const next = searchQuery.trim();
      if (current === next) return;
      const params = new URLSearchParams(searchParams);
      if (next) params.set('search', next);
      else params.delete('search');
      setSearchParams(params, { replace: true });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery, searchParams, setSearchParams]);
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

  const listedTrips = useMemo(
    () => (publicTrips ?? []).filter((trip) => trip && trip.destination),
    [publicTrips],
  );

  // Search filter — matches title, destination, primary_destination, and month
  const filteredTrips = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return listedTrips;
    return listedTrips.filter(trip => {
      const haystack: string[] = [
        trip.title ?? '',
        trip.destination ?? '',
        (trip as Trip & { primary_destination?: string }).primary_destination ?? '',
      ];
      const arrival = trip.arrival_date ? new Date(trip.arrival_date) : null;
      if (arrival && !Number.isNaN(arrival.getTime())) {
        haystack.push(arrival.toLocaleString('en-US', { month: 'long' }));
      }
      return haystack.some(field => field.toLowerCase().includes(query));
    });
  }, [listedTrips, searchQuery]);

  // Track search queries
  useEffect(() => {
    if (searchQuery && window.gtag) {
      const timeoutId = setTimeout(() => {
        window.gtag('event', 'search', {
          search_term: searchQuery,
          event_category: 'Explore',
          event_label: 'Public Trips Search',
          results_count: filteredTrips.length
        });
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, filteredTrips.length]);

  const sections = useMemo(
    () =>
      groupByRegion(
        [...filteredTrips].sort((a, b) => tripTitle(a).localeCompare(tripTitle(b))),
        (trip) => trip.destination,
      ),
    [filteredTrips],
  );

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

  const itemListJsonLd = listedTrips.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Curated trip itineraries",
        itemListElement: listedTrips.slice(0, 50).map((trip, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          url: `${SITE_URL}${buildTripPath(trip)}`,
          name: tripTitle(trip),
        })),
      }
    : undefined;

  const totalPublicTrips = listedTrips.length;

  return (
    <div className="flex flex-col min-h-screen bg-sand-50">
      <SEO
        title="Explore curated trip itineraries"
        description="Day-by-day luxury itineraries you can copy into your own trip: hotels, dinners, and the hours in between, from Tokyo to Marrakech."
        canonicalPath="/explore"
        jsonLd={itemListJsonLd}
      />
      <Navigation />
      <div className="container mx-auto px-4 pt-12 md:pt-20 pb-8 safe-pb">
        {/* Header */}
        <header className="mb-8 md:mb-10 max-w-2xl">
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-earth-400 mb-3">
            Itineraries
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-earth-700 leading-[1.05]">
            Trips worth copying
          </h1>
          <p className="mt-4 text-lg text-earth-500 leading-relaxed">
            Every itinerary here is complete: the hotel, the table, the hours in between.
            Open one, take a copy, set your dates, and change what you like.
          </p>
        </header>

        {/* Search + CTA — single row */}
        <div className="mb-10 flex items-center gap-2 sm:gap-3">
          <TripSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search destinations, months..."
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

        {/* Region sections */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-64 bg-muted rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : sections.length > 0 ? (
          <div className="space-y-10 md:space-y-12">
            {sections.map(({ region, items }) => {
              const id = `explore-region-${region.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
              return (
                <section key={region} className="relative" aria-labelledby={id}>
                  <SectionHeader id={id} title={region} count={items.length} />
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {items.map((trip) => (
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
                        onNavigate={() => handleTripClick(trip, region)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : searchQuery ? (
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
        ) : (
          <p className="text-earth-500 text-sm">New itineraries appear here as they go live.</p>
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
              {listedTrips
                .filter((trip) => trip.slug && trip.is_public)
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
                          {tripTitle(trip)}
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
