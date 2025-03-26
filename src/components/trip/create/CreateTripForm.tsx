import React from 'react';
import ImageSection from "./ImageSection";
import TimingSection from "./TimingSection";
import DestinationInput from "./DestinationInput";
import FormActions from "./FormActions";
import { supabase } from '@/integrations/supabase/client';
import { getDaysBetweenDates } from '../../../utils/dateUtils';
import { createTripDays } from '@/services/tripDaysService';


interface CreateTripFormProps {
  destination: string;
  setDestination: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  coverImageUrl: string;
  setCoverImageUrl: (value: string) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const CreateTripForm: React.FC<CreateTripFormProps> = ({
  destination,
  setDestination,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  coverImageUrl,
  setCoverImageUrl,
  isLoading,
  onSubmit,
  onCancel
}) => {

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('You must be logged in to create a trip');
      }

      // Insert the trip into the database
      // First create the trip
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert([{
          user_id: user.id,
          destination,
          arrival_date: startDate,
          departure_date: endDate,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (tripError) throw tripError;

      if (trip?.trip_id) {
        // Generate dates between start and end dates
        const days = getDaysBetweenDates(startDate, endDate);

        // Create trip days with proper trip_id and user_id
        const { error: daysError } = await supabase
          .from('trip_days')
          .insert(
            days.map(date => ({
              trip_id: trip.trip_id,
              date: date,
              created_at: new Date().toISOString()
            }))
          );

        if (daysError) {
          console.error('Error creating trip days:', daysError);
          throw daysError;
        }

        // Call the parent's onSubmit callback
        onSubmit(e);
      }
    } catch (error) {
      console.error('Error creating trip:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <DestinationInput
        destination={destination}
        setDestination={setDestination}
      />

      <TimingSection
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
      />

      <ImageSection
        coverImageUrl={coverImageUrl}
        onImageChange={setCoverImageUrl}
      />

      <FormActions
        isLoading={isLoading}
        onCancel={onCancel}
      />
    </form>
  );
};

export default CreateTripForm;