import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tables } from "@/integrations/supabase/types";
import type { AccommodationFormData } from "@/services/accommodation/accommodationService";
import AccommodationForm from "./AccommodationForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Accommodation = Tables<"accommodations">;

interface AccommodationDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Accommodation;
  onSuccess: () => void;
  preselectedDate?: string; // Day the user clicked "Add to this day" on
  destination?: string; // Trip destination to bias search results
}

const AccommodationDialog: React.FC<AccommodationDialogProps> = ({
  tripId,
  open,
  onOpenChange,
  initialData,
  onSuccess,
  preselectedDate,
  destination,
}) => {
  const queryClient = useQueryClient();
  const [tripDates, setTripDates] = useState<{
    arrival_date: string | null;
    departure_date: string | null;
  }>({
    arrival_date: null,
    departure_date: null,
  });

  useEffect(() => {
    const fetchTripDates = async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("arrival_date, departure_date")
        .eq("trip_id", tripId)
        .single();
      if (!error && data && data.arrival_date && data.departure_date) {
        setTripDates({
          arrival_date: data.arrival_date,
          departure_date: data.departure_date,
        });
      }
    };
    if (open) fetchTripDates();
  }, [tripId, open]);

  const handleSubmit = async (data: AccommodationFormData) => {
    try {
      const basePayload = {
        hotel: data.hotel,
        hotel_details: data.hotel_details,
        hotel_url: data.hotel_url,
        hotel_checkin_date: data.hotel_checkin_date,
        hotel_checkout_date: data.hotel_checkout_date,
        checkin_time: data.checkin_time,
        checkout_time: data.checkout_time,
        cost: data.cost,
        currency: data.currency,
        hotel_address: data.hotel_address,
        hotel_phone: data.hotel_phone,
        hotel_place_id: data.hotel_place_id,
        hotel_website: data.hotel_website,
        timezone: data.timezone || null,
      };

      if (initialData?.stay_id) {
        const { error } = await supabase
          .from("accommodations")
          .update({ ...basePayload })
          .eq("stay_id", initialData.stay_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("accommodations").insert([
          {
            trip_id: tripId,
            title: data.hotel || "Unnamed Accommodation",
            ...basePayload,
            order_index: 0,
            expense_type: "accommodation",
            created_at: new Date().toISOString(),
          },
        ]);
        if (error) throw error;
      }
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
      queryClient.invalidateQueries({ queryKey: ['trip'] });
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving accommodation:", error);
      toast.error("Failed to save accommodation");
    }
  };

  const handleDelete = async () => {
    try {
      if (initialData?.stay_id) {
        const { error } = await supabase
          .from("accommodations")
          .delete()
          .eq("stay_id", initialData.stay_id);
        if (error) throw error;
        
        // Invalidate queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['accommodations'] });
        queryClient.invalidateQueries({ queryKey: ['trip'] });
        
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error deleting accommodation:", error);
      toast.error("Failed to delete accommodation");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        mobileSheet
        // Keep the dialog open on outside clicks while editing
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {initialData ? "Edit Accommodation" : "Add Accommodation"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {initialData ? "Edit details for your stay" : "Enter details for a new hotel or lodging"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto scrollbar-none">
          <AccommodationForm
            initialData={initialData ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            tripArrivalDate={tripDates.arrival_date}
            tripDepartureDate={tripDates.departure_date}
            preselectedDate={preselectedDate}
            onDelete={handleDelete}
            tripId={tripId}
            destination={destination}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccommodationDialog;
