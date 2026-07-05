import { useMemo } from "react";
import { Link } from "react-router-dom";
import { usePublicTrips } from "@/hooks/usePublicTrips";
import TripCard from "@/components/trip/TripCard";
import { buildTripPath } from "@/utils/tripUrl";
import { DEFAULT_TRIP_IMAGE } from "@/constants/unsplash";

/**
 * Homepage featured-destinations section.
 *
 * Surfaces a handful of public itineraries as real, crawlable <a href> links
 * (via TripCard's linkTo) so the high-authority homepage passes link equity to
 * the individual /explore/{slug} destination pages — they were previously
 * reachable only through the sitemap (orphaned). Renders nothing until data is
 * available, so it never blocks the hero.
 */
const FeaturedDestinations = () => {
  const { data: trips } = usePublicTrips();

  const featured = useMemo(
    () =>
      (trips ?? [])
        .filter((trip) => trip && trip.is_public && trip.slug && trip.destination)
        .slice(0, 6),
    [trips],
  );

  if (featured.length === 0) return null;

  return (
    <section
      className="relative bg-sand-50 overflow-hidden"
      aria-labelledby="featured-destinations-heading"
    >
      <div className="absolute inset-0 bg-grain" />
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="flex items-end justify-between gap-4 mb-10">
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-earth-400 mb-3">
              Featured itineraries
            </p>
            <h2
              id="featured-destinations-heading"
              className="font-display text-3xl md:text-4xl text-earth-600"
            >
              Explore curated trips
            </h2>
          </div>
          <Link
            to="/explore"
            className="hidden sm:inline-flex shrink-0 text-sm font-medium text-sunset-600 hover:text-sunset-700 underline-offset-4 hover:underline whitespace-nowrap"
          >
            View all destinations
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((trip) => (
            <TripCard
              key={trip.trip_id}
              trip={{
                ...trip,
                start_date: trip.arrival_date,
                end_date: trip.departure_date,
                cover_image_url: trip.cover_image_url || DEFAULT_TRIP_IMAGE,
              }}
              isExample
              linkTo={buildTripPath(trip)}
            />
          ))}
        </div>

        <div className="mt-8 sm:hidden">
          <Link
            to="/explore"
            className="text-sm font-medium text-sunset-600 hover:text-sunset-700 underline-offset-4 hover:underline"
          >
            View all destinations
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedDestinations;
