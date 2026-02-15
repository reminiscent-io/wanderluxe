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
      let firstName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
      let lastName: string | null = null;

      // Check if a user with this email already exists
      const { data: existingUserId } = await supabase.rpc('get_user_id_by_email', {
        lookup_email: email.toLowerCase().trim()
      });

      // If user exists, get their profile for better name display
      if (existingUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', existingUserId)
          .single();

        if (profile?.full_name) {
          const nameParts = profile.full_name.trim().split(' ').filter(Boolean);
          firstName = nameParts[0] || firstName;
          lastName = nameParts.slice(1).join(' ') || null;
        }
      }

      const shareData: any = {
        trip_id: tripId,
        shared_by_user_id: user.id,
        shared_with_email: email.toLowerCase().trim(),
        shared_with_user_id: existingUserId || null,
        first_name: firstName,
        last_name: lastName,
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

    // Send email notification (best-effort; the share row is already saved)
    await sendShareNotification(email, user.email || 'A WanderLuxe user', tripDestination, tripId);

    // Callers handle their own toast messages
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
 * Accept a pending trip share invitation (recipient-side).
 * Uses a SECURITY DEFINER RPC to avoid granting broad UPDATE rights.
 */
export const acceptTripShare = async (shareId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('accept_trip_share', {
      share_id: shareId,
    });

    if (error) {
      console.error('Error accepting trip share:', error);
      toast.error('Failed to accept invite');
      return false;
    }

    if (!data) {
      toast.error('Invite could not be accepted');
      return false;
    }

    toast.success('Trip invite accepted');
    return true;
  } catch (error) {
    console.error('Error accepting trip share:', error);
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
    // Also fetch trip preview for pending invites where RLS blocks trip data
    const processedData = await Promise.all(filteredData.map(async (share: any) => {
      // Fetch the owner's profile information
      const { data: ownerData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', share.shared_by_user_id)
        .single();

      // Get the owner's trip_shares record (where shared_by_user_id === shared_with_user_id)
      // This contains their email and name as fallback
      const { data: ownerShare } = await supabase
        .from('trip_shares' as any)
        .select('first_name, last_name, shared_with_email')
        .eq('trip_id', share.trip_id)
        .eq('shared_by_user_id', share.shared_by_user_id)
        .eq('shared_with_user_id', share.shared_by_user_id)
        .maybeSingle();

      // Get owner's name: prefer profile full_name, then trip_shares name
      let ownerName = ownerData?.full_name || '';
      let ownerEmail = ownerShare?.shared_with_email || '';

      // If profile has no name, use trip_shares name
      if (!ownerName && ownerShare) {
        const firstName = ownerShare.first_name || '';
        const lastName = ownerShare.last_name || '';
        // Don't use "Trip Owner" fallback - only use real names
        if (firstName && firstName !== 'Trip') {
          ownerName = [firstName, lastName].filter(Boolean).join(' ');
        }
      }

      // If still no name but we have email, derive from email
      if (!ownerName && ownerEmail) {
        const emailPrefix = ownerEmail.split('@')[0] || '';
        ownerName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
      }

      // For pending invites where trips is null (RLS blocks full trip data),
      // fetch basic trip preview via SECURITY DEFINER function
      let tripData = share.trips;
      if (!tripData && share.share_status === 'pending') {
        const { data: preview } = await supabase.rpc('get_pending_trip_preview', {
          p_share_id: share.id
        });
        if (preview && preview.length > 0) {
          // Map the preview data to match expected trip structure
          tripData = {
            trip_id: preview[0].trip_id,
            destination: preview[0].destination,
            primary_destination: preview[0].primary_destination,
            arrival_date: preview[0].arrival_date,
            departure_date: preview[0].departure_date,
            cover_image_url: preview[0].cover_image_url,
            // Mark as preview so UI knows not to expect full data
            _is_preview: true
          };
        }
      }

      return {
        ...share,
        trips: tripData,
        owner_name: ownerName,
        owner_email: ownerEmail
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