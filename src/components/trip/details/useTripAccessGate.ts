import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface TripAccessGateArgs {
  /** Explore routes are public browsing and keep their normal not-found page. */
  onExploreRoute: boolean;
  tripLoading: boolean;
  permissionsLoading: boolean;
  canView: boolean;
}

/**
 * Sends a signed-out visitor who cannot read a trip to sign in, and brings
 * them back to the same URL afterwards.
 *
 * Someone following a share link while logged out lands on a trip with
 * nothing to show: RLS hides private rows from anonymous readers, so the trip
 * query and the permission check both come back empty. `/trip/:tripId` is
 * deliberately unprotected so public trips work anonymously, which means
 * nothing else routes these visitors to sign-in.
 *
 * The trip URL goes into the `pendingRedirect` slot that Auth.tsx already
 * honours for password sign-in, sign-up and Google OAuth.
 *
 * @returns true while the redirect is pending, so the caller can hold a
 * loading state instead of flashing an error on the way out.
 */
export function useTripAccessGate({
  onExploreRoute,
  tripLoading,
  permissionsLoading,
  canView,
}: TripAccessGateArgs): boolean {
  const { session, profileLoaded } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // `profileLoaded` flips true for anonymous visitors too, so it means "auth
  // has settled", not "logged in" — without it a signed-in user whose session
  // is still hydrating would be bounced to /auth.
  const isAnonymous = profileLoaded && !session;
  const accessChecked = !tripLoading && !permissionsLoading;
  const blockedFromTrip = accessChecked && !canView;
  const mustSignIn = !onExploreRoute && isAnonymous && blockedFromTrip;

  useEffect(() => {
    if (!mustSignIn) return;
    sessionStorage.setItem('pendingRedirect', location.pathname);
    navigate('/auth', { replace: true });
  }, [mustSignIn, location.pathname, navigate]);

  return mustSignIn;
}
