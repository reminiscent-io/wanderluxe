import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/services/analyticsService';

/**
 * Hook to automatically track page views when routes change
 */
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Get page title from document or generate from pathname
    const getPageTitle = (pathname: string): string => {
      // If document title is set and not just "WanderLuxe", use it
      if (document.title && document.title !== 'WanderLuxe') {
        return document.title;
      }

      // Generate title from pathname
      const pathSegments = pathname.split('/').filter(Boolean);
      if (pathSegments.length === 0) return 'Home';
      
      // Convert path segments to readable titles
      const titleMap: Record<string, string> = {
        'my-trips': 'My Trips',
        'create-trip': 'Create Trip',
        'trip': 'Trip Details',
        'auth': 'Authentication',
        'profile': 'Profile',
        'explore': 'Explore',
        'privacy-policy': 'Privacy Policy',
        'terms-of-service': 'Terms of Service',
      };

      const firstSegment = pathSegments[0];
      return titleMap[firstSegment] || firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
    };

    const pageTitle = getPageTitle(location.pathname);
    trackPageView(pageTitle, location.pathname);
  }, [location]);
};

/**
 * Hook for tracking specific page views with custom titles
 */
export const useCustomPageTracking = (pageTitle: string) => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(pageTitle, location.pathname);
  }, [pageTitle, location.pathname]);
};