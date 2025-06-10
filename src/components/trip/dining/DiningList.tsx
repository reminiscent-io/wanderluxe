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
import { analytics } from '@/services/analyticsService';

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
    setIsSubmitting(true);
    try {
      console.log("DiningList processing data with tripId:", tripId);
      console.log("Received form data:", data);
      
      // Validate required fields
      if (!data.restaurant_name?.trim()) {
        throw new Error('Restaurant name is required');
      }
      
      if (!dayId || !tripId) {
        throw new Error('Day ID and Trip ID are required');
      }
      
      // Make sure we include all necessary fields for trip sharing to work
      const processedData = {
        ...data,
        day_id: dayId,
        trip_id: tripId, // This is critical for proper permission handling in shared trips
        order_index: reservations.length,
        reservation_time: data.reservation_time || null,
        currency: data.currency || 'USD' // Ensure currency has a default
      };
      
      console.log("Final processed data for database:", processedData);

      if (editingReservation) {
        // For updates, explicitly include trip_id to help with RLS policies
        const { error } = await supabase
          .from('reservations')
          .update({
            ...processedData,
            trip_id: tripId // Make sure trip_id is included for RLS
          })
          .eq('id', editingReservation);

        if (error) {
          console.error('Update error details:', error);
          analytics.trackError('reservation_update_failed', error.message, 'restaurant_reservations');
          throw error;
        }
        
        // Track successful reservation update
        analytics.trackInteraction('reservation_updated', 'restaurant_form', {
          trip_id: tripId,
          has_google_place_id: !!data.place_id,
          is_manual_entry: !data.place_id
        });
        
        toast.success('Reservation updated successfully');
        await queryClient.invalidateQueries({queryKey: ['reservations', dayId, tripId]}); 
      } else {
        // For inserts, explicitly include both day_id and trip_id for RLS policies
        const { error } = await supabase
          .from('reservations')
          .insert([{
            ...processedData,
            day_id: dayId,
            trip_id: tripId // Make sure trip_id is included for RLS
          }]);

        if (error) {
          console.error('Insert error details:', error);
          console.error('Error code:', error.code);
          console.error('Error hint:', error.hint);
          console.error('Error details:', error.details);
          analytics.trackError('reservation_insert_failed', error.message, 'restaurant_reservations');
          
          // Provide more specific error messages
          let errorMessage = 'Failed to save reservation';
          if (error.message.includes('check')) {
            errorMessage = 'Please check all required fields are filled correctly';
          } else if (error.message.includes('foreign key')) {
            errorMessage = 'Trip or day information is invalid';
          } else if (error.message.includes('unique')) {
            errorMessage = 'A reservation with these details already exists';
          }
          
          throw new Error(errorMessage);
        }
        
        // Track successful reservation creation
        analytics.trackInteraction('reservation_created', 'restaurant_form', {
          trip_id: tripId,
          has_google_place_id: !!data.place_id,
          is_manual_entry: !data.place_id,
          has_cost: !!data.cost,
          has_phone: !!data.phone_number,
          has_website: !!data.website
        });
        
        await queryClient.invalidateQueries({queryKey: ['reservations', dayId, tripId]}); 
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
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        editingReservation={
          editingReservation 
            ? reservations.find(r => r.id === editingReservation) 
            : { day_id: dayId, trip_id: tripId } // Include day_id for new reservations
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