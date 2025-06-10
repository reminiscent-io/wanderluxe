/**
 * Centralized Google Analytics service for consistent tracking across the app
 */

interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  custom_parameters?: Record<string, any>;
}

class AnalyticsService {
  private isInitialized = false;

  constructor() {
    this.checkInitialization();
  }

  private checkInitialization() {
    // Check if gtag is available
    if (typeof window !== 'undefined' && window.gtag) {
      this.isInitialized = true;
    } else if (typeof window !== 'undefined') {
      // Retry after a short delay if gtag isn't ready yet
      setTimeout(() => this.checkInitialization(), 500);
    }
  }

  /**
   * Track page views with consistent formatting
   */
  trackPageView(page_title: string, page_path?: string) {
    if (!this.isInitialized) return;

    window.gtag('event', 'page_view', {
      page_title,
      page_location: window.location.href,
      page_path: page_path || window.location.pathname,
    });
  }

  /**
   * Track custom events with consistent structure
   */
  trackEvent({ action, category, label, value, custom_parameters }: AnalyticsEvent) {
    if (!this.isInitialized) return;

    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value,
      ...custom_parameters,
    });
  }

  /**
   * Track user authentication events
   */
  trackAuth(action: 'login' | 'logout' | 'signup') {
    this.trackEvent({
      action,
      category: 'Authentication',
    });
  }

  /**
   * Track trip-related actions
   */
  trackTrip(action: string, tripId?: string, destination?: string, additionalData?: Record<string, any>) {
    this.trackEvent({
      action,
      category: 'Trip',
      label: tripId,
      custom_parameters: {
        destination,
        ...additionalData,
      },
    });
  }

  /**
   * Track user interactions with UI elements
   */
  trackInteraction(action: string, element: string, details?: Record<string, any>) {
    this.trackEvent({
      action,
      category: 'User_Interaction',
      label: element,
      custom_parameters: details,
    });
  }

  /**
   * Track file and media actions
   */
  trackMedia(action: string, type: 'image' | 'pdf' | 'other', details?: Record<string, any>) {
    this.trackEvent({
      action,
      category: 'Media',
      label: type,
      custom_parameters: details,
    });
  }

  /**
   * Track errors and issues
   */
  trackError(error_type: string, error_message?: string, context?: string) {
    this.trackEvent({
      action: 'error_occurred',
      category: 'Error',
      label: error_type,
      custom_parameters: {
        error_message,
        context,
      },
    });
  }

  /**
   * Track form interactions
   */
  trackForm(action: 'start' | 'submit' | 'error' | 'abandon', form_name: string, details?: Record<string, any>) {
    this.trackEvent({
      action: `form_${action}`,
      category: 'Form',
      label: form_name,
      custom_parameters: details,
    });
  }

  /**
   * Track search and filter actions
   */
  trackSearch(query: string, results_count?: number, filters?: Record<string, any>) {
    this.trackEvent({
      action: 'search',
      category: 'Search',
      label: query,
      custom_parameters: {
        results_count,
        filters,
      },
    });
  }

  /**
   * Track sharing actions
   */
  trackShare(content_type: string, method: string, content_id?: string) {
    this.trackEvent({
      action: 'share',
      category: 'Social',
      label: content_type,
      custom_parameters: {
        method,
        content_id,
      },
    });
  }

  /**
   * Track user engagement metrics
   */
  trackEngagement(action: string, duration?: number, details?: Record<string, any>) {
    this.trackEvent({
      action,
      category: 'Engagement',
      value: duration,
      custom_parameters: details,
    });
  }
}

// Export a singleton instance
export const analytics = new AnalyticsService();

// Export convenience functions for common tracking patterns
export const trackPageView = (title: string, path?: string) => analytics.trackPageView(title, path);
export const trackUserAction = (action: string, element: string, details?: Record<string, any>) => 
  analytics.trackInteraction(action, element, details);
export const trackTripAction = (action: string, tripId?: string, destination?: string, data?: Record<string, any>) => 
  analytics.trackTrip(action, tripId, destination, data);
export const trackError = (type: string, message?: string, context?: string) => 
  analytics.trackError(type, message, context);