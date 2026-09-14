import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePublicTrips } from "@/hooks/usePublicTrips";
import TripCard from "@/components/trip/TripCard";
import { buildTripPath } from "@/utils/tripUrl";
import { DEFAULT_TRIP_IMAGE } from "@/constants/unsplash";

const RAIL_ID = "featured-destinations-rail";
const RAIL_ITEM_CLASS =
  "w-[82%] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]";
// While the showcase loads, placeholders at TripCard's resting height (its h-56
// cover plus the footer row) hold the rail open. Three fill the widest rail.
const PLACEHOLDER_COUNT = 3;
const VIEW_ALL_CLASS =
  "rounded-sm text-sm font-medium text-earth-600 underline decoration-earth-300 underline-offset-4 transition-colors hover:decoration-earth-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50";

/**
 * Homepage featured-destinations section.
 *
 * Surfaces a handful of public itineraries as real, crawlable <a href> links
 * (via TripCard's linkTo) so the high-authority homepage passes link equity to
 * the individual /explore/{slug} destination pages — they were previously
 * reachable only through the sitemap (orphaned). While the query is in flight
 * it holds its height with placeholders; it renders nothing only when there
 * are no public trips.
 *
 * Laid out as a horizontal scroll-snap rail rather than a wrapping grid: as a
 * grid the six cards cost two rows on desktop and six full-height rows on a
 * phone, which buried everything below it. The rail keeps the whole set to one
 * card-height at every breakpoint. It is a native scroll container (the house
 * pattern — see DESIGN.md "Mobile Chip Rails"), not a JS carousel, so every
 * card stays in the DOM and crawlable, swipe keeps its native momentum, and
 * the arrows are pure enhancement layered on top.
 */
const FeaturedDestinations = () => {
  const { data: trips, isLoading } = usePublicTrips();
  const prefersReducedMotion = useReducedMotion();
  const railRef = useRef<HTMLUListElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const featured = useMemo(
    () =>
      (trips ?? [])
        .filter((trip) => trip && trip.is_public && trip.slug && trip.destination)
        .slice(0, 6),
    [trips],
  );

  const syncScrollAffordances = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    // Sub-pixel scroll positions never land exactly on 0 / maxScroll, so both
    // ends get a 1px tolerance — otherwise an arrow stays enabled at the edge.
    const maxScroll = rail.scrollWidth - rail.clientWidth;
    setCanScrollPrev(rail.scrollLeft > 1);
    setCanScrollNext(rail.scrollLeft < maxScroll - 1);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    syncScrollAffordances();
    rail.addEventListener("scroll", syncScrollAffordances, { passive: true });
    // Card widths are percentage-based, so a resize changes what overflows.
    const observer = new ResizeObserver(syncScrollAffordances);
    observer.observe(rail);

    return () => {
      rail.removeEventListener("scroll", syncScrollAffordances);
      observer.disconnect();
    };
  }, [syncScrollAffordances, featured.length]);

  const scrollByCard = useCallback(
    (direction: 1 | -1) => {
      const rail = railRef.current;
      if (!rail) return;
      const card = rail.firstElementChild as HTMLElement | null;
      const gap = Number.parseFloat(getComputedStyle(rail).columnGap) || 0;
      const step = card ? card.offsetWidth + gap : rail.clientWidth;
      rail.scrollBy({
        left: direction * step,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    },
    [prefersReducedMotion],
  );

  // Hold the section open while loading. The app mounts with createRoot, which
  // discards the prerendered cards, so returning null here collapsed the section
  // and then shoved everything below it down when the trips arrived.
  if (!isLoading && featured.length === 0) return null;

  // Nothing overflows (a short showcase, a very wide viewport) — no arrows.
  const showArrows = canScrollPrev || canScrollNext;
  const arrowClass =
    "flex h-10 w-10 items-center justify-center rounded-full border border-earth-200 bg-background text-earth-500 transition-colors hover:border-earth-300 hover:text-earth-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50 disabled:cursor-default disabled:opacity-40 disabled:hover:border-earth-200 disabled:hover:text-earth-500";

  return (
    <section
      className="relative bg-sand-50 overflow-hidden"
      aria-labelledby="featured-destinations-heading"
    >
      <div className="absolute inset-0 bg-grain" />
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h2
              id="featured-destinations-heading"
              className="font-display text-3xl md:text-4xl text-earth-600"
            >
              Explore curated trips
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <Link
              to="/explore"
              className={`hidden whitespace-nowrap sm:inline-flex ${VIEW_ALL_CLASS}`}
            >
              View all destinations
            </Link>
            {showArrows && (
              // Touch gets the native swipe; arrows are the desktop affordance.
              <div className="hidden md:flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollByCard(-1)}
                  disabled={!canScrollPrev}
                  aria-controls={RAIL_ID}
                  aria-label="Previous itineraries"
                  className={arrowClass}
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollByCard(1)}
                  disabled={!canScrollNext}
                  aria-controls={RAIL_ID}
                  aria-label="Next itineraries"
                  className={arrowClass}
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/*
          Full-bleed under `sm` so a card can bleed off the gutter and advertise
          the next one; `scroll-pl-6` keeps a snapped card aligned with the page
          gutter rather than sliding under the padding. `py-4` is headroom for
          TripCard's hover lift and warm shadow, which `overflow-x-auto` would
          otherwise clip (a non-visible overflow on one axis forces the other).
        */}
        <ul
          id={RAIL_ID}
          ref={railRef}
          aria-label="Featured itineraries"
          aria-busy={isLoading || undefined}
          className="no-scrollbar -mx-6 flex list-none snap-x snap-mandatory gap-6 overflow-x-auto scroll-pl-6 px-6 py-4 sm:mx-0 sm:scroll-pl-0 sm:px-0"
        >
          {isLoading &&
            Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
              <li key={i} className={RAIL_ITEM_CLASS} aria-hidden="true">
                <div className="h-[292px] rounded-card bg-sand-100/60" />
              </li>
            ))}
          {featured.map((trip) => (
            <li key={trip.trip_id} className={RAIL_ITEM_CLASS}>
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

        <div className="mt-2 sm:hidden">
          <Link
            to="/explore"
            className={`inline-flex min-h-[44px] items-center ${VIEW_ALL_CLASS}`}
          >
            View all destinations
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedDestinations;
