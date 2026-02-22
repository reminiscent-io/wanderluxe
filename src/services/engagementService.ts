import { supabase } from "@/integrations/supabase/client";

// Event types for tracking user engagement
export type EngagementEventType =
  | 'trip_created'
  | 'trip_deleted'
  | 'trip_updated'
  | 'activity_added'
  | 'activity_updated'
  | 'activity_deleted'
  | 'accommodation_added'
  | 'accommodation_updated'
  | 'accommodation_deleted'
  | 'transportation_added'
  | 'transportation_updated'
  | 'transportation_deleted'
  | 'reservation_added'
  | 'reservation_updated'
  | 'reservation_deleted'
  | 'pdf_exported'
  | 'ai_message_sent'
  | 'trip_shared'
  | 'expense_added';

interface EventData {
  trip_id?: string;
  activity_id?: string;
  accommodation_id?: string;
  transportation_id?: string;
  reservation_id?: string;
  [key: string]: unknown;
}

/**
 * Track a user engagement event
 * This is fire-and-forget - errors are logged but don't disrupt the user experience
 */
export async function trackEvent(
  eventType: EngagementEventType,
  eventData: EventData = {}
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.debug('Cannot track event: no authenticated user');
      return;
    }

    const { error } = await supabase
      .from('user_engagement_events')
      .insert({
        user_id: user.id,
        event_type: eventType,
        event_data: eventData,
      });

    if (error) {
      console.error('Failed to track engagement event:', error);
    }
  } catch (err) {
    // Don't let tracking errors affect the user experience
    console.error('Error tracking engagement event:', err);
  }
}

/**
 * Track trip creation
 */
export function trackTripCreated(tripId: string): void {
  trackEvent('trip_created', { trip_id: tripId });
}

/**
 * Track trip deletion
 */
export function trackTripDeleted(tripId: string): void {
  trackEvent('trip_deleted', { trip_id: tripId });
}

/**
 * Track activity added
 */
export function trackActivityAdded(tripId: string, activityId: string): void {
  trackEvent('activity_added', { trip_id: tripId, activity_id: activityId });
}

/**
 * Track accommodation added
 */
export function trackAccommodationAdded(tripId: string, accommodationId: string): void {
  trackEvent('accommodation_added', { trip_id: tripId, accommodation_id: accommodationId });
}

/**
 * Track transportation added
 */
export function trackTransportationAdded(tripId: string, transportationId: string): void {
  trackEvent('transportation_added', { trip_id: tripId, transportation_id: transportationId });
}

/**
 * Track reservation added
 */
export function trackReservationAdded(tripId: string, reservationId: string): void {
  trackEvent('reservation_added', { trip_id: tripId, reservation_id: reservationId });
}

/**
 * Track PDF export
 */
export function trackPdfExported(tripId: string): void {
  trackEvent('pdf_exported', { trip_id: tripId });
}

/**
 * Track AI message sent
 */
export function trackAiMessageSent(tripId: string): void {
  trackEvent('ai_message_sent', { trip_id: tripId });
}

/**
 * Track trip shared
 */
export function trackTripShared(tripId: string, sharedWithEmail: string): void {
  trackEvent('trip_shared', { trip_id: tripId, shared_with_email: sharedWithEmail });
}

/**
 * Get user engagement summary
 */
export async function getUserEngagementSummary(userId: string): Promise<{
  totalEvents: number;
  eventCounts: Record<string, number>;
  recentEvents: Array<{ event_type: string; created_at: string; event_data: unknown }>;
} | null> {
  try {
    // Get event counts by type
    const { data: events, error } = await supabase
      .from('user_engagement_events')
      .select('event_type, created_at, event_data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching engagement summary:', error);
      return null;
    }

    if (!events) {
      return { totalEvents: 0, eventCounts: {}, recentEvents: [] };
    }

    const eventCounts: Record<string, number> = {};
    for (const event of events) {
      eventCounts[event.event_type] = (eventCounts[event.event_type] || 0) + 1;
    }

    return {
      totalEvents: events.length,
      eventCounts,
      recentEvents: events.slice(0, 10),
    };
  } catch (err) {
    console.error('Error getting engagement summary:', err);
    return null;
  }
}
