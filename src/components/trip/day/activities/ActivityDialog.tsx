import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ActivityForm from "../../ActivityForm";
import { ActivityFormData } from "@/types/trip";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/** ---------------------- small helpers (robust & local) ---------------------- */

// Normalize to "YYYY-MM-DD" from many shapes (ISO, "YYYY-MM-DD", etc.)
const normalizeDateForDB = (value?: string) => {
  if (!value) return "";
  const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

interface ActivityDialogProps {
  open?: boolean;                 // NEW preferred
  isOpen?: boolean;               // legacy support
  onOpenChange: (open: boolean) => void;

  // Legacy interface (timeline/sidebar)
  activity?: ActivityFormData;
  onActivityChange?: (activity: ActivityFormData) => void;
  onSubmit?: (activity?: ActivityFormData) => void;
  onDelete?: (id: string) => void;
  eventId?: string;

  // New interface (chat system)
  initialData?: Partial<Tables<'day_activities'>>;
  onSuccess?: () => void;

  // Common props
  tripDates?: { arrival_date: string; departure_date: string };
  preselectedDate?: string;
  tripId: string;
  activityId?: string | null; // edit mode
  destination?: string; // Trip destination to bias Google Places results
}

const ActivityDialog: React.FC<ActivityDialogProps> = (props) => {
  const {
    open,
    isOpen,
    onOpenChange,
    activity,
    onActivityChange,
    onSubmit,
    onDelete,
    eventId,
    initialData,
    onSuccess,
    tripDates,
    preselectedDate,
    tripId,
    activityId,
    destination,
  } = props;

  const queryClient = useQueryClient();
  const finalOpen = open ?? isOpen ?? false;
  const isEditMode = !!activityId;

  // ---------- Internal activity state (used by chat flow) ----------
  const [internalActivity, setInternalActivity] = React.useState<ActivityFormData>(
    initialData ||
      activity || {
        title: "",
        description: "",
        date: "",
        start_time: "",
        end_time: "",
        cost: "",
        currency: "USD",
      }
  );

  const finalActivity: ActivityFormData =
    (activity as ActivityFormData) || internalActivity;
  const finalOnChange = onActivityChange || setInternalActivity;
  const finalEventId = eventId || tripId;

  // ---------- Resolve tripDates if not provided (chat path) ----------
  const [resolvedTripDates, setResolvedTripDates] =
    React.useState<ActivityDialogProps["tripDates"] | undefined>(tripDates);

  // Keep in sync with parent-provided tripDates
  useEffect(() => {
    if (tripDates?.arrival_date && tripDates?.departure_date) {
      setResolvedTripDates(tripDates);
    }
  }, [tripDates]);

  // If none provided (chat path), derive from trip_days (min/max)
  useEffect(() => {
    if (tripDates || !finalOpen || !tripId) return;

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("trip_days")
          .select("date")
          .eq("trip_id", tripId)
          .order("date", { ascending: true });

        if (!cancelled && !error && data && data.length > 0) {
          const arrival = data[0].date as string;
          const departure = data[data.length - 1].date as string;
          setResolvedTripDates({
            arrival_date: arrival,
            departure_date: departure,
          });
        }
      } catch (e) {
        console.error("Failed to resolve trip dates for ActivityDialog:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tripDates, finalOpen, tripId]);

  // ✅ Only prefill date for ADD flow (never in edit)
  useEffect(() => {
    if (!isEditMode && preselectedDate) {
      if ((finalActivity?.date || "") !== preselectedDate) {
        const next: ActivityFormData = {
          ...(finalActivity ?? ({} as ActivityFormData)),
          date: preselectedDate,
        };
        finalOnChange(next);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, preselectedDate]);

  // Debug aid for real edit mode
  useEffect(() => {
    if (isEditMode && activityId) {
      console.log("Editing activity with data:", finalActivity);
    }
  }, [isEditMode, activityId, finalActivity]);

  // Keep internal state in sync when chat passes new initialData (OCR result).
  // Keyed on the *value*, not the object identity: the calendar and map views
  // build initialData inline, so a fresh object arrives on every parent render
  // (a realtime event, a query refetch) and re-seeding on identity would wipe
  // whatever the user had typed but not yet saved.
  const initialDataKey = initialData ? JSON.stringify(initialData) : null;

  useEffect(() => {
    if (!initialDataKey) return;
    const mapped = { ...(initialData as Record<string, unknown>) };
    if (mapped.name && !mapped.title) {
      mapped.title = mapped.name;
      delete mapped.name;
    }
    setInternalActivity((curr) => ({ ...curr, ...mapped } as ActivityFormData));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDataKey]);

  const handleDelete = async () => {
    if (activityId && onDelete) {
      await onDelete(activityId);
      onOpenChange(false);
    }
  };

  const persistViaChatPath = async (dataToSave: ActivityFormData, selectedDate: string) => {
    const { data: tripDay, error: tripDayError } = await supabase
      .from("trip_days")
      .select("day_id")
      .eq("trip_id", tripId)
      .eq("date", selectedDate)
      .single();

    if (tripDayError || !tripDay) {
      throw new Error(
        "Could not find trip day for selected date. Please select a valid date."
      );
    }

    const costNum =
      dataToSave.cost && dataToSave.cost.trim() !== ""
        ? parseFloat(dataToSave.cost)
        : null;

    const dbData = {
      day_id: tripDay.day_id,
      title: dataToSave.title.trim(),
      description: dataToSave.description?.trim() || null,
      start_time: dataToSave.start_time || null,
      end_time: dataToSave.end_time || null,
      cost: costNum,
      currency: dataToSave.currency || "USD",
      location_address: dataToSave.location_address || null,
      location_place_id: dataToSave.location_place_id || null,
      location_phone: dataToSave.location_phone || null,
      location_website: dataToSave.location_website || null,
      location_rating: dataToSave.location_rating || null,
      timezone: dataToSave.timezone || null,
    };

    if (isEditMode) {
      const { error } = await supabase
        .from("day_activities")
        .update(dbData)
        .eq("id", activityId!);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("day_activities")
        .insert([{ ...dbData, trip_id: tripId, order_index: 0 }]);
      if (error) throw error;
    }

    queryClient.invalidateQueries({ queryKey: ["activities", tripId] });
    queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
  };

  const handleSubmit = async (activityData?: ActivityFormData) => {
    const dataToSave = activityData || finalActivity;

    try {
      if (!dataToSave.title?.trim()) {
        throw new Error("Activity title is required");
      }

      const selectedDate = normalizeDateForDB(dataToSave.date);
      if (!selectedDate) {
        throw new Error("Please choose a valid date");
      }

      const normalizedData = { ...dataToSave, date: selectedDate };

      if (onSubmit) {
        await onSubmit(normalizedData);
      } else {
        await persistViaChatPath(dataToSave, selectedDate);
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const { toast } = await import("sonner");
      toast.error(error instanceof Error ? error.message : "Failed to save activity");
    }
  };

  // Only pass preselectedDate for ADD flow; never for EDIT (prevents pinning)
  const resolvedPreselectedDate =
    !isEditMode ? preselectedDate || finalActivity.date : undefined;

  return (
    <Dialog open={finalOpen} onOpenChange={onOpenChange}>
      <DialogContent mobileSheet onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditMode ? "Edit Activity" : "Add New Activity"}</DialogTitle>
          <DialogDescription className="sr-only">
            {isEditMode ? "Update details for this activity" : "Enter details for a new activity or tour"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scrollbar-none">
          <ActivityForm
            activity={finalActivity}
            onActivityChange={finalOnChange}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            onDelete={isEditMode ? handleDelete : undefined}
            submitLabel="Save"
            eventId={finalEventId}
            tripDates={resolvedTripDates}
            preselectedDate={resolvedPreselectedDate}
            tripId={tripId}
            activityId={activityId}
            destination={destination}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityDialog;
