
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
    restaurant_name: string;
    reservation_time?: string;
    number_of_people?: number;
    confirmation_number?: string;
    notes?: string;
    cost?: number;
    currency?: string;
    address?: string;
    phone_number?: string;
    phone_id?: string;    
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
  dayId
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReservation, setEditingReservation] = useState<string | null>(null);
  const [deletingReservation, setDeletingReservation] = useState<string | null>(null);

  // Helper function to handle database operations and error handling
  const handleDatabaseOperation = async (
    operation: () => Promise<{ error: any }>,
    successMessage: string,
    errorMessage: string
  ) => {
    try {
      const { error } = await operation();
      if (error) throw error;
      toast.success(successMessage);
      return true;
    } catch (error) {
      console.error(errorMessage, error);
      toast.error(errorMessage);
      return false;
    }
  };

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    const processedData = {
      ...data,
      day_id: dayId,
      order_index: reservations.length,
      reservation_time: data.reservation_time || null
    };

    const success = await handleDatabaseOperation(
      () => editingReservation
        ? supabase
            .from('restaurant_reservations')
            .update(processedData)
            .eq('id', editingReservation)
        : supabase
            .from('restaurant_reservations')
            .insert(processedData),
      editingReservation ? 'Reservation updated successfully' : 'Reservation added successfully',
      editingReservation ? 'Failed to update reservation' : 'Failed to save reservation'
    );

    if (success) {
      setIsDialogOpen(false);
      setEditingReservation(null);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deletingReservation) return;
    
    const success = await handleDatabaseOperation(
      () => supabase
        .from('restaurant_reservations')
        .delete()
        .eq('id', deletingReservation),
      'Reservation deleted successfully',
      'Failed to delete reservation'
    );

    if (success) {
      setDeletingReservation(null);
    }
  };

  const handleEdit = (reservation: any) => {
    setEditingReservation(reservation.id);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-base font-semibold text-earth-700">Dining</h4>
        <Button
          onClick={() => setIsDialogOpen(true)}
          variant="ghost"
          size="sm"
          className="text-earth-600 hover:text-earth-700 hover:bg-earth-50"
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
