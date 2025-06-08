import React, { useState } from 'react';
import { toast } from 'sonner';
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
  const [imagePosition, setImagePosition] = useState<string>("center 50%");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    // Validate required fields
    if (!destination.trim()) {
      toast.error('Please enter a destination');
      return;
    }
    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }
    if (!endDate) {
      toast.error('Please select an end date');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('End date must be after start date');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to create a trip');
        throw new Error('User not authenticated');
      }

      console.log('Creating trip with data:', {
        destination: destination.trim(),
        startDate,
        endDate,
        coverImageUrl
      });

      // Insert the trip into the database with user_id and cover_image_url
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert([{
          user_id: user.id,
          destination: destination.trim(),
          arrival_date: startDate,
          departure_date: endDate,
          cover_image_url: coverImageUrl || null,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (tripError) {
        console.error('Trip creation error:', tripError);
        toast.error(`Failed to create trip: ${tripError.message}`);
        throw tripError;
      }

      if (trip) {
        console.log('Trip created successfully:', trip);
        try {
          // Generate an array of dates between start and end dates (inclusive)
          const days = getDaysBetweenDates(startDate, endDate);
          console.log('Creating trip days:', days);

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
          toast.error('Trip created but failed to set up itinerary days');
          throw daysError;
        }
      }
    } catch (error: any) {
      console.error('Error creating trip:', error);
      if (!error.message?.includes('Failed to create trip')) {
        toast.error('An unexpected error occurred while creating the trip');
      }
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
        objectPosition={imagePosition}
        onPositionChange={setImagePosition}
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
