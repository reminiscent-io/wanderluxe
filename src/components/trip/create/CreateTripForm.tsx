import React, { useState } from 'react';
import ImageSection from "./ImageSection";
import TimingSection from "./TimingSection";
import DestinationInput from "./DestinationInput";
import PrimaryDestinationInput from "./PrimaryDestinationInput";
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
  const [primaryDestination, setPrimaryDestination] = useState('');
  const [primaryDestinationPlaceId, setPrimaryDestinationPlaceId] = useState('');

  const handlePrimaryDestinationChange = (destination: string, placeId: string) => {
    setPrimaryDestination(destination);
    setPrimaryDestinationPlaceId(placeId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading || isSubmitting) return;

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

      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert([{
          user_id: user.id,
          destination,
          arrival_date: startDate,
          departure_date: endDate,
          cover_image_url: coverImageUrl,
          is_public: false,
          primary_destination: primaryDestination || null,
          primary_destination_place_id: primaryDestinationPlaceId || null,
        } as any])
        .select('trip_id')
        .single();

      if (tripError) throw tripError;

      if (trip) {
        await addOwnerToTripShares(trip.trip_id, user.id);

        const days = getDaysBetweenDates(startDate, endDate);
        await createTripDays(trip.trip_id, days);

        // persist the vertical focus so hero & card match
        if (imagePosition && coverImageUrl) {
          localStorage.setItem(`trip_image_position_${trip.trip_id}`, imagePosition);
        }

        onSubmit(trip.trip_id);
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
      className="space-y-2"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (isLoading || isSubmitting)) {
          e.preventDefault();
        }
      }}
    >
      <DestinationInput destination={destination} setDestination={setDestination} />

      <PrimaryDestinationInput
        value={primaryDestination}
        placeId={primaryDestinationPlaceId}
        onChange={handlePrimaryDestinationChange}
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
