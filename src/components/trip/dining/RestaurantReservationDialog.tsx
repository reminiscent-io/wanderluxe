import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import RestaurantReservationForm from './RestaurantReservationForm';

interface RestaurantReservationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
  editingReservation?: any;
  title: string;
  onDelete?: () => Promise<void>;
  tripId: string; // must be provided
  tripArrivalDate?: string;
  tripDepartureDate?: string;
}

const RestaurantReservationDialog: React.FC<RestaurantReservationDialogProps> = ({
  isOpen,
  onOpenChange,
  onSubmit,
  isSubmitting,
  editingReservation,
  title,
  onDelete,
  tripId,
  tripArrivalDate,
  tripDepartureDate,
}) => {
  const handleFormSubmit = async (data: any) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Failed to save reservation:', error);
      throw error;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        onPointerDownOutside={(e) => e.preventDefault()}
        className="w-[95vw] max-w-[95vw] sm:max-w-[600px] mx-auto"
      >
        <div className="flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Enter the details for your restaurant reservation.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto scrollbar-none">
            <RestaurantReservationForm
              onSubmit={handleFormSubmit}
              isSubmitting={isSubmitting}
              defaultValues={editingReservation}
              onDelete={onDelete}
              tripId={tripId}
              tripArrivalDate={tripArrivalDate}
              tripDepartureDate={tripDepartureDate}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RestaurantReservationDialog;