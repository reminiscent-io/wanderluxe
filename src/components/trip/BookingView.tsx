import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { ExternalLink, MapPin, Star } from 'lucide-react';
import {
  EXPEDIA_WIDGET_CAMREF,
  EXPEDIA_FALLBACK_URL,
  loadExpediaWidgetScript,
  trackExpediaClick,
} from '@/lib/expedia';

interface BookingViewProps {
  tripId: string | undefined;
  canEdit?: boolean;
}

const BookingView: React.FC<BookingViewProps> = ({ tripId }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [widgetFailed, setWidgetFailed] = useState(false);
  const widgetContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (tripId) {
      trackBookingPageView(tripId);
    }
  }, [tripId]);

  useEffect(() => {
    let cancelled = false;
    loadExpediaWidgetScript().catch(() => {
      if (!cancelled) setWidgetFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (widgetFailed) return;
    const el = widgetContainerRef.current;
    if (!el) return;
    const handler = () => trackExpediaClick('booking_page_widget', { trip_id: tripId });
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-earth-500">Book Your Trip</h2>

      {/* Primary: Expedia self-serve booking */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-earth-500">Book now on Expedia</h3>
          <p className="text-sm text-earth-600 mt-1">
            Search stays and flights directly. Exclusive rates, instant confirmation.
          </p>
        </div>

        {widgetFailed ? (
          <div className="rounded-card border border-sand-200 bg-sand-50 p-4">
            <p className="text-sm text-earth-700 mb-3">
              The Expedia search widget couldn&apos;t load. You can still browse and book directly:
            </p>
            <Button asChild className="bg-earth-500 hover:bg-earth-600 text-white">
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
          <div ref={widgetContainerRef} className="min-h-[200px]">
            <div
              className="eg-widget"
              data-widget="search"
              data-program="us-expedia"
              data-lobs="stays,flights"
              data-network="pz"
              data-camref={EXPEDIA_WIDGET_CAMREF}
              data-pubref="booking_page_widget"
            />
          </div>
        )}

        <p className="mt-4 text-[11px] text-muted-foreground">
          As an Expedia Group affiliate, WanderLuxe may earn a commission from eligible bookings.
        </p>
      </Card>

      {/* Secondary: Human travel advisor */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-earth-500 mb-1">Prefer a human advisor?</h3>
        <p className="text-sm text-earth-600 mb-4">
          For custom itineraries, luxury perks, and white-glove service.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-sand-100 border-2 border-sand-300">
              <img
                src="https://res.cloudinary.com/foratravelweb/image/upload/c_fill,g_auto,h_640,w_640/f_webp/q_90/a1ade640-a52b-4571-9d4d-b17ff07d882a"
                alt="Kevin Lowe - Fora Travel Advisor"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div>
                <h4 className="text-base font-semibold text-earth-500">Kevin Lowe</h4>
                <p className="text-xs font-medium text-earth-400">Fora Travel Advisor</p>
              </div>
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span className="text-xs font-medium">Certified</span>
              </div>
            </div>

            <div className="flex items-start gap-2 mb-3">
              <MapPin className="h-4 w-4 text-earth-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-earth-700">Based in New York</span>
            </div>

            <p className="text-sm text-earth-700 mb-3">
              NYC-based traveler passionate about high-end US and Western Europe adventures,
              expertly balancing luxury experiences with smart value optimization.
            </p>

            <div className="mb-3">
              <div className="flex flex-wrap gap-1">
                {['Luxury Travel', 'Honeymoons', 'NYC', 'Aspen', 'Paris', 'Euro Skiing'].map((expertise) => (
                  <span
                    key={expertise}
                    className="inline-block px-2 py-0.5 bg-sand-100 text-earth-600 text-xs rounded-full"
                  >
                    {expertise}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <Button
                variant="outline"
                onClick={handleContactClick}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Contact Kevin on Fora Travel
              </Button>
              <p className="text-xs text-earth-600">
                Response time: 1–2 business days
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Why Book with a Fora Travel Advisor */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-earth-500 mb-4">Why Book with a Fora Travel Advisor?</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-earth-600">Exclusive Perks &amp; Upgrades</h4>
            <p className="text-sm text-earth-700">Access to room upgrades, hotel credits, complimentary breakfast, and extended check-in/out times.</p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-earth-600">Keep Your Rewards</h4>
            <p className="text-sm text-earth-700">You still earn all your credit card points and hotel loyalty points when booking through Fora.</p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-earth-600">Expert Knowledge</h4>
            <p className="text-sm text-earth-700">Insider tips and recommendations from someone who&apos;s been there and knows what works.</p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-earth-600">Personalized Service</h4>
            <p className="text-sm text-earth-700">Custom itineraries tailored to your preferences, budget, and travel style.</p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-earth-600">Hotels &amp; Accommodations</h4>
            <p className="text-sm text-earth-700">Full service booking for hotels, resorts, and vacation rentals like Vrbo with exclusive advisor rates.</p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-earth-600">Support When You Need It</h4>
            <p className="text-sm text-earth-700">Professional assistance before, during, and after your trip for peace of mind.</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-sand-100">
          <p className="text-xs text-earth-600">
            <strong>Current Services:</strong> Hotels, resorts, vacation rentals, ground transportation, and travel experiences.
            Flight booking services are currently limited but may be available for select destinations.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default BookingView;
