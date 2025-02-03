import { supabase } from '@/integrations/supabase/client';

export const createTripDays = async (tripId: string, dates: string[]) => {
  console.log('Creating trip days for dates:', dates);
  
  // First, check which dates already have trip days
  const { data: existingDays } = await supabase
    .from('trip_days')
    .select('date')
    .eq('trip_id', tripId);

  const existingDatesSet = new Set(existingDays?.map(day => day.date.toString()) || []);
  
  // Filter out dates that already have trip days
  const newDates = dates.filter(date => !existingDatesSet.has(date));
  
  if (newDates.length === 0) {
    console.log('No new trip days to create');
    return;
  }

  // Create trip days for new dates
  const { error } = await supabase
    .from('trip_days')
    .insert(
      newDates.map(date => ({
        trip_id: tripId,
        date: date,
      }))
    );

  if (error) {
    console.error('Error creating trip days:', error);
    throw error;
  }

  console.log('Successfully created trip days for dates:', newDates);
};