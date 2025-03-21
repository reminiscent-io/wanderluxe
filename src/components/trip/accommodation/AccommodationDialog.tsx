import React, {useEffect} from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccommodationFormData } from '@/services/accommodation/accommodationService';
import AccommodationForm from './AccommodationForm';

interface AccommodationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AccommodationFormData) => Promise<void>;
  initialData?: AccommodationFormData | null;
  tripArrivalDate: string | null;
  tripDepartureDate: string | null;
  isEditing?: boolean;
}

const AccommodationDialog: React.FC<AccommodationDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  tripArrivalDate,
  tripDepartureDate,
  isEditing = false
}) => {
  useEffect(() => {
    if (initialData) {
      console.log("Dialog opened with initial data:", initialData);
    }
  }, [initialData, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-800">
            {isEditing ? 'Edit Hotel Stay' : 'Add Hotel Stay'}
          </DialogTitle>
        </DialogHeader>
        <AccommodationForm
          onSubmit={onSubmit}
          onCancel={onClose}
          initialData={initialData}
          tripArrivalDate={tripArrivalDate}
          tripDepartureDate={tripDepartureDate}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AccommodationDialog;