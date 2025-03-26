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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Insert the trip into the database with user_id
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert([{
          user_id: user.id,
          destination,
          arrival_date: startDate,
          departure_date: endDate,
          created_at: new Date().toISOString(),
          cover_image_url: '' // Add empty cover image URL
        }])
        .select()
        .single();

      if (tripError) throw tripError;
      
      if (trip) {
        try {
          // Generate an array of dates between start and end dates (inclusive)
          const days = getDaysBetweenDates(startDate, endDate);
          
          // Insert trip days directly with user_id
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          const tripDays = days.map(date => ({
            trip_id: trip.trip_id,
            user_id: user.id,
            date: date,
            created_at: new Date().toISOString()
          }));

          const { error: daysError } = await supabase
            .from('trip_days')
            .insert(tripDays);

          if (daysError) throw daysError;
          
          // Call the parent's onSubmit callback with the event
          if (onSubmit) {
            onSubmit(e);
          }
        } catch (daysError) {
          console.error('Error creating trip days:', daysError);
          throw daysError;
        }
      }
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error('Failed to create trip');
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
