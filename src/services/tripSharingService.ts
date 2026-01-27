import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TripShare, SharedTripWithDetails, PermissionLevel } from '@/integrations/supabase/trip_shares_types';

/**
 * Share a trip with a specific email address
 * @param tripId The ID of the trip to share
 * @param email Email address to share the trip with
 * @param tripDestination The trip destination (used for email notification)
 * @param permissionLevel Permission level for the shared user ('read' or 'edit')
 */
export const shareTrip = async (tripId: string, email: string, tripDestination: string, permissionLevel: PermissionLevel = 'edit'): Promise<boolean> => {
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
      .from('trip_shares' as any)
      .select('*')
      .eq('trip_id', tripId)
      .eq('shared_with_email', email.toLowerCase().trim())
      .maybeSingle();

    let shareCreated = false;
    if (existingShare) {
      // Already shared, but we'll still send the email notification
      console.log('Trip already shared with this email, but will resend notification');
    } else {
      shareCreated = true;
    }

    // Create the share record only if it doesn't exist
    if (shareCreated) {
      // Extract first name from email (before the @) as a placeholder
      // The recipient can update their name later
      const emailPrefix = email.split('@')[0] || 'Guest';
      // Capitalize first letter
      const firstName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);

      const shareData: any = {
        trip_id: tripId,
        shared_by_user_id: user.id,
        shared_with_email: email.toLowerCase().trim(),
        first_name: firstName,
        last_name: null,
        is_owner: false,
        permission_level: permissionLevel
      };

      const { error: shareError } = await supabase
        .from('trip_shares' as any)
        .insert(shareData);

      if (shareError) {
        console.error('Error creating trip share:', shareError);
        toast.error('Failed to share the trip. Please try again.');
        return false;
      }
    }

    // Send email notification
    const notificationSent = await sendShareNotification(email, user.email || 'A WanderLuxe user', tripDestination, tripId);
    
    // Even if notification fails, the trip is still shared in the database
    if (!notificationSent) {
      toast.warning(shareCreated ? 'Trip shared, but email notification could not be sent' : 'Email notification could not be sent');
    } else {
      toast.success(shareCreated ? 'Trip shared successfully and notification sent' : 'Email notification sent successfully');
    }

    return true;
  } catch (error) {
    toast.error('An unexpected error occurred');
    return false;
  }
};

/**
 * Send an email notification to a user that a trip has been shared with them
 * Using Supabase Edge Function for email delivery
 */
export const sendShareNotification = async (
  toEmail: string,
  fromEmail: string,
  tripDestination: string,
  tripId: string
): Promise<boolean> => {
  try {
    // Get the Supabase URL and anon key from environment
    const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
    const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      toast.error('Configuration error. Please contact support.');
      return false;
    }

    // Call the Supabase Edge Function for email sending
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}` // Add authorization header
      },
      body: JSON.stringify({
        toEmail,
        fromEmail,
        tripDestination,
        tripId
      })
    });

    let result;
    try {
      result = await response.json();
    } catch (e) {
      result = { success: false, message: 'Invalid response from email service' };
    }

    if (!response.ok || !result.success) {
      console.error('Email notification failed:', result.message || 'Unknown error');
      return false;
    }

    // Success!
    return true;
  } catch (error) {
    console.error('Error in share notification process:', error);
    return false;
  }
};

/**
 * Update permission level for an existing trip share
 */
export const updateTripSharePermission = async (shareId: string, newPermissionLevel: PermissionLevel): Promise<boolean> => {
  try {
    console.log(`Starting permission update for share ${shareId} to ${newPermissionLevel}`);
    
    // Direct update approach with comprehensive error handling
    const { data: updateResult, error: updateError } = await supabase
      .from('trip_shares' as any)
      .update({ permission_level: newPermissionLevel } as any)
      .eq('id', shareId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating trip share permission:', updateError);
      toast.error(`Failed to update permission: ${updateError.message}`);
      return false;
    }

    if (!updateResult) {
      console.error('No data returned from update operation');
      toast.error('Permission update failed - no data returned');
      return false;
    }

    console.log('Permission update successful:', updateResult);
    toast.success(`Permission updated to ${newPermissionLevel === 'read' ? 'view only' : 'full access'}`);
    return true;
  } catch (error) {
    console.error('Error updating trip share permission:', error);
    toast.error('An unexpected error occurred while updating permissions');
    return false;
  }
};

/**
 * Remove a trip share
 */
export const removeTripShare = async (shareId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('trip_shares' as any)
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

    const userEmail = user.email?.toLowerCase();
    if (!userEmail) {
      console.error('User has no email address');
      return { data: [], error: new Error('No email address found') };
    }

    console.log('Fetching shared trips for email:', userEmail);

    // Get all trips shared with the user's email
    // Use ilike for case-insensitive matching to be extra safe
    const { data, error } = await supabase
      .from('trip_shares' as any)
      .select(`
        *,
        trips (*)
      `)
      .ilike('shared_with_email', userEmail)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching shared trips:', error);
      // Log more details for debugging
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return { data: [], error };
    }

    console.log('Found shared trips:', data?.length || 0);

    // Filter out shares where the user is the owner (shared_by_user_id === current user)
    // These are the owner's own "share" records, not trips shared WITH them
    const filteredData = (data || []).filter((share: any) =>
      share.shared_by_user_id !== user.id
    );

    // Get owner information for each shared trip
    const processedData = await Promise.all(filteredData.map(async (share: any) => {
      // Fetch the owner's profile information
      const { data: ownerData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', share.shared_by_user_id)
        .single();

      // Get owner's name: prefer profile full_name, then fall back to getting
      // name from the owner's trip_shares record (where shared_by_user_id === shared_with_user_id)
      let ownerName = ownerData?.full_name || '';

      // If profile has no name, try to get the owner's name from their trip_shares record
      if (!ownerName) {
        const { data: ownerShare } = await supabase
          .from('trip_shares' as any)
          .select('first_name, last_name')
          .eq('trip_id', share.trip_id)
          .eq('shared_by_user_id', share.shared_by_user_id)
          .eq('shared_with_user_id', share.shared_by_user_id)
          .maybeSingle();

        if (ownerShare) {
          const firstName = ownerShare.first_name || '';
          const lastName = ownerShare.last_name || '';
          // Don't use "Trip Owner" fallback - only use real names
          if (firstName && firstName !== 'Trip') {
            ownerName = [firstName, lastName].filter(Boolean).join(' ');
          }
        }
      }

      return {
        ...share,
        trips: share.trips || null,
        owner_name: ownerName,
        owner_email: '' // Email not available in profiles table
      };
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
      .from('trip_shares' as any)
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching trip shares:', error);
      return [];
    }

    // Ensure permission_level has a default value for backward compatibility
    const processedData = (data || []).map((share: any) => ({
      ...share,
      permission_level: share.permission_level || 'edit'
    }));

    console.log('Fetched trip shares:', processedData);
    return processedData as any;
  } catch (error) {
    console.error('Error fetching trip shares:', error);
    return [];
  }
};

/**
 * Get unique email addresses that the current user has previously shared trips with
 * (excluding emails that have already been shared with the current trip)
 */
export const getPreviouslySharedEmails = async (currentTripId: string): Promise<string[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

    // Get all emails the current user has shared trips with
    const { data: allShares, error: allSharesError } = await supabase
      .from('trip_shares' as any)
      .select('shared_with_email, trip_id, created_at')
      .eq('shared_by_user_id', user.id)
      .order('created_at', { ascending: false });

    if (allSharesError) {
      console.error('Error fetching previous shares:', allSharesError);
      return [];
    }

    // Get emails already shared with current trip
    const { data: currentTripShares, error: currentSharesError } = await supabase
      .from('trip_shares' as any)
      .select('shared_with_email')
      .eq('trip_id', currentTripId);

    if (currentSharesError) {
      console.error('Error fetching current trip shares:', currentSharesError);
      return [];
    }

    // Create sets for efficient filtering
    const currentTripEmails = new Set(
      (currentTripShares || []).map((share: any) => share.shared_with_email.toLowerCase().trim())
    );

    // Get unique emails, excluding current trip shares and user's own email
    const uniqueEmails = new Set<string>();
    (allShares || []).forEach((share: any) => {
      const email = share.shared_with_email.toLowerCase().trim();
      if (!currentTripEmails.has(email) && email !== user.email?.toLowerCase()) {
        uniqueEmails.add(email);
      }
    });

    return Array.from(uniqueEmails).slice(0, 10); // Limit to 10 most recent unique emails
  } catch (error) {
    console.error('Error fetching previously shared emails:', error);
    return [];
  }
};