import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AccommodationFormData } from '@/services/accommodation/types';
import AccommodationDialog from './AccommodationDialog';

interface AccommodationActionsProps {
  tripId: string;
  onSubmit: (data: AccommodationFormData) => Promise<void>;
  initialData?: AccommodationFormData & { stay_id?: string };
  tripArrivalDate?: string | null;
  tripDepartureDate?: string | null;
}

const AccommodationActions: React.FC<AccommodationActionsProps> = ({
  tripId,
  onSubmit,
  initialData,
  tripArrivalDate,
  tripDepartureDate
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        variant="outline"
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Accommodation
      </Button>

      <AccommodationDialog
        tripId={tripId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={initialData}
        onSave={onSubmit} {/* Updated prop name */}
        tripArrivalDate={tripArrivalDate}
        tripDepartureDate={tripDepartureDate}
      />
    </>
  );
};

export default AccommodationActions;
