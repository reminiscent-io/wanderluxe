import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { ExternalLink, MapPin, Star } from 'lucide-react';
import {
  EXPEDIA_FALLBACK_URL,
  mountExpediaWidget,
  trackExpediaClick,
  EXPEDIA_WIDGET_CAMREF,
} from '@/lib/expedia';

interface BookingViewProps {
  tripId: string | undefined;
  canEdit?: boolean;
}

const BookingView: React.FC<BookingViewProps> = ({ tripId }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [widgetFailed, setWidgetFailed] = useState(false);
  const widgetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (tripId) {
      trackBookingPageView(tripId);
    }
    // Fire-and-forget analytics; trackBookingPageView is a stable closure over component state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  useEffect(() => {
    if (widgetFailed) return;
    const widget = widgetRef.current;
    if (!widget) return;

    const cleanup = mountExpediaWidget({
      container: widget,
      camref: EXPEDIA_WIDGET_CAMREF,
      pubref: 'booking_page_widget',
      onError: () => setWidgetFailed(true),
    });

    const handler = () => trackExpediaClick('booking_page_widget', { trip_id: tripId });
    widget.addEventListener('click', handler);

    return () => {
      widget.removeEventListener('click', handler);
      cleanup();
    };
  }, [widgetFailed, tripId]);

  const trackBookingPageView = async (tripId: string) => {
    try {
      if (user) {
        window.gtag('event', 'booking_page_view', {
          event_category: 'Booking',
          event_label: tripId,
          user_id: user.id,
        });
      }
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  };

  const handleFallbackClick = () => {
    trackExpediaClick('booking_page_fallback', { trip_id: tripId });
  };

  const handleContactClick = () => {
    try {
      if (user && tripId) {
        window.gtag('event', 'advisor_contact', {
          event_category: 'Booking',
          event_label: tripId,
          user_id: user.id,
          value: 1,
        });

        window.open('https://www.foratravel.com/advisor/kevin-lowe', '_blank');

        toast({
          title: "Redirecting to Fora Travel",
          description: "Opening Kevin's profile page for booking assistance",
        });
      }
    } catch (error) {
      console.error('Error tracking advisor contact:', error);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="space-y-2">
        <h2 className="font-display text-2xl md:text-3xl leading-[1.1] tracking-tight text-foreground">
          Book your trip
        </h2>
        <p className="max-w-[58ch] text-sm text-muted-foreground">
          Search Expedia for stays and flights, or work with Kevin for a curated, white-glove plan.
        </p>
      </header>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
      {/* Primary: Expedia self-serve booking */}
      <Card className="flex flex-col p-5 sm:p-6">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
            Search Expedia
          </h3>
          <span className="hidden sm:inline text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Self-serve
          </span>
        </div>
        <p className="text-sm text-muted-foreground max-w-[60ch] mb-5">
          Stays and flights, instant confirmation, partner rates.
        </p>

        {widgetFailed ? (
          <div className="rounded-card border border-border bg-secondary/50 p-4 sm:p-5">
            <p className="text-sm text-foreground/85 mb-4">
              The Expedia search widget couldn&apos;t load. You can still browse and book directly.
            </p>
            <Button asChild className="h-11 sm:h-10 w-full sm:w-auto">
              <a
                href={EXPEDIA_FALLBACK_URL}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={handleFallbackClick}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Expedia
              </a>
            </Button>
          </div>
        ) : (
          <div className="min-h-[200px]">
            <div ref={widgetRef} />
          </div>
        )}

        <p className="mt-auto pt-4 text-xs text-muted-foreground">
          As an Expedia Group affiliate, WanderLuxe may earn a commission from eligible bookings.
        </p>
      </Card>

      {/* Secondary: Human travel advisor */}
      <Card className="flex flex-col p-5 sm:p-6">
        <div className="mb-5 flex items-baseline justify-between gap-3">
          <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
            Or speak with an advisor
          </h3>
          <span className="hidden sm:inline text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            White-glove
          </span>
        </div>

        <div className="flex items-start gap-4">
          <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
            <img
              src="https://res.cloudinary.com/foratravelweb/image/upload/c_fill,g_auto,h_640,w_640/f_webp/q_90/a1ade640-a52b-4571-9d4d-b17ff07d882a"
              alt="Kevin Lowe — Fora Travel Advisor"
              className="h-full w-full object-cover img-warm"
              loading="lazy"
            />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <h4 className="text-base font-semibold leading-tight text-foreground">
              Kevin Lowe
            </h4>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-medium text-muted-foreground">
              <span>Fora Travel Advisor</span>
              <span aria-hidden className="text-border">·</span>
              <span className="inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-current text-primary" aria-hidden />
                Certified
              </span>
            </p>
            <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Based in New York
            </p>
          </div>
        </div>

        <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-foreground/85">
          NYC-based traveler passionate about high-end US and Western Europe adventures, expertly
          balancing luxury experiences with smart value optimization.
        </p>

        {/* Expertise: mobile scroll-snap rail, wraps at sm and up */}
        <div
          className="mt-4 -mx-5 overflow-x-auto sm:mx-0 sm:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: 'x proximity' }}
        >
          <ul className="flex gap-1.5 px-5 pb-1 sm:flex-wrap sm:px-0 sm:pb-0">
            {['Luxury Travel', 'Honeymoons', 'NYC', 'Aspen', 'Paris', 'Euro Skiing'].map((expertise) => (
              <li
                key={expertise}
                className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                style={{ scrollSnapAlign: 'start' }}
              >
                {expertise}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row sm:items-center sm:gap-4">
          <Button
            variant="sunset"
            onClick={handleContactClick}
            className="h-11 sm:h-10 w-full sm:w-auto"
          >
            <ExternalLink className="h-4 w-4" />
            Contact Kevin on Fora Travel
          </Button>
          <p className="text-xs text-muted-foreground">
            Responds in 1–2 business days
          </p>
        </div>
      </Card>
      </div>

      {/* Why Book — editorial numbered list */}
      <Card className="p-5 sm:p-6">
        <div className="mb-5 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
            Why book through Kevin
          </h3>
        </div>

        <ol className="grid gap-x-10 gap-y-5 sm:gap-y-6 md:grid-cols-2">
          {[
            { t: 'Exclusive perks & upgrades', d: 'Room upgrades, hotel credits, complimentary breakfast, and extended check-in/out where available.' },
            { t: 'Keep your rewards', d: 'You still earn credit-card points and hotel loyalty points when you book through Fora.' },
            { t: 'Expert knowledge', d: 'Insider notes and recommendations from someone who has actually been there.' },
            { t: 'Personalized service', d: 'Custom itineraries tailored to your preferences, budget, and travel style.' },
            { t: 'Hotels & accommodations', d: 'Full booking for hotels, resorts, and vacation rentals — including Vrbo — at advisor rates.' },
            { t: 'Support when you need it', d: 'Help before, during, and after your trip. Peace of mind on the ground.' },
          ].map(({ t, d }, i) => (
            <li key={t} className="flex gap-4">
              <span
                aria-hidden
                className="font-display text-2xl leading-none tabular-nums text-primary/85 pt-[3px]"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0 space-y-1.5">
                <h4 className="text-sm font-semibold text-foreground">{t}</h4>
                <p className="text-sm leading-relaxed text-muted-foreground">{d}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-6 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Current services:</span>{' '}
          hotels, resorts, vacation rentals, ground transportation, and travel experiences.
          Flight booking is currently limited but may be available for select destinations.
        </p>
      </Card>
    </div>
  );
};

export default BookingView;
