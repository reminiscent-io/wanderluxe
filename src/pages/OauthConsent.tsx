import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';
import { Loader2, AlertCircle, ShieldCheck, Plane } from 'lucide-react';

// The OAuthAuthorizationDetails variant of getAuthorizationDetails' response,
// derived from the installed supabase-js types so this stays in sync with the SDK.
type AuthorizationDetails = Extract<
  NonNullable<
    Awaited<ReturnType<typeof supabase.auth.oauth.getAuthorizationDetails>>['data']
  >,
  { authorization_id: string }
>;

type PageState = 'loading' | 'consent' | 'submitting' | 'error';

// Supabase appends ?authorization_id=<id> to the configured authorization path.
const authorizationIdSchema = z.string().trim().min(1);

// Plain-language descriptions for the scopes this server may request. Unknown
// scopes fall back to a prettified version of the raw scope string so the user
// always sees something legible rather than a raw token dump.
const SCOPE_DESCRIPTIONS: Record<string, string> = {
  openid: 'Verify your identity',
  email: 'View your email address',
  profile: 'View your basic profile information',
};

function describeScope(scope: string): string {
  if (SCOPE_DESCRIPTIONS[scope]) return SCOPE_DESCRIPTIONS[scope];
  // Prettify e.g. "trips.read" -> "Trips read"
  const pretty = scope.replace(/[._:-]/g, ' ').trim();
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

const OauthConsent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useAuth();

  const [state, setState] = useState<PageState>('loading');
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Step 1: settle auth, gate on session, then load the authorization request.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Use a definitive session read rather than the (possibly still-initializing)
      // context value, mirroring InviteRedeem's auth-settling pattern.
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      // Auth gating: bounce unauthenticated users through the existing login flow,
      // preserving the full path + query so we return here with the
      // authorization_id intact. Auth.tsx restores `pendingRedirect` after sign-in.
      if (!activeSession) {
        sessionStorage.setItem('pendingRedirect', location.pathname + location.search);
        navigate('/auth', { replace: true });
        return;
      }

      const parsed = authorizationIdSchema.safeParse(
        new URLSearchParams(location.search).get('authorization_id') ?? '',
      );
      if (!parsed.success) {
        setErrorMessage(
          'This authorization link is missing required information. Please start the connection again from the app you were using.',
        );
        setState('error');
        return;
      }

      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(parsed.data);
      if (cancelled) return;

      if (error || !data) {
        setErrorMessage(
          'This authorization request is invalid or has expired. Please start the connection again from the app you were using.',
        );
        setState('error');
        return;
      }

      // The user has already granted these scopes — Supabase returns a ready-made
      // redirect back to the OAuth client. Follow it immediately.
      if (!('authorization_id' in data)) {
        window.location.href = data.redirect_url;
        return;
      }

      setDetails(data);
      setState('consent');
    };

    void load();
    return () => {
      cancelled = true;
    };
    // location.search is the only meaningful input; navigate/location are stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleApprove = useCallback(async () => {
    if (!details) return;
    setState('submitting');
    const { data, error } = await supabase.auth.oauth.approveAuthorization(
      details.authorization_id,
      { skipBrowserRedirect: true },
    );
    if (error || !data) {
      setErrorMessage(
        'We could not complete the authorization. Please start the connection again from the app you were using.',
      );
      setState('error');
      return;
    }
    window.location.href = data.redirect_url;
  }, [details]);

  const handleDeny = useCallback(async () => {
    if (!details) return;
    setState('submitting');
    const { data, error } = await supabase.auth.oauth.denyAuthorization(
      details.authorization_id,
      { skipBrowserRedirect: true },
    );
    // On denial Supabase still returns a redirect (with access_denied) back to the
    // client. If that fails, fall back to sending the user home.
    if (error || !data) {
      navigate('/', { replace: true });
      return;
    }
    window.location.href = data.redirect_url;
  }, [details, navigate]);

  if (state === 'loading' || state === 'submitting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50 p-4">
        <SEO title="Authorize access" noIndex />
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-earth-500 mb-4" />
          <p className="text-earth-600">
            {state === 'submitting' ? 'Completing authorization…' : 'Loading authorization…'}
          </p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50 p-4">
        <SEO title="Authorization error" noIndex />
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Authorization unavailable</h2>
            <p className="text-earth-600 mb-6">{errorMessage}</p>
            <Button asChild variant="outline">
              <a href="https://wanderluxe.io">Go to WanderLuxe</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // state === 'consent' — details is guaranteed non-null here.
  const scopes = (details?.scope ?? '').split(/\s+/).filter(Boolean);
  const clientName = details?.client.name || 'An application';

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-50 p-4">
      <SEO title="Authorize access" noIndex />
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sunset-100">
            <ShieldCheck className="h-6 w-6 text-sunset-600" />
          </div>
          <CardTitle className="text-2xl text-foreground">
            Authorize {clientName}
          </CardTitle>
          <p className="text-sm text-earth-600 pt-1">
            <span className="font-medium">{clientName}</span> wants to connect to your WanderLuxe
            account.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-card bg-sand-100 p-4">
            <div className="flex items-start gap-3">
              <Plane className="mt-0.5 h-5 w-5 shrink-0 text-earth-500" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  View and manage your trips and itineraries
                </p>
                {scopes.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-earth-600">
                    {scopes.map((scope) => (
                      <li key={scope} className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-earth-400" />
                        {describeScope(scope)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {details?.user.email && (
            <p className="text-center text-xs text-muted-foreground">
              Signed in as <span className="font-medium text-earth-600">{details.user.email}</span>
            </p>
          )}

          <div className="space-y-3">
            <Button onClick={handleApprove} variant="sunset" className="w-full">
              Approve
            </Button>
            <Button onClick={handleDeny} variant="outline" className="w-full">
              Deny
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            You can revoke this access at any time from your WanderLuxe settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OauthConsent;
