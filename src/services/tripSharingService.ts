import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TripShare, SharedTripWithDetails } from '@/integrations/supabase/trip_shares_types';

/**
 * Share a trip with a specific email address
 * @param tripId The ID of the trip to share
 * @param email Email address to share the trip with
 * @param tripDestination The trip destination (used for email notification)
 */
export const shareTrip = async (tripId: string, email: string, tripDestination: string): Promise<boolean> => {
  try {
    // Check if the trip exists and the current user has access to it
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('trip_id', tripId)
      .single();

    if (tripError || !tripData) {
      console.error('Error checking trip access:', tripError);
      toast.error("Couldn't verify trip access");
      return false;
    }

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to share trips');
      return false;
    }

    // Check if already shared with this email
    const { data: existingShare } = await supabase
      .from('trip_shares')
      .select('*')
      .eq('trip_id', tripId)
      .eq('shared_with_email', email.toLowerCase().trim())
      .maybeSingle();

    if (existingShare) {
      toast.info('This trip is already shared with this email address');
      return true;
    }

    // Create the share record
    const { error: shareError } = await supabase
      .from('trip_shares')
      .insert({
        trip_id: tripId,
        shared_by_user_id: user.id,
        shared_with_email: email.toLowerCase().trim()
      });

    if (shareError) {
      console.error('Error sharing trip:', shareError);
      toast.error('Failed to share the trip. Please try again.');
      return false;
    }

    // Send email notification
    const notificationSent = await sendShareNotification(email, user.email || 'A WanderLuxe user', tripDestination);
    
    // Even if notification fails, the trip is still shared in the database
    if (!notificationSent) {
      toast.warning('Trip shared, but email notification could not be sent');
    } else {
      toast.success('Trip shared successfully and notification sent');
    }

    return true;
  } catch (error) {
    console.error('Error sharing trip:', error);
    toast.error('An unexpected error occurred');
    return false;
  }
};

/**
 * Send an email notification to a user that a trip has been shared with them
 */
export const sendShareNotification = async (
  toEmail: string,
  fromEmail: string,
  tripDestination: string
): Promise<boolean> => {
  try {
    // In a production environment, we would connect to our server API
    // However, for now we're acknowledging that the email functionality is limited
    // We'll still record the trip sharing in Supabase but won't block on email delivery
    
    // Log the sharing attempt for debugging
    console.log(`Trip sharing attempted: 
      To: ${toEmail} 
      From: ${fromEmail} 
      Destination: ${tripDestination}`);

    // Simulate a successful sharing but with email notification unavailable
    // This way the trip will still be shared in the database
    toast.info(`Trip has been shared with ${toEmail}. However, email notification is currently unavailable.`);
    
    // Return false to indicate email notification didn't succeed
    // But the trip sharing itself succeeded (it's managed by the parent function)
    return false;
  } catch (error) {
    console.error('Error in share notification process:', error);
    return false;
  }
};

/**
 * Remove a trip share
 */
export const removeTripShare = async (shareId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('trip_shares')
      .delete()
      .eq('id', shareId);

    if (error) {
      console.error('Error removing trip share:', error);
      toast.error('Failed to remove the share');
      return false;
    }

    toast.success('Trip access removed');
    return true;
  } catch (error) {
    console.error('Error removing trip share:', error);
    toast.error('An unexpected error occurred');
    return false;
  }
};

/**
 * Get all trips shared with the current user
 */
export const getSharedTrips = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: [], error: new Error('Not authenticated') };
    }

    // Get all trips shared with the user's email
    const { data, error } = await supabase
      .from('trip_shares')
      .select(`
        *,
        trips (*)
      `)
      .eq('shared_with_email', user.email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching shared trips:', error);
      return { data: [], error };
    }

    // Transform the data to match the expected structure
    const processedData = data?.map(share => ({
      ...share,
      trips: share.trips || null,
      shared_with_email: share.shared_with_email,
      shared_by_user_id: share.shared_by_user_id
    })) as SharedTripWithDetails[];

    return { data: processedData || [], error: null };
  } catch (error) {
    console.error('Error fetching shared trips:', error);
    return { data: [], error };
  }
};

/**
 * Get all users who have access to a specific trip
 */
export const getTripShares = async (tripId: string): Promise<TripShare[]> => {
  try {
    const { data, error } = await supabase
      .from('trip_shares')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching trip shares:', error);
      return [];
    }

    return data as TripShare[];
  } catch (error) {
    console.error('Error fetching trip shares:', error);
    return [];
  }
};