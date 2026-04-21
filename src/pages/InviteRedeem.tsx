import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getInviteLinkPreview, redeemInviteLink } from '@/services/inviteLinkService';
import type { InviteLinkPreview } from '@/integrations/supabase/invite_link_types';
import { Calendar, Loader2, AlertCircle, LogIn } from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';

type PageState = 'loading' | 'preview' | 'redeeming' | 'error';

const InviteRedeem = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<PageState>('loading');
  const [preview, setPreview] = useState<InviteLinkPreview | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const redeemAttempted = useRef(false);

  // Wait for auth to settle before doing anything
  useEffect(() => {
    supabase.auth.getSession().then(() => {
      setAuthChecked(true);
    });
  }, []);

  // Fetch preview once auth has settled
  useEffect(() => {
    if (!authChecked || !code) {
      if (!code) {
        setState('error');
        setErrorMessage('No invite code provided.');
      }
      return;
    }

    // If user is already authenticated, skip preview and go straight to redeem
    if (user) {
      setState('redeeming');
      redeemAttempted.current = true;
      redeemInviteLink(code)
        .then((tripId) => {
          navigate(`/trip/${tripId}/timeline`, { replace: true });
        })
        .catch((err) => {
          console.error('Redeem error:', err);
          setState('error');
          setErrorMessage(err?.message || 'Failed to join the trip. The link may have expired.');
        });
      return;
    }

    // Not authenticated — fetch preview to show trip info
    getInviteLinkPreview(code)
      .then((data) => {
        if (!data) {
          setState('error');
          setErrorMessage('This invite link is invalid, expired, or has been disabled.');
          return;
        }
        setPreview(data);
        setState('preview');
      })
      .catch((err) => {
        console.error('Preview error:', err);
        setState('error');
        setErrorMessage('This invite link is invalid, expired, or has been disabled.');
      });
  }, [authChecked, user, code, navigate]);

  // Handle case where user logs in after seeing preview (e.g. via another tab)
  useEffect(() => {
    if ((state === 'preview' || state === 'error') && user && code && !redeemAttempted.current) {
      redeemAttempted.current = true;
      setState('redeeming');
      redeemInviteLink(code)
        .then((tripId) => {
          navigate(`/trip/${tripId}/timeline`, { replace: true });
        })
        .catch((err) => {
          console.error('Redeem error:', err);
          setState('error');
          setErrorMessage(err?.message || 'Failed to join the trip. The link may have expired.');
        });
    }
  }, [state, user, code, navigate]);

  const handleSignIn = () => {
    if (code) {
      sessionStorage.setItem('pendingInviteCode', code);
    }
    navigate('/auth');
  };

  if (state === 'loading' || state === 'redeeming') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50 p-4">
        <SEO title="Redeem invite" noIndex />
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-earth-500 mb-4" />
          <p className="text-earth-600">
            {state === 'redeeming' ? 'Joining trip...' : 'Loading invite...'}
          </p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    // Unauthenticated: show sign-in prompt instead of a dead end
    if (!user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-sand-50 p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <LogIn className="mx-auto h-12 w-12 text-earth-400 mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Sign In to Join This Trip</h2>
              <p className="text-earth-600 mb-6">
                Sign in or create an account to accept this invite.
              </p>
              <div className="space-y-3">
                <Button onClick={handleSignIn} className="w-full bg-earth-500 text-white hover:bg-earth-600">
                  Sign In to Join Trip
                </Button>
                <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Authenticated: redeem actually failed — show definitive error
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Unable to Join</h2>
            <p className="text-earth-600 mb-6">{errorMessage}</p>
            <p className="text-sm text-muted-foreground mb-4">
              Contact the trip owner for a new invite link.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Preview state — user not authenticated
  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-50 p-4">
      <Card className="max-w-md w-full overflow-hidden">
        {preview?.cover_image_url && (
          <div className="h-48 overflow-hidden">
            <img
              src={preview.cover_image_url}
              alt={preview.destination}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardHeader>
          <p className="text-sm text-earth-500 font-medium">
            {preview?.inviter_name} invited you to join
          </p>
          <CardTitle className="text-2xl text-foreground">
            {preview?.destination}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {preview?.arrival_date && preview?.departure_date && (
            <div className="flex items-center gap-2 text-earth-600">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">
                {formatDate(preview.arrival_date)} — {formatDate(preview.departure_date)}
              </span>
            </div>
          )}

          <div className="space-y-3 pt-4">
            <Button onClick={handleSignIn} className="w-full bg-earth-500 text-white hover:bg-earth-600">
              Sign In to Join Trip
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You'll need to sign in or create an account to join this trip.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteRedeem;
