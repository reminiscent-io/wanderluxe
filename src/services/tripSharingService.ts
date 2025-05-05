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

    // Send email notification directly using SendGrid API
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
    // Use SendGrid directly with the API key from environment
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: recipientEmail }],
            subject: `Trip to ${tripDestination} has been shared with you`,
          },
        ],
        from: { email: 'noreply@yourtravelapp.com', name: 'Travel Planner' },
        content: [
          {
            type: 'text/html',
            value: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>A Trip Has Been Shared With You</h2>
                <p><strong>${sharedByEmail}</strong> has shared their trip to <strong>${tripDestination}</strong> with you.</p>
                <p>Sign in to view and collaborate on planning this exciting trip!</p>
                <div style="margin: 25px 0;">
                  <a href="${window.location.origin}" style="background-color: #4a6855; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
                    View Trip
                  </a>
                </div>
                <p style="color: #666; font-size: 14px;">If you don't have an account yet, you can sign up with this email address to access the shared trip.</p>
              </div>
            `,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('SendGrid API error:', errorData);
      throw new Error(`Failed to send email: ${response.statusText}`);
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