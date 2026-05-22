import { useEffect } from 'react';
import posthog from 'posthog-js';
import { useConsent } from '@/contexts/ConsentContext';
import { supabase } from '@/integrations/supabase/client';
import { identifyUser } from '@/lib/analytics';

/**
 * Syncs PostHog capturing state with the user's cookie consent preferences.
 * Opts in to capturing only when the user has explicitly consented to analytics.
 * Must be rendered inside ConsentProvider.
 */
export default function PostHogConsentSync() {
  const { hasConsented, preferences } = useConsent();

  useEffect(() => {
    if (!import.meta.env.VITE_POSTHOG_KEY) return;

    if (hasConsented && preferences.analytics) {
      posthog.opt_in_capturing();
      // If the user signed in before granting consent, AuthContext's identify()
      // call was dropped while capturing was opted-out. Re-identify here.
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          identifyUser(user.id, {
            email: user.email,
            provider: user.app_metadata?.provider,
            created_at: user.created_at,
          });
        }
      });
      posthog.capture('$pageview');
    } else {
      posthog.opt_out_capturing();
    }
  }, [hasConsented, preferences.analytics]);

  return null;
}
