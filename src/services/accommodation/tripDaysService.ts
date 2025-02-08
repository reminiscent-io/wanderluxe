import { supabase } from '@/integrations/supabase/client';

export const createTripDays = async (tripId: string, dates: string[]) => {
  console.log('Managing trip days for dates:', dates);
  
  // Get all existing trip days
  const { data: existingDays } = await supabase
    .from('trip_days')
    .select('id, date')
    .eq('trip_id', tripId);

  // Ensure dates are in YYYY-MM-DD format without time information
  const formattedDates = dates.map(date => date.split('T')[0]);
  const existingDatesSet = new Set(existingDays?.map(day => day.date.split('T')[0]) || []);
  
  // Find dates to create and delete
  const newDates = formattedDates.filter(date => !existingDatesSet.has(date));
  const datesToDelete = existingDays?.filter(day => !formattedDates.includes(day.date.split('T')[0])) || [];

  // Delete days that are no longer in the range
  if (datesToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('trip_days')
      .delete()
      .in('id', datesToDelete.map(day => day.id));

    if (deleteError) {
      console.error('Error deleting trip days:', deleteError);
      throw deleteError;
    }
  }

  // Create new days
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