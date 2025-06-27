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
  console.log('RestaurantReservationDialog - onSubmit function:', typeof onSubmit);

  const handleFormSubmit = async (data: any) => {
    console.log('RestaurantReservationDialog - handleFormSubmit called with:', data);
    console.log('RestaurantReservationDialog - About to call onSubmit prop');
    
    // Check for Google Places data
    if (data.place_id) {
      console.log('RestaurantReservationDialog - Google Places data detected:', {
        place_id: data.place_id,
        address: data.address,
        phone_number: data.phone_number,
        website: data.website,
        rating: data.rating
      });
    }
    
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
      <DialogContent className="max-w-lg">
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
            onDelete={onDelete}
            tripId={tripId}
            tripArrivalDate={tripArrivalDate}
            tripDepartureDate={tripDepartureDate}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RestaurantReservationDialog;