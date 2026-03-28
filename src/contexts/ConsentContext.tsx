import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";

// Cookie consent categories
export interface ConsentPreferences {
  essential: true; // Always true, cannot be disabled
  analytics: boolean;
  marketing: boolean;
}

interface ConsentContextType {
  // Whether consent has been given (user made a choice)
  hasConsented: boolean;
  // Whether banner should be shown (non-US user who hasn't consented)
  shouldShowBanner: boolean;
  // Current consent preferences
  preferences: ConsentPreferences;
  // Whether we're still checking geo-location
  isLoading: boolean;
  // Accept all cookies
  acceptAll: () => void;
  // Accept only essential (reject optional)
  acceptEssentialOnly: () => void;
  // Accept with custom preferences
  acceptCustom: (preferences: Omit<ConsentPreferences, 'essential'>) => void;
  // Check if a specific category is consented
  hasConsentFor: (category: keyof ConsentPreferences) => boolean;
}

const STORAGE_KEY = "wlx:gdpr:consent";
const GEO_CACHE_KEY = "wlx:gdpr:geo";

const defaultPreferences: ConsentPreferences = {
  essential: true,
  analytics: false,
  marketing: false,
};

const ConsentContext = createContext<ConsentContextType>({
  hasConsented: false,
  shouldShowBanner: false,
  preferences: defaultPreferences,
  isLoading: true,
  acceptAll: () => {},
  acceptEssentialOnly: () => {},
  acceptCustom: () => {},
  hasConsentFor: () => false,
});

// Helper to safely access localStorage
function getStorageItem(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors (private browsing, etc.)
  }
}

interface StoredConsent {
  preferences: ConsentPreferences;
  timestamp: number;
  version: number;
}

interface GeoCache {
  isUSBased: boolean;
  timestamp: number;
}

// Check if user is in the US using a free geo-IP service
async function checkIfUSBased(): Promise<boolean> {
  // Check cache first (valid for 24 hours)
  const cached = getStorageItem(GEO_CACHE_KEY);
  if (cached) {
    try {
      const geoCache: GeoCache = JSON.parse(cached);
      const dayInMs = 24 * 60 * 60 * 1000;
      if (Date.now() - geoCache.timestamp < dayInMs) {
        return geoCache.isUSBased;
      }
    } catch {
      // Invalid cache, continue with API call
    }
  }

  try {
    // Using ipapi.co - free tier allows 1000 requests/day
    // Use /country/ endpoint for minimal response (plain text country code)
    const response = await fetch("https://ipapi.co/country/", {
      signal: AbortSignal.timeout(2000), // 2 second timeout (non-critical UX decision)
    });

    if (!response.ok) {
      throw new Error("Geo API request failed");
    }

    const countryCode = (await response.text()).trim();
    const isUSBased = countryCode === "US";

    // Cache the result
    const geoCache: GeoCache = {
      isUSBased,
      timestamp: Date.now(),
    };
    setStorageItem(GEO_CACHE_KEY, JSON.stringify(geoCache));

    return isUSBased;
  } catch (error) {
    console.warn("Failed to determine user location, defaulting to showing consent banner:", error);
    // If geo-lookup fails, err on the side of caution and show the banner
    return false;
  }
}

export const ConsentProvider = ({ children }: { children: React.ReactNode }) => {
  const [hasConsented, setHasConsented] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>(defaultPreferences);
  const [isUSBased, setIsUSBased] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored consent on mount
  useEffect(() => {
    const stored = getStorageItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: StoredConsent = JSON.parse(stored);
        setPreferences(parsed.preferences);
        setHasConsented(true);
      } catch {
        // Invalid stored data, will show banner
      }
    }
  }, []);

  // Check geo-location (skip entirely if user already consented — banner won't show regardless)
  useEffect(() => {
    const stored = getStorageItem(STORAGE_KEY);
    if (stored) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    async function checkGeo() {
      const isUS = await checkIfUSBased();
      if (mounted) {
        setIsUSBased(isUS);
        setIsLoading(false);
      }
    }

    checkGeo();

    return () => {
      mounted = false;
    };
  }, []);

  // Save consent to localStorage
  const saveConsent = useCallback((newPreferences: ConsentPreferences) => {
    const stored: StoredConsent = {
      preferences: newPreferences,
      timestamp: Date.now(),
      version: 1,
    };
    setStorageItem(STORAGE_KEY, JSON.stringify(stored));
    setPreferences(newPreferences);
    setHasConsented(true);
  }, []);

  const acceptAll = useCallback(() => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
    });
  }, [saveConsent]);

  const acceptEssentialOnly = useCallback(() => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
    });
  }, [saveConsent]);

  const acceptCustom = useCallback((customPreferences: Omit<ConsentPreferences, 'essential'>) => {
    saveConsent({
      essential: true,
      ...customPreferences,
    });
  }, [saveConsent]);

  const hasConsentFor = useCallback((category: keyof ConsentPreferences): boolean => {
    if (category === 'essential') return true;
    return hasConsented && preferences[category];
  }, [hasConsented, preferences]);

  // Determine if banner should show:
  // - User hasn't consented yet
  // - User is not in the US (or geo check failed)
  // - Geo check has completed
  const shouldShowBanner = !isLoading && !hasConsented && !isUSBased;

  const contextValue = useMemo(
    () => ({
      hasConsented,
      shouldShowBanner,
      preferences,
      isLoading,
      acceptAll,
      acceptEssentialOnly,
      acceptCustom,
      hasConsentFor,
    }),
    [hasConsented, shouldShowBanner, preferences, isLoading, acceptAll, acceptEssentialOnly, acceptCustom, hasConsentFor]
  );

  return (
    <ConsentContext.Provider value={contextValue}>
      {children}
    </ConsentContext.Provider>
  );
};

export const useConsent = () => {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error("useConsent must be used within a ConsentProvider");
  }
  return context;
};
