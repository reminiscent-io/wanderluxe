import React, { useState } from 'react';
import ImageSection, { ImageMetadata } from "./ImageSection";
import TimingSection from "./TimingSection";
import DestinationInput from "./DestinationInput";
import PrimaryDestinationInput from "./PrimaryDestinationInput";
import FormActions from "./FormActions";
import { supabase } from '@/integrations/supabase/client';
import { generateDateArray } from '../../../utils/dateUtils';
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
  const [photographerName, setPhotographerName] = useState('');
  const [photographerUsername, setPhotographerUsername] = useState('');

  const handleImageChange = (url: string, metadata?: ImageMetadata) => {
    setCoverImageUrl(url);
    setPhotographerName(metadata?.photographer || '');
    setPhotographerUsername(metadata?.username || '');
  };

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
          cover_image_position: imagePosition || 'center 50%',
          cover_image_photographer: photographerName || null,
          cover_image_photographer_username: photographerUsername || null,
          is_public: false,
          primary_destination: primaryDestination || null,
          primary_destination_place_id: primaryDestinationPlaceId || null,
        } as any])
        .select('trip_id')
        .single();

      if (tripError) throw tripError;

      if (trip) {
        await addOwnerToTripShares(trip.trip_id, user.id);

        const days = generateDateArray(startDate, endDate);
        await createTripDays(trip.trip_id, days);

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
        onImageChange={handleImageChange}
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
