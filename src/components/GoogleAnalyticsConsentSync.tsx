import { useEffect, useRef } from 'react';
import { useConsent } from '@/contexts/ConsentContext';

const GA_MEASUREMENT_ID = 'G-TY8J66G15E';
const GA_SCRIPT_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
const GA_DISABLE_FLAG = `ga-disable-${GA_MEASUREMENT_ID}` as const;

export default function GoogleAnalyticsConsentSync() {
  const scriptInjected = useRef(false);
  const { hasConsented, preferences } = useConsent();
  const optedIn = hasConsented && preferences.analytics;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (optedIn) {
      (window as unknown as Record<string, unknown>)[GA_DISABLE_FLAG] = false;

      if (!scriptInjected.current) {
        const script = document.createElement('script');
        script.async = true;
        script.src = GA_SCRIPT_SRC;
        document.head.appendChild(script);
        scriptInjected.current = true;

        window.gtag('js', new Date());
        window.gtag('config', GA_MEASUREMENT_ID);
      }
    } else {
      // Documented GA opt-out: setting this flag suppresses tracking even
      // if the script is already loaded (e.g. user revoked consent mid-session).
      // https://developers.google.com/analytics/devguides/collection/gtagjs/user-opt-out
      (window as unknown as Record<string, unknown>)[GA_DISABLE_FLAG] = true;
    }
  }, [optedIn]);

  return null;
}
