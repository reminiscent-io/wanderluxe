import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import HeroSection from "../components/trip/HeroSection";
import Sidebar, { SidebarHandle } from "@/components/layout/Sidebar";
import BottomNavigation from "@/components/layout/BottomNavigation";
import QuickAddSheet from "@/components/layout/QuickAddSheet";
import { useTripQuery, useTripIdBySlug } from '@/hooks/useTripQuery';
import { buildOgImageUrl } from '@/utils/tripUrl';
import { useTripSubscription } from '@/components/trip/details/useTripSubscription';
import TripDetailsSkeleton from '@/components/trip/details/TripDetailsSkeleton';
import TripDetailsError from '@/components/trip/details/TripDetailsError';
import TimelineView from "../components/trip/TimelineView";
import BudgetView from "../components/trip/BudgetView";
import BookingView from "../components/trip/BookingView";
import AIAssistantPanel from "../components/trip/ai-assistant/AIAssistantPanel";
import AIAssistantDrawer from "../components/trip/ai-assistant/AIAssistantDrawer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useTripPermissions } from '@/hooks/use-trip-permissions';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_TRIP_IMAGE } from '@/constants/unsplash';
import SEO, { SITE_URL } from '@/components/SEO';

const TripDetails = () => {
  const { tripId: paramsTripId, slug } = useParams<{ tripId?: string; slug?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { session, profileLoaded } = useAuth();

  const { tripId: tripIdFromSlug, isLoading: slugLookupLoading } = useTripIdBySlug(slug);
  const tripId = paramsTripId ?? tripIdFromSlug ?? undefined;
  const onExploreRoute = slug !== undefined;

  const { canView, canEdit, isLoading: permissionsLoading } = useTripPermissions(tripId);

  const activeTab = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/timeline')) return 'timeline';
    if (path.includes('/budget')) return 'budget';
    if (path.includes('/booking')) return 'booking';
    if (path.includes('/chat')) return 'chat';
    return 'timeline';
  }, [location.pathname]);

  useEffect(() => {
    if (!onExploreRoute && paramsTripId && location.pathname === `/trip/${paramsTripId}`) {
      navigate(`/trip/${paramsTripId}/timeline`, { replace: true });
    }
  }, [onExploreRoute, paramsTripId, location.pathname, navigate]);

  const { trip, tripLoading, tripError, previousTrip } = useTripQuery(tripId);
  useTripSubscription(tripId);

  // A signed-out visitor following a share link lands here with nothing to
  // show — RLS hides private trips from anonymous readers, so both the trip
  // query and the permission check come back empty. Send them to sign in and
  // bring them straight back to this URL rather than dead-ending on an error.
  // `profileLoaded` flips true for anonymous visitors too, so it means "auth
  // has settled", not "logged in" — without it a signed-in user whose session
  // is still hydrating would be bounced to /auth.
  const isAnonymous = profileLoaded && !session;
  const accessChecked = !tripLoading && !permissionsLoading;
  const blockedFromTrip = accessChecked && !canView;
  // Explore routes are public browsing and keep their normal not-found page.
  const mustSignIn = !onExploreRoute && isAnonymous && blockedFromTrip;

  useEffect(() => {
    if (!mustSignIn) return;
    sessionStorage.setItem('pendingRedirect', location.pathname);
    navigate('/auth', { replace: true });
  }, [mustSignIn, location.pathname, navigate]);

  useEffect(() => {
    const tripSlug = (trip as { slug?: string | null })?.slug;
    const tripIsPublic = (trip as { is_public?: boolean | null })?.is_public;
    if (paramsTripId && tripIsPublic && tripSlug && location.pathname.startsWith(`/trip/${paramsTripId}`)) {
      const rest = location.pathname.slice(`/trip/${paramsTripId}`.length) || '';
      navigate(`/explore/${tripSlug}${rest}`, { replace: true });
    }
  }, [paramsTripId, trip, location.pathname, navigate]);

  // Quick add sheet state
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // AI Assistant drawer state (mobile full-screen)
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  // Ref to access Sidebar methods
  const sidebarRef = useRef<SidebarHandle>(null);

  // Ref + callback for aligning the fixed hero with the main content area (offset by sidebar)
  const mainRef = useRef<HTMLElement>(null);
  const updateHeroBounds = useCallback(() => {
    if (mainRef.current) {
      const rect = mainRef.current.getBoundingClientRect();
      const pl = parseFloat(getComputedStyle(mainRef.current).paddingLeft) || 0;
      document.documentElement.style.setProperty('--hero-left', `${rect.left + pl}px`);
      document.documentElement.style.setProperty('--hero-width', `${rect.width - pl}px`);
    }
  }, []);

  useEffect(() => {
    updateHeroBounds();
    window.addEventListener('resize', updateHeroBounds);
    const observer = new MutationObserver(updateHeroBounds);
    if (mainRef.current) {
      observer.observe(mainRef.current, { attributes: true, attributeFilter: ['class', 'style'] });
    }
    return () => {
      window.removeEventListener('resize', updateHeroBounds);
      observer.disconnect();
    };
  }, [updateHeroBounds]);

  // Re-measure after sidebar animation settles
  useEffect(() => {
    const timer = setTimeout(updateHeroBounds, 350);
    return () => clearTimeout(timer);
  }, [updateHeroBounds]);

  const handleQuickAddAction = (action: "accommodation" | "transportation" | "activity" | "dining") => {
    switch (action) {
      case "accommodation":
        sidebarRef.current?.openAccommodationDialog();
        break;
      case "transportation":
        sidebarRef.current?.openTransportationDialog();
        break;
      case "activity":
        sidebarRef.current?.openActivityDialog();
        break;
      case "dining":
        sidebarRef.current?.openReservationDialog();
        break;
    }
  };

  if (slug && slugLookupLoading) return <TripDetailsSkeleton />;
  if (slug && !slugLookupLoading && !tripIdFromSlug) {
    return <TripDetailsError message="The requested trip could not be found." />;
  }
  if (tripLoading && !previousTrip) return <TripDetailsSkeleton />;
  if (permissionsLoading) return <TripDetailsSkeleton />;
  // The effect above is navigating to /auth — hold the skeleton rather than
  // flashing an error on the way out.
  if (mustSignIn) return <TripDetailsSkeleton />;
  if (tripError) return <TripDetailsError />;

  // Checked before the trip data: a viewer without access gets no readable row
  // back either, so testing `displayData` first would mask this with a
  // misleading "could not be found".
  if (!canView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sand-50 via-sand-50 to-earth-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="bg-earth-100 rounded-full p-4 w-20 h-20 mx-auto mb-6">
            <Lock className="h-12 w-12 text-earth-600 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-earth-800 mb-3">Access Restricted</h2>
          <p className="text-earth-600 mb-6">
            {session
              ? "You don't have permission to view this trip. Please contact the trip owner for access."
              : "This is a private trip. Please sign in to continue."}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate(-1)} variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            {!session && (
              <Button onClick={() => {
                sessionStorage.setItem('pendingRedirect', window.location.pathname);
                navigate('/auth');
              }} className="bg-earth-600 hover:bg-earth-700 text-white">
                Sign In
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  const displayData = trip || previousTrip;
  if (!displayData) return <TripDetailsError message="The requested trip could not be found." />;

  const handleTabChange = (tab: string) => {
    if (onExploreRoute && slug) {
      navigate(`/explore/${slug}/${tab}`);
    } else if (tripId) {
      navigate(`/trip/${tripId}/${tab}`);
    }
  };

  const isPublicTrip = Boolean((displayData as { is_public?: boolean })?.is_public);
  const displaySlug = (displayData as { slug?: string | null })?.slug ?? undefined;
  const displaySummary = (displayData as { summary?: string | null })?.summary ?? undefined;
  const publicSlug = isPublicTrip ? displaySlug : undefined;

  let tripPath: string | undefined;
  if (onExploreRoute && slug) {
    tripPath = `/explore/${slug}`;
  } else if (publicSlug) {
    tripPath = `/explore/${publicSlug}`;
  } else if (tripId) {
    tripPath = `/trip/${tripId}`;
  }

  const canonicalPath = publicSlug ? `/explore/${publicSlug}` : `/trip/${tripId}`;

  const sidebar = <Sidebar ref={sidebarRef} tripId={tripId} tripPath={tripPath} activeTab={activeTab} onTabChange={handleTabChange} />;
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const nights = displayData.arrival_date && displayData.departure_date
    ? Math.max(
        1,
        Math.round(
          (new Date(displayData.departure_date).getTime() - new Date(displayData.arrival_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const seoTitle = isPublicTrip && nights
    ? `${displayData.destination} — ${nights}-Night Itinerary`
    : `${displayData.destination} itinerary`;
  const seoDescription = displaySummary
    || `Explore a curated itinerary for ${displayData.destination} on WanderLuxe — accommodations, activities, dining, and transportation in one place.`;

  const tripJsonLd = isPublicTrip
    ? [
        {
          "@context": "https://schema.org",
          "@type": "TouristTrip",
          name: seoTitle,
          description: seoDescription,
          touristType: "Leisure traveler",
          inLanguage: "en",
          url: canonicalUrl,
          provider: {
            "@type": "Organization",
            name: "WanderLuxe",
            url: SITE_URL,
          },
          ...(displayData.arrival_date && { startDate: displayData.arrival_date }),
          ...(displayData.departure_date && { endDate: displayData.departure_date }),
          ...(displayData.cover_image_url && { image: displayData.cover_image_url }),
          ...(displayData.primary_destination && {
            itinerary: {
              "@type": "ItemList",
              name: `${displayData.destination} itinerary`,
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  item: {
                    "@type": "TouristDestination",
                    name: displayData.primary_destination,
                  },
                },
              ],
            },
          }),
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Explore", item: `${SITE_URL}/explore` },
            { "@type": "ListItem", position: 3, name: displayData.destination, item: canonicalUrl },
          ],
        },
      ]
    : undefined;

  return (
    <div className="flex min-h-screen w-full overflow-x-clip">
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonicalPath={canonicalPath}
        ogImage={buildOgImageUrl(displayData.cover_image_url)}
        ogType={isPublicTrip ? "article" : "website"}
        noIndex={!isPublicTrip}
        jsonLd={tripJsonLd}
      />
      {sidebar}
      <main ref={mainRef} className="flex-1 min-w-0 pl-0 md:pl-[280px] transition-all duration-300">
        <div className="min-h-screen flex flex-col">

          {/* Hero — renders fixed background + spacer */}
          <HeroSection
            tripId={tripId}
            title={displayData.destination}
            imageUrl={displayData.cover_image_url || DEFAULT_TRIP_IMAGE}
            arrivalDate={displayData.arrival_date}
            departureDate={displayData.departure_date}
            photographer={displayData.cover_image_photographer}
            unsplashUsername={displayData.cover_image_photographer_username}
            isLoading={tripLoading && !previousTrip}
            canEdit={canEdit}
            primaryDestination={displayData.primary_destination}
            primaryDestinationPlaceId={displayData.primary_destination_place_id}
            coverImagePosition={displayData.cover_image_position}
          />

          {/* Content area — scrolls up and over the fixed hero image */}
          <div
            className="relative flex-1 w-full z-10 min-h-screen rounded-t-[28px] bg-sand-50 -mt-6"
            style={{
              boxShadow: '0 -10px 40px -5px rgba(0,0,0,0.10)',
            }}
          >

            <div className="max-w-none mx-auto px-4 pt-6 pb-24 md:pb-8">
              <nav aria-label="Breadcrumb" className="mb-4 text-sm">
                <ol className="flex items-center gap-1.5 text-earth-500">
                  <li>
                    <a href="/" className="hover:text-earth-700 transition-colors">Home</a>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li>
                    {isPublicTrip ? (
                      <a href="/explore" className="hover:text-earth-700 transition-colors">Explore</a>
                    ) : (
                      <a href="/my-trips" className="hover:text-earth-700 transition-colors">My Trips</a>
                    )}
                  </li>
                  <li aria-hidden="true">/</li>
                  <li className="text-earth-700 font-medium" aria-current="page">
                    {displayData.destination}
                  </li>
                </ol>
              </nav>

              {!canEdit && (
                <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700 font-medium">
                        {session
                          ? "You're viewing this trip in read-only mode. Contact the trip owner for edit access."
                          : "You're viewing this public trip. Sign in to create your own trips!"}
                      </p>
                    </div>
                    {!session && (
                      <div className="ml-auto">
                        <Button onClick={() => navigate('/auth')} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                          Sign In
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'timeline' && (
                <ErrorBoundary>
                  <TimelineView
                    tripId={tripId}
                    tripDates={{
                      arrival_date: displayData?.arrival_date && displayData.arrival_date.trim() !== '' ? displayData.arrival_date : null,
                      departure_date: displayData?.departure_date && displayData.departure_date.trim() !== '' ? displayData.departure_date : null
                    }}
                    tripDestination={displayData.destination}
                    primaryDestination={displayData.primary_destination}
                    canEdit={canEdit}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 'chat' && (
                <div className="h-[calc(100dvh-12rem)] md:h-[calc(100dvh-10rem)]">
                  <AIAssistantPanel tripId={tripId || ''} />
                </div>
              )}
              {activeTab === 'budget' && <BudgetView tripId={tripId} canEdit={canEdit} />}
              {activeTab === 'booking' && <BookingView tripId={tripId} canEdit={canEdit} />}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNavigation
        tripId={tripId}
        tripPath={tripPath}
        onQuickAddClick={() => setQuickAddOpen(true)}
        onPeopleClick={() => sidebarRef.current?.openTravelersPanel()}
        onAIClick={() => setAiDrawerOpen(true)}
      />

      {/* AI Assistant Drawer (mobile full-screen with safe area) */}
      <AIAssistantDrawer
        tripId={tripId || ''}
        open={aiDrawerOpen}
        onOpenChange={setAiDrawerOpen}
      />

      {/* Quick Add Sheet */}
      <QuickAddSheet
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onSelectAction={handleQuickAddAction}
      />

    </div>
  );
};

export default TripDetails;
