import React, { useState } from 'react';
import ImageSection from "./ImageSection";
import TimingSection from "./TimingSection";
import DestinationInput from "./DestinationInput";
import FormActions from "./FormActions";
import { supabase } from '@/integrations/supabase/client';
import { getDaysBetweenDates } from '../../../utils/dateUtils';
import { createTripDays } from '@/services/tripDaysService';
import { addOwnerToTripShares } from '@/services/travelers';
import { toast } from 'sonner';

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
  const [imagePosition, setImagePosition] = useState<string>("center 50%");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isLoading || isSubmitting) return;
    
    // Validate required fields
    if (!destination.trim()) {
      toast.error('Please enter a destination');
      return;
    }
    
    if (!startDate || !endDate) {
      toast.error('Please select travel dates');
      return;
    }
    
    if (new Date(startDate) >= new Date(endDate)) {
      toast.error('End date must be after start date');
      return;
    }
    
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Insert the trip into the database with user_id and cover_image_url
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert([{
          user_id: user.id,
          destination,
          start_date: startDate,
          end_date: endDate,
          arrival_date: startDate,
          departure_date: endDate,
          cover_image_url: coverImageUrl
        } as any])
        .select()
        .single();

      if (tripError) throw tripError;

      if (trip) {
        try {
          // Automatically add the trip owner to trip_shares table FIRST
          // This is required for trip_days RLS policy to pass
          await addOwnerToTripShares(trip.trip_id, user.id);

          // Generate an array of dates between start and end dates (inclusive)
          const days = getDaysBetweenDates(startDate, endDate);

          // Create trip days in the database for each date with both IDs
          await createTripDays(trip.trip_id, days);

          // Save the image position for this trip in localStorage
          if (imagePosition && coverImageUrl) {
            localStorage.setItem(`trip_image_position_${trip.trip_id}`, imagePosition);
          }
          
          // Call the parent's onSubmit callback with the tripId
          onSubmit(trip.trip_id);
        } catch (daysError) {
          console.error('Error creating trip days:', daysError);
          toast.error('Failed to create trip schedule. Please try again.');
          throw daysError;
        }
      }
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error('Failed to create trip. Please check your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="space-y-6"
      onKeyDown={(e) => {
        // Prevent Enter key submission when already submitting
        if (e.key === 'Enter' && (isLoading || isSubmitting)) {
          e.preventDefault();
        }
      }}
    >
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
        objectPosition={imagePosition}
        onPositionChange={setImagePosition}
      />
      
      <FormActions
        isLoading={isLoading || isSubmitting}
        onCancel={onCancel}
      />
    </form>
  );
};

export default CreateTripForm;
