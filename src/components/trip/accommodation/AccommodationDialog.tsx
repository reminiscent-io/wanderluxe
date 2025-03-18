import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccommodationFormData } from '@/services/accommodation/types';
import AccommodationForm from './AccommodationForm';

interface AccommodationDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: AccommodationFormData & { stay_id?: string };
  onSuccess: () => void;
  tripArrivalDate?: string | null;
  tripDepartureDate?: string | null;
}

const AccommodationDialog: React.FC<AccommodationDialogProps> = ({
  tripId,
  open,
  onOpenChange,
  initialData,
  onSuccess,
  tripArrivalDate,
  tripDepartureDate
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Prevent closing when clicking on outside elements (like the autocomplete dropdown) */}
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {initialData?.stay_id ? 'Edit Accommodation' : 'Add Accommodation'}
          </DialogTitle>
        </DialogHeader>
        <AccommodationForm
          onSubmit={async (data) => {
            await onSuccess();
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
          initialData={initialData}
          tripArrivalDate={tripArrivalDate}
          tripDepartureDate={tripDepartureDate}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AccommodationDialog;
