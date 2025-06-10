import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import RestaurantReservationForm from './RestaurantReservationForm';

interface RestaurantReservationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  editingReservation?: any;
  title: string;
  tripId: string; // must be provided
}

const RestaurantReservationDialog: React.FC<RestaurantReservationDialogProps> = ({
  isOpen,
  onOpenChange,
  onSubmit,
  isSubmitting,
  editingReservation,
  title,
  tripId,
}) => {
  console.log("RestaurantReservationDialog received tripId:", tripId);
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        onPointerDownOutside={(e) => e.preventDefault()}
        className="sm:max-w-[425px] max-h-[95vh] flex flex-col"
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Enter the details for your restaurant reservation.</DialogDescription>
        </DialogHeader>
        
        <div 
          aria-describedby="restaurant-reservation-description"
          className="flex-1 overflow-y-auto"
        >
          <p id="restaurant-reservation-description" className="sr-only">
            Please fill out the restaurant reservation form.
          </p>
          <RestaurantReservationForm
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            defaultValues={editingReservation}
            tripId={tripId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RestaurantReservationDialog;