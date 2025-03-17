import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RestaurantReservationForm from './RestaurantReservationForm';

interface RestaurantReservationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  editingReservation?: any;
  title: string;
}

const RestaurantReservationDialog: React.FC<RestaurantReservationDialogProps> = ({
  isOpen,
  onOpenChange,
  onSubmit,
  isSubmitting,
  editingReservation,
  title,
  tripId
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <div aria-describedby="restaurant-reservation-description">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
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
