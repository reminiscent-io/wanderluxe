
import { supabase } from '@/integrations/supabase/client';

export const createTripDays = async (tripId: string, dates: string[]) => {
  try {
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const tripDays = newDates.map(date => ({
      trip_id: tripId,
      user_id: user.id,
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
