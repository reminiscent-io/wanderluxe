import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import RestaurantReservationDialog from './RestaurantReservationDialog';
import RestaurantCard from './RestaurantCard';
import DeleteReservationDialog from './DeleteReservationDialog';
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReservation, setEditingReservation] = useState<string | null>(null);
  const [deletingReservation, setDeletingReservation] = useState<string | null>(null);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      console.log("DiningList processing data with tripId:", tripId);
      // Make sure we include all necessary fields for trip sharing to work
      const processedData = {
        ...data,
        day_id: dayId,
        trip_id: tripId, // This is critical for proper permission handling in shared trips
        order_index: reservations.length,
        reservation_time: data.reservation_time || null
      };

      if (editingReservation) {
        const { error } = await supabase
          .from('reservations')
          .update(processedData)
          .eq('id', editingReservation);

        if (error) throw error;
        toast.success('Reservation updated successfully');
        await queryClient.invalidateQueries(['reservations', dayId]); 
      } else {
        const { error } = await supabase
          .from('reservations')
          .insert([processedData]);

        if (error) throw error;
        await queryClient.invalidateQueries(['reservations', dayId]); 
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
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', deletingReservation);

      if (error) throw error;

      // Invalidate both the specific day's reservations and the trip data
      await Promise.all([
        queryClient.invalidateQueries(['reservations', dayId]),
        queryClient.invalidateQueries(['trip'])
      ]);

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
        className="w-full bg-white/10 text-gray-500 hover:bg-white/20 mt-2"
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
        tripId={tripId} 
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