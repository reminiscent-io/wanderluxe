import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Utensils, MapPin, Phone, Link as LinkIcon, Star, Clock, Users, Edit, Trash2 } from "lucide-react";
import RestaurantReservationForm from './dining/RestaurantReservationForm';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  const [editingReservation, setEditingReservation] = useState<string | null>(null);
  const [deletingReservation, setDeletingReservation] = useState<string | null>(null);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const processedData = {
        ...data,
        day_id: dayId,
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
          .insert(processedData);

        if (error) throw error;
        toast.success('Reservation added successfully');
      }
      setIsDialogOpen(false);
      setEditingReservation(null);
    } catch (error) {
      console.error('Error saving reservation:', error);
      toast.error('Failed to save reservation');
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
          <div
            key={reservation.id}
            className="p-4 bg-sand-50 rounded-lg space-y-3 hover:bg-sand-100 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h5 className="font-medium flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-earth-500" />
                  {reservation.restaurant_name}
                  {reservation.rating && (
                    <span className="flex items-center text-sm text-earth-400">
                      <Star className="h-4 w-4 fill-earth-400 mr-1" />
                      {reservation.rating}
                    </span>
                  )}
                </h5>
                
                {reservation.address && (
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-earth-400" />
                    {reservation.address}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {reservation.phone_number && (
                    <a 
                      href={`tel:${reservation.phone_number}`}
                      className="flex items-center gap-1 hover:text-earth-500"
                    >
                      <Phone className="h-4 w-4" />
                      {reservation.phone_number}
                    </a>
                  )}
                  
                  {reservation.website && (
                    <a 
                      href={reservation.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-earth-500"
                    >
                      <LinkIcon className="h-4 w-4" />
                      Website
                    </a>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(reservation)}
                  className="text-earth-500"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingReservation(reservation.id)}
                  className="text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-600 border-t border-sand-200 pt-2">
              {reservation.reservation_time && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-earth-400" />
                  <span>{formatTime(reservation.reservation_time)}</span>
                </div>
              )}
              
              {reservation.number_of_people && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-earth-400" />
                  <span>{reservation.number_of_people} people</span>
                </div>
              )}
              
              {reservation.cost && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">
                    {reservation.cost} {reservation.currency || 'USD'}
                  </span>
                </div>
              )}
            </div>

            {reservation.notes && (
              <p className="text-sm text-gray-600 border-t border-sand-200 pt-2">
                {reservation.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingReservation ? 'Edit Restaurant Reservation' : 'Add Restaurant Reservation'}
            </DialogTitle>
          </DialogHeader>
          <RestaurantReservationForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            defaultValues={
              editingReservation
                ? reservations.find((r) => r.id === editingReservation)
                : undefined
            }
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingReservation} onOpenChange={() => setDeletingReservation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reservation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reservation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DiningList;
