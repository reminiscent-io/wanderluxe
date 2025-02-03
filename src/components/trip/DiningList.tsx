import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Utensils } from "lucide-react";
import { Clock, DollarSign } from "lucide-react";
import RestaurantReservationForm from './dining/RestaurantReservationForm';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DiningListProps {
  reservations: Array<{
    id: string;
    restaurant_name: string;
    reservation_time?: string;
    number_of_people?: number;
    confirmation_number?: string;
    notes?: string;
    cost?: number;
    currency?: string;
    address?: string;
    phone_number?: string;
    website?: string;
    place_id?: string;
    rating?: number;
  }>;
  onAddReservation: () => void;
  formatTime: (time?: string) => string;
  dayId: string;
}

const DiningList: React.FC<DiningListProps> = ({
  reservations,
  formatTime,
  dayId
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('restaurant_reservations')
        .insert({
          ...data,
          day_id: dayId,
          order_index: reservations.length
        });

      if (error) throw error;
      
      toast.success('Reservation added successfully');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error adding reservation:', error);
      toast.error('Failed to add reservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-earth-500">Dining</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          className="text-earth-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Reservation
        </Button>
      </div>

      <div className="space-y-2">
        {reservations.map((reservation) => (
          <div
            key={reservation.id}
            className="p-4 bg-sand-50 rounded-lg space-y-2 hover:bg-sand-100 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <h5 className="font-medium flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-earth-500" />
                  {reservation.restaurant_name}
                </h5>
                {reservation.address && (
                  <p className="text-sm text-gray-600 mt-1">{reservation.address}</p>
                )}
                {reservation.notes && (
                  <p className="text-sm text-gray-600 mt-1">{reservation.notes}</p>
                )}
              </div>
              {reservation.confirmation_number && (
                <span className="text-xs text-gray-500">
                  Conf: {reservation.confirmation_number}
                </span>
              )}
            </div>
            <div className="flex gap-4 text-sm text-gray-500">
              {reservation.reservation_time && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(reservation.reservation_time)}</span>
                </div>
              )}
              {reservation.number_of_people && (
                <div className="flex items-center gap-1">
                  <span>• {reservation.number_of_people} people</span>
                </div>
              )}
              {reservation.cost && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span>
                    {reservation.cost} {reservation.currency || 'USD'}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Restaurant Reservation</DialogTitle>
          </DialogHeader>
          <RestaurantReservationForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiningList;