import { useEffect } from 'react';
import posthog from 'posthog-js';
import { useConsent } from '@/contexts/ConsentContext';

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
      posthog.capture('$pageview');
    } else {
      posthog.opt_out_capturing();
    }
  }, [hasConsented, preferences.analytics]);

  return null;
}
