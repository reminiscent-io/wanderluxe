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
      // Insert the trip into the database
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error('You must be logged in to create a trip');
      }

      const { data: trip, error } = await supabase
        .from('trips')
        .insert([{
          user_id: session.user.id,
          destination,
          arrival_date: startDate,
          departure_date: endDate,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
        
      if (trip) {
        // Generate an array of dates between start and end dates (inclusive)
        const days = getDaysBetweenDates(startDate, endDate);
        
        // Create trip days in the database for each date
        await createTripDays(trip.id, days);
        
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
