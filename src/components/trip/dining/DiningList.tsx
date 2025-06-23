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
  className?: string;
}

const DiningList: React.FC<DiningListProps> = ({
  reservations,
  formatTime,
  dayId,
  className
}) => {
  const { tripId } = useParams<{ tripId: string }>();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReservation, setEditingReservation] = useState<string | null>(null);
  const [deletingReservation, setDeletingReservation] = useState<string | null>(null);

  const handleSubmit = async (data: any) => {
    console.log("=== HANDLESUBMIT CALLED ===");
    console.log("Initial state - isSubmitting:", isSubmitting);
    console.log("tripId:", tripId);
    console.log("dayId:", dayId);
    
    setIsSubmitting(true);
    console.log("Set isSubmitting to true");
    
    try {
      console.log("DiningList processing data with tripId:", tripId);
      console.log("Raw form data received:", data);
      
      // Make sure we include all necessary fields for trip sharing to work
      const processedData = {
        ...data,
        day_id: dayId,
        trip_id: tripId, // This is critical for proper permission handling in shared trips
        order_index: data.order_index !== undefined ? data.order_index : reservations.length,
        reservation_time: data.reservation_time || null
      };
      
      console.log("Processed data before database operation:", processedData);

      console.log('About to perform database operation, editing:', editingReservation);
      
      if (editingReservation) {
        console.log('Performing UPDATE operation');
        // For updates, explicitly include trip_id to help with RLS policies
        const updateData = {
          ...processedData,
          trip_id: tripId // Make sure trip_id is included for RLS
        };
        
        console.log('Update data:', updateData);
        
        const { data: updateResult, error } = await supabase
          .from('reservations')
          .update(updateData)
          .eq('id', editingReservation)
          .select();

        if (error) {
          console.error('Update error details:', {
            error,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            updateData
          });
          throw error;
        }
        
        console.log('Update successful, result:', updateResult);
        toast.success('Reservation updated successfully');
        await queryClient.invalidateQueries({queryKey: ['reservations', dayId, tripId]}); 
      } else {
        console.log('Performing INSERT operation');
        // For inserts, explicitly include both day_id and trip_id for RLS policies
        const insertData = {
          ...processedData,
          day_id: dayId,
          trip_id: tripId, // Make sure trip_id is included for RLS
          order_index: processedData.order_index || reservations.length // Ensure order_index is set for NOT NULL constraint
        };
        
        console.log('Attempting to insert reservation with data:', insertData);
        console.log('Required fields check:');
        console.log('  - day_id:', insertData.day_id);
        console.log('  - restaurant_name:', insertData.restaurant_name);
        console.log('  - trip_id:', insertData.trip_id);
        console.log('  - order_index:', insertData.order_index);
        
        const { data: insertResult, error } = await supabase
          .from('reservations')
          .insert([insertData])
          .select(); // Add select to get the inserted data back

        if (error) {
          console.error('Insert error details:', {
            error,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            insertData
          });
          throw error;
        }
        
        console.log('Insert successful, result:', insertResult);
        await queryClient.invalidateQueries({queryKey: ['reservations', dayId, tripId]}); 
        toast.success('Reservation added successfully');
      }

      setIsDialogOpen(false);
      setEditingReservation(null);
    } catch (error) {
      console.error('Error saving reservation:', error);
      console.error('Error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        code: error?.code
      });
      toast.error(editingReservation ? 'Failed to update reservation' : 'Failed to save reservation');
    } finally {
      console.log('Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      // Find the reservation data to get trip_id before deleting
      const reservationToDelete = reservations.find(r => r.id === deletingReservation);
      
      if (!reservationToDelete) {
        throw new Error("Reservation not found");
      }
      
      // Include trip_id in the filter to help with RLS policies
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', deletingReservation)
        .eq('trip_id', tripId); // Ensure the trip_id is included for RLS

      if (error) {
        console.error('Delete error details:', error);
        throw error;
      }

      // Invalidate both the specific day's reservations and the trip data
      // Include tripId to ensure proper refresh for shared trips
      await Promise.all([
        queryClient.invalidateQueries({queryKey: ['reservations', dayId, tripId]}),
        queryClient.invalidateQueries({queryKey: ['trip', tripId]})
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
    <div className={`space-y-4 ${className || ''}`}>
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

      {/* Add button is now in the header of the day card */}

      {/* Dialog for Add/Edit Reservation */}
      <RestaurantReservationDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={async (data) => {
          console.log("=== DIRECT CALL TO HANDLESUBMIT ===");
          console.log("Data received:", data);
          console.log("handleSubmit function:", typeof handleSubmit);
          await handleSubmit(data);
        }}
        isSubmitting={isSubmitting}
        editingReservation={
          editingReservation 
            ? reservations.find(r => r.id === editingReservation) 
            : { day_id: dayId, trip_id: tripId, order_index: reservations.length } // Include all required fields for new reservations
        }
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