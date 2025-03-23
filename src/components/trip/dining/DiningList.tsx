import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import RestaurantReservationDialog from './RestaurantReservationDialog';
import RestaurantCard from './RestaurantCard';
import DeleteReservationDialog from './DeleteReservationDialog';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useParams } from 'react-router-dom';

interface DiningListProps {
  reservations: Array<{
    id: string;
    day_id: string; 
    trip_id: string;
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
}

const DiningList: React.FC<DiningListProps> = ({
  reservations,
  formatTime,
  dayId,
}) => {
  const { tripId } = useParams<{ tripId: string }>();
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
      {/* List of Reservations */}
      <div className="space-y-3">
        {[...reservations]
          .sort((a, b) => {
            const timeA = a.reservation_time || '';
            const timeB = b.reservation_time || '';
            return timeA.localeCompare(timeB);
          })
          .map((reservation) => (
            <RestaurantCard
              key={reservation.id}
              reservation={reservation}
              formatTime={formatTime}
              onEdit={handleEdit}
              onDelete={() => setDeletingReservation(reservation.id)}
            />
        ))}
      </div>

      {/* Add Reservation Button (mirroring Add Hotel Stay) */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className="w-full bg-white/10 text-white hover:bg-white/20 mt-2"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Reservation
      </Button>

      {/* Dialog for Add/Edit Reservation */}
      <RestaurantReservationDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        editingReservation={editingReservation ? reservations.find(r => r.id === editingReservation) : undefined}
        title={editingReservation ? 'Edit Restaurant Reservation' : 'Add Restaurant Reservation'}
        tripId={tripId} // Pass tripId directly
      />

      {/* Dialog for Delete Confirmation */}
      <DeleteReservationDialog
        isOpen={!!deletingReservation}
        onOpenChange={() => setDeletingReservation(null)}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default DiningList;