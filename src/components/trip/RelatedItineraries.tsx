import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePublicTrips } from '@/hooks/usePublicTrips';
import TripCard from '@/components/trip/TripCard';
import { buildTripPath } from '@/utils/tripUrl';
import { regionFor } from '@/lib/regions';
import { DEFAULT_TRIP_IMAGE } from '@/constants/unsplash';

interface RelatedItinerariesProps {
  /** The trip being viewed; never listed as its own suggestion. */
  currentTripId: string;
  currentDestination: string;
  /** How many cards to show. */
  limit?: number;
}

/**
 * "More itineraries" rail at the foot of a public trip page.
 *
 * Every showcase page used to link out only to /explore, so each one was a
 * dead end for both readers and crawlers. This rail prefers trips in the same
 * region, then fills from the rest, and renders real <a href> cards so the
 * links count as internal links in the prerendered HTML.
 */
export default function RelatedItineraries({
  currentTripId,
  currentDestination,
  limit = 3,
}: RelatedItinerariesProps) {
  const { data: trips } = usePublicTrips();

  const related = useMemo(() => {
    const candidates = (trips ?? []).filter(
      (trip) => trip && trip.trip_id !== currentTripId && trip.slug && trip.destination,
    );
    const region = regionFor(currentDestination);
    const sameRegion = candidates.filter((trip) => regionFor(trip.destination) === region);
    const elsewhere = candidates.filter((trip) => regionFor(trip.destination) !== region);
    return [...sameRegion, ...elsewhere].slice(0, limit);
  }, [trips, currentTripId, currentDestination, limit]);

  if (related.length === 0) return null;

  return (
    <section aria-labelledby="related-itineraries-heading" className="mt-16 pt-10 border-t border-sand-200">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-earth-400 mb-2">
            Keep exploring
          </p>
          <h2 id="related-itineraries-heading" className="font-display text-2xl md:text-3xl text-earth-700">
            More itineraries
          </h2>
        </div>
        <Link
          to="/explore"
          className="text-sm font-medium text-sunset-600 hover:text-sunset-700 underline-offset-4 hover:underline whitespace-nowrap"
        >
          All destinations
        </Link>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 list-none m-0 p-0">
        {related.map((trip) => (
          <li key={trip.trip_id}>
            <TripCard
              trip={{
                ...trip,
                start_date: trip.arrival_date,
                end_date: trip.departure_date,
                cover_image_url: trip.cover_image_url || DEFAULT_TRIP_IMAGE,
              }}
              isExample
              linkTo={buildTripPath(trip)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
