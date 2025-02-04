import React from 'react';
import { Button } from "@/components/ui/button";
import ImageSection from "./ImageSection";
import TimingSection from "./TimingSection";
import DestinationInput from "./DestinationInput";
import FormActions from "./FormActions";

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
  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <DestinationInput
        destination={destination}
        setDestination={setDestination}
      />

      <TimingSection
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
      />

      <ImageSection
        imageUrl={coverImageUrl}
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