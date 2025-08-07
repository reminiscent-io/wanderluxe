import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
        className="w-[95vw] max-w-[95vw] sm:max-w-lg mx-auto"
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking on Google Places dropdown results
          const target = e.target as Element;
          if (target.closest('.pac-container') || target.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault();
          }
        }}
      >
        <div aria-describedby="restaurant-reservation-description" className="flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Enter the details for your restaurant reservation.</DialogDescription>
          </DialogHeader>
          <p id="restaurant-reservation-description" className="sr-only">
            Please fill out the restaurant reservation form.
          </p>
          <ScrollArea className="flex-1 max-h-[60vh]">
            <div className="px-1 pb-2">
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
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RestaurantReservationDialog;