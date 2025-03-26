
import { supabase } from '@/integrations/supabase/client';

export const createTripDays = async (tripId: string, dates: string[]) => {
  try {
    // Validate user owns the trip
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      throw new Error('You must be logged in to create trip days');
    }

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('trip_id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== session.user.id) {
      throw new Error('Unauthorized: Invalid trip access');
    }

    // First check which days already exist
    const { data: existingDays } = await supabase
      .from('trip_days')
      .select('date')
      .eq('trip_id', tripId)
      .in('date', dates);

    // Filter out existing dates
    const existingDates = new Set(existingDays?.map(day => day.date));
    const newDates = dates.filter(date => !existingDates.has(date));

    if (newDates.length === 0) return;

    const tripDays = newDates.map(date => ({
      trip_id: tripId,
      date: date,
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('trip_days')
      .insert(tripDays);

    if (error) throw error;
  } catch (error) {
    console.error('Error creating trip days:', error);
    throw error;
  }
};
