import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import RestaurantReservationDialog from './RestaurantReservationDialog';
import RestaurantCard from './RestaurantCard';
import DeleteReservationDialog from './DeleteReservationDialog';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DiningListProps {
  reservations: Array<{
    id: string;
    day_id: string; 
    trip_id: string; // include trip_id if stored
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
    rating?: number;
    created_at: string;   
  }>;
  formatTime: (time?: string) => string;
  dayId: string;
  tripId: string; // required prop for trip context
}

const DiningList: React.FC<DiningListProps> = ({
  reservations,
  formatTime,
  dayId,
  tripId,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReservation, setEditingReservation] = useState<string | null>(null);
  const [deletingReservation, setDeletingReservation] = useState<string | null>(null);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      console.log("DiningList processing data with tripId:", tripId);
      const processedData = {
        ...data,
        day_id: dayId,
        trip_id: tripId,
        order_index: reservations.length,
        reservation_time: data.reservation_time || null
      };
      console.log("ProcessedData:", processedData);

      if (editingReservation) {
        const { error } = await supabase
          .from('restaurant_reservations')
          .update(processedData)
          .eq('id', editingReservation);

        if (error) throw error;
        toast.success('Reservation updated successfully');
      } else {
        const { error } = await supabase
          .from('restaurant_reservations')
          .insert([processedData]);

        if (error) throw error;
        toast.success('Reservation added successfully');
      }

      setIsDialogOpen(false);
      setEditingReservation(null);
    } catch (error) {
      console.error('Error saving reservation:', error);
      toast.error(editingReservation ? 'Failed to update reservation' : 'Failed to save reservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingReservation) return;

    try {
      const { error } = await supabase
        .from('restaurant_reservations')
        .delete()
        .eq('id', deletingReservation);

      if (error) throw error;

      toast.success('Reservation deleted successfully');
      setDeletingReservation(null);
    } catch (error) {
      console.error('Error deleting reservation:', error);
      toast.error('Failed to delete reservation');
    }
  };

  const handleEdit = (reservation: any) => {
    setEditingReservation(reservation.id);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-earth-500">Dining</h4>
        <Button
          onClick={() => setIsDialogOpen(true)}
          variant="outline"
          size="sm"
          className="text-earth-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Reservation
        </Button>
      </div>

      <div className="space-y-3">
        {reservations.map((reservation) => (
          <RestaurantCard
            key={reservation.id}
            reservation={reservation}
            formatTime={formatTime}
            onEdit={handleEdit}
            onDelete={() => setDeletingReservation(reservation.id)}
          />
        ))}
      </div>

      <RestaurantReservationDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        editingReservation={editingReservation ? reservations.find(r => r.id === editingReservation) : undefined}
        title={editingReservation ? 'Edit Restaurant Reservation' : 'Add Restaurant Reservation'}
        tripId={tripId || ''} // Ensure tripId is never undefined
      />

      <DeleteReservationDialog
        isOpen={!!deletingReservation}
        onOpenChange={() => setDeletingReservation(null)}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default DiningList;