
import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AccommodationForm from './AccommodationForm';
import { AccommodationFormData } from '@/services/accommodation/types';

interface AccommodationActionsProps {
  isAddingAccommodation: boolean;
  setIsAddingAccommodation: (value: boolean) => void;
  editingStay: (AccommodationFormData & { stay_id: string }) | null;
  onSubmit: (data: AccommodationFormData) => void;
  onCancel: () => void;
  initialData?: AccommodationFormData;
  tripArrivalDate?: string | null;
  tripDepartureDate?: string | null;
}

const AccommodationActions: React.FC<AccommodationActionsProps> = ({
  isAddingAccommodation,
  setIsAddingAccommodation,
  editingStay,
  onSubmit,
  onCancel,
  initialData,
  tripArrivalDate,
  tripDepartureDate
}) => {
  if (isAddingAccommodation || editingStay) {
    return (
      <AccommodationForm
        onSubmit={onSubmit}
        onCancel={onCancel}
        initialData={initialData}
        tripArrivalDate={tripArrivalDate}
        tripDepartureDate={tripDepartureDate}
      />
    );
  }

  return (
    <Button
      onClick={() => setIsAddingAccommodation(true)}
      variant="outline"
      className="w-full"
    >
      <Plus className="h-4 w-4 mr-2" />
      Add Accommodation
    </Button>
  );
};

export default AccommodationActions;
