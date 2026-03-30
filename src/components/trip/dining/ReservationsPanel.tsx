// src/components/trip/dining/ReservationsPanel.tsx
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatDateSafe, compareDatesSafe, formatTime } from "@/utils/sidebarUtils";
import Header from "../_shared/Header";
import PhotoStrip from "../_shared/PhotoStrip";
import { clearExpiredPlacePhotoCache } from "@/utils/placePhotoCache";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/* --------------------------------- types --------------------------------- */
interface Props {
  reservations: Array<{
    id: string | number;
    restaurant_name: string;
    reservation_time?: string | null;
    number_of_people?: number | null;
    cost?: number | null;
    currency?: string | null;
    place_id?: string | null; // enables photo strip when present
    image_url?: string | null; // key photo URL
    trip_id?: string;
    trip_days?: { date?: string | null } | null;
  }>;
  onAdd: () => void;
  onEdit: (r: any) => void;
  canEdit?: boolean;
  isMobile: boolean;
  onClose: () => void;
  onBack: () => void;
}

/* --------------------------------- view ---------------------------------- */
export default function ReservationsPanel({
  reservations,
  onAdd,
  onEdit,
  canEdit = true,
  isMobile,
  onClose,
  onBack,
}: Props) {
  const queryClient = useQueryClient();

  // Housekeeping: sweep expired entries occasionally
  useEffect(() => {
    clearExpiredPlacePhotoCache();
  }, []);

  const handleKeyPhoto = async (id: string | number, tripId: string | undefined, url: string | null) => {
    const { error } = await supabase
      .from("reservations")
      .update({ image_url: url })
      .eq("id", String(id));
    if (error) {
      toast.error("Failed to set key photo");
      return;
    }
    toast.success(url ? "Key photo set" : "Key photo removed");
    if (tripId) {
      queryClient.invalidateQueries({ queryKey: ["reservations", tripId] });
    }
  };

  const grouped = reservations.reduce((acc: Record<string, any[]>, r) => {
    const d = r.trip_days?.date || "No Date";
    (acc[d] ||= []).push(r);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort(compareDatesSafe);

  return (
    <div className="p-4">
      <Header title="Reservations" {...{ isMobile, onBack, onClose }} />

      {canEdit && (
        <Button
          size="sm"
          onClick={onAdd}
          className="mb-4 w-full bg-earth-500 text-white hover:bg-earth-600"
        >
          <Plus size={14} className="mr-1" /> Add Reservation
        </Button>
      )}

      {dates.map((d) => (
        <div key={d} className="space-y-2">
          <h5 className="border-b border-sand-200 pb-1 text-xs font-medium text-earth-700">
            {formatDateSafe(d)}
          </h5>
          {grouped[d]
            .sort((a, b) => (a.reservation_time || "").localeCompare(b.reservation_time || ""))
            .map((r) => (
              <div
                key={r.id}
                className="ml-2 w-full rounded-lg bg-sand-50 p-3 text-left transition-colors hover:bg-sand-100"
              >
                {/* Key photo display */}
                {r.image_url && (
                  <div className="-mx-3 -mt-3 mb-2">
                    <img
                      src={r.image_url}
                      alt={r.restaurant_name}
                      className="w-full h-32 object-cover rounded-t-lg"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Clickable header area (edit-only) */}
                <div onClick={canEdit ? () => onEdit(r) : undefined} role={canEdit ? "button" : undefined} className={`w-full text-left ${canEdit ? 'cursor-pointer' : ''}`}>
                  <h4 className="mb-1 text-sm font-medium">{r.restaurant_name}</h4>
                  <p className="text-xs text-sand-600">{formatTime(r.reservation_time)}</p>
                  {r.number_of_people && (
                    <p className="text-xs text-sand-600">{r.number_of_people} people</p>
                  )}
                  {typeof r.cost === "number" && (
                    <p className="text-xs text-sand-600">
                      {(r.currency || "USD")} {r.cost.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Non-clickable, scrollable photo strip */}
                <PhotoStrip
                  placeId={r.place_id}
                  title={r.restaurant_name}
                  keyPhotoUrl={r.image_url}
                  onSelectKeyPhoto={canEdit ? (url) => handleKeyPhoto(r.id, r.trip_id, url) : undefined}
                />
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}