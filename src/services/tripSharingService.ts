import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Share a trip with a specific email address
 * @param tripId The ID of the trip to share
 * @param email Email address to share the trip with
 * @param tripDestination The trip destination (used for email notification)
 */
export const shareTrip = async (tripId: string, email: string, tripDestination: string): Promise<boolean> => {
  try {
    // Check if trip exists
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .select('trip_id, user_id, destination')
      .eq('trip_id', tripId)
      .single();

    if (tripError || !tripData) {
      console.error('Trip not found:', tripError);
      throw new Error('Trip not found');
    }

    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    // Check if user is the owner of the trip
    if (tripData.user_id !== session.user.id) {
      // Check if the user has been shared this trip
      const { data: shareData, error: shareCheckError } = await supabase
        .from('trip_shares')
        .select('id')
        .eq('trip_id', tripId)
        .eq('shared_with_email', session.user.email)
        .single();

      if (shareCheckError || !shareData) {
        throw new Error('You do not have permission to share this trip');
      }
    }

    // Check if this trip is already shared with this email
    const { data: existingShare, error: existingShareError } = await supabase
      .from('trip_shares')
      .select('id')
      .eq('trip_id', tripId)
      .eq('shared_with_email', email)
      .single();

    if (existingShare) {
      // Already shared, just return success
      return true;
    }

    // Create share
    const { error: shareError } = await supabase
      .from('trip_shares')
      .insert({
        trip_id: tripId,
        shared_by_user_id: session.user.id,
        shared_with_email: email,
        created_at: new Date().toISOString(),
      });

    if (shareError) {
      console.error('Error sharing trip:', shareError);
      throw shareError;
    }

    // Send email notification
    await sendShareNotification(email, tripDestination, session.user.email || '');

    return true;
  } catch (error) {
    console.error('Error in shareTrip:', error);
    throw error;
  }
};

/**
 * Send an email notification to a user that a trip has been shared with them
 */
export const sendShareNotification = async (
  recipientEmail: string, 
  tripDestination: string,
  sharedByEmail: string
): Promise<void> => {
  try {
    // Check if we have the SendGrid API key
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    // Call a Supabase Edge Function to send the email
    // This assumes you have a Supabase Edge Function set up
    const { error } = await supabase.functions.invoke('send-share-notification', {
      body: { 
        recipientEmail,
        tripDestination,
        sharedByEmail
      }
    });

    if (error) {
      console.error('Error sending share notification:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in sendShareNotification:', error);
    // Don't throw here, we don't want to fail the share if just the email fails
    // Just log the error
  }
};

/**
 * Get all trips shared with the current user
 */
export const getSharedTrips = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user.email) {
      return [];
    }

    // Get all trips shared with this email
    const { data: sharedTrips, error } = await supabase
      .from('trip_shares')
      .select(`
        id,
        trip_id,
        shared_by_user_id,
        created_at,
        trips:trip_id(*)
      `)
      .eq('shared_with_email', session.user.email);

    if (error) {
      console.error('Error fetching shared trips:', error);
      throw error;
    }

    return sharedTrips;
  } catch (error) {
    console.error('Error in getSharedTrips:', error);
    throw error;
  }
};