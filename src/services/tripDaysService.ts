
import { supabase } from '@/integrations/supabase/client';

export const createTripDays = async (tripId: string, dates: string[]) => {
  if (!tripId) {
    throw new Error('Trip ID is required to create trip days');
  }

  try {
    // Verify trip exists first
    const { data: tripExists, error: tripError } = await supabase
      .from('trips')
      .select('trip_id')
      .eq('trip_id', tripId)
      .single();

    if (tripError || !tripExists) {
      throw new Error('Trip must exist before creating days');
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
