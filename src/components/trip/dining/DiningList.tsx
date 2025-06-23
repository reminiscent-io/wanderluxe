import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import RestaurantReservationDialog from "./RestaurantReservationDialog";
import RestaurantCard from "./RestaurantCard";
import DeleteReservationDialog from "./DeleteReservationDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useParams } from "react-router-dom";

/***************************
 * Query‑key helper
 ***************************/
const reservationsKey = (tripId: string | undefined, dayId: string) => [
  "reservations",
  tripId ?? "__no_trip__",
  dayId,
] as const;

/***************************
 * Types
 ***************************/
console.log("DiningList v4 (canvas) loaded at", new Date().toISOString());


interface Reservation {
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
}

interface DiningListProps {
  reservations: Reservation[];
  formatTime: (time?: string) => string;
  dayId: string;
  className?: string;
}

/***************************
 * Component
 ***************************/
const DiningList: React.FC<DiningListProps> = ({
  reservations,
  formatTime,
  dayId,
  className,
}) => {
  const { tripId } = useParams<{ tripId: string }>();
  const queryClient = useQueryClient();

  // UI state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReservation, setEditingReservation] = useState<string | null>(
    null,
  );
  const [deletingReservation, setDeletingReservation] = useState<string | null>(
    null,
  );

  /***************************
   * Helpers
   ***************************/
  const invalidateReservations = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: reservationsKey(tripId, dayId),
    });
  }, [queryClient, tripId, dayId]);

  /***************************
   * Submit logic
   ***************************/
  const rawHandleSubmit = useCallback(
    async (data: any) => {
      if (!tripId) {
        toast.error("Trip ID is missing – can’t save reservation.");
        return;
      }

      console.log("=== HANDLE SUBMIT ===", { data, tripId, dayId });
      setIsSubmitting(true);

      const processedData = {
        ...data,
        day_id: dayId,
        trip_id: tripId,
        order_index:
          data.order_index !== undefined ? data.order_index : reservations.length,
        reservation_time: data.reservation_time || null,
      };

      try {
        if (editingReservation) {
          /***** UPDATE *****/
          const { data: upd, error, status } = await supabase
            .from("reservations")
            .update(processedData)
            .eq("id", editingReservation)
            .select()
            .throwOnError();

          console.log("UPDATE status", status, upd);

          if (upd.length === 0) {
            throw new Error(
              "Row passed UPDATE but was hidden by SELECT policy. Check reservations_select_policy.",
            );
          }

          toast.success("Reservation updated successfully");
        } else {
          /***** INSERT *****/
          const { data: ins, error, status } = await supabase
            .from("reservations")
            .insert([processedData])
            .select()
            .throwOnError();

          console.log("INSERT status", status, ins);

          if (ins.length === 0) {
            throw new Error(
              "Row inserted but hidden by SELECT policy. Check reservations_select_policy.",
            );
          }

          toast.success("Reservation added successfully");
        }

        await invalidateReservations();
        setIsDialogOpen(false);
        setEditingReservation(null);
      } catch (err: any) {
        console.error("Error saving reservation", err);
        toast.error(
          editingReservation ? "Failed to update reservation" : "Failed to save reservation",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingReservation, reservations.length, dayId, tripId, invalidateReservations],
  );

  // Keep a stable ref so the dialog never captures a stale function
  const handleSubmitRef = useRef(rawHandleSubmit);
  useEffect(() => {
    handleSubmitRef.current = rawHandleSubmit;
  }, [rawHandleSubmit]);

  const submitReservation = useCallback(async (data: any) => {
    console.log("=== DIRECT CALL TO HANDLESUBMIT ===");
    await handleSubmitRef.current(data);
  }, []);

  /***************************
   * Delete logic
   ***************************/
  const handleDelete = useCallback(async () => {
    if (!tripId || !deletingReservation) return;

    try {
      const { data, error } = await supabase
        .from("reservations")
        .delete()
        .eq("id", deletingReservation)
        .eq("trip_id", tripId)
        .select()
        .throwOnError();

      if (data.length === 0) {
        throw new Error(
          "Row deleted but SELECT policy hid it; ensure delete policy matches select policy.",
        );
      }

      await invalidateReservations();
      toast.success("Reservation deleted successfully");
      setDeletingReservation(null);
    } catch (err: any) {
      console.error("Error deleting reservation", err);
      toast.error("Failed to delete reservation");
    }
  }, [tripId, deletingReservation, invalidateReservations]);

  const handleEdit = useCallback((reservation: Reservation) => {
    setEditingReservation(reservation.id);
    setIsDialogOpen(true);
  }, []);

  /***************************
   * Render
   ***************************/
  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Reservation list */}
      <div className="space-y-3">
        {[...reservations]
          .sort((a, b) => (a.reservation_time || "").localeCompare(b.reservation_time || ""))
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

      {/* Dialog */}
      <RestaurantReservationDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={submitReservation}
        isSubmitting={isSubmitting}
        editingReservation={
          editingReservation
            ? reservations.find((r) => r.id === editingReservation)
            : { day_id: dayId, trip_id: tripId, order_index: reservations.length }
        }
        title={editingReservation ? "Edit Restaurant Reservation" : "Add Restaurant Reservation"}
        tripId={tripId}
      />

      {/* Delete confirmation */}
      <DeleteReservationDialog
        isOpen={!!deletingReservation}
        onOpenChange={() => setDeletingReservation(null)}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default DiningList;
