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
  console.log('RestaurantReservationDialog - onSubmit function:', typeof onSubmit);

  const handleFormSubmit = async (data: any) => {
    console.log('RestaurantReservationDialog - handleFormSubmit called with:', data);
    console.log('RestaurantReservationDialog - About to call onSubmit prop');
    try {
      await onSubmit(data);
      console.log('RestaurantReservationDialog - onSubmit completed successfully');
    } catch (error) {
      console.error('RestaurantReservationDialog - Error calling onSubmit:', error);
      throw error;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <div aria-describedby="restaurant-reservation-description">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Enter the details for your restaurant reservation.</DialogDescription>
          </DialogHeader>
          <p id="restaurant-reservation-description" className="sr-only">
            Please fill out the restaurant reservation form.
          </p>
          <RestaurantReservationForm
            onSubmit={handleFormSubmit}
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