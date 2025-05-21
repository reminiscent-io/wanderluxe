import React, { useState } from 'react';
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
  onSubmit: (tripId: string) => void;
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
    if (isLoading) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Insert the trip into the database with user_id and cover_image_url
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert([{
          user_id: user.id,
          destination,
          arrival_date: startDate,
          departure_date: endDate,
          cover_image_url: coverImageUrl,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (tripError) throw tripError;

      if (trip) {
        try {
          // Generate an array of dates between start and end dates (inclusive)
          const days = getDaysBetweenDates(startDate, endDate);

          // Create trip days in the database for each date with both IDs
          await createTripDays(trip.trip_id, days);

          // Call the parent's onSubmit callback with the tripId
          onSubmit(trip.trip_id);
        } catch (daysError) {
          console.error('Error creating trip days:', daysError);
          throw daysError;
        }
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
        onSubmit={handleSubmit}
        onCancel={onCancel}
      />
    </form>
  );
};

export default CreateTripForm;
