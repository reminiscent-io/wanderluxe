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
// ⬇️ NEW: we’ll safely fetch trip_days to derive arrival/departure if not provided
import { supabase } from "@/integrations/supabase/client";

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
  initialData?: any;
  onSuccess?: () => void;

  // Common props
  tripDates?: { arrival_date: string; departure_date: string };
  preselectedDate?: string;
  tripId: string;
  activityId?: string | null; // edit mode
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
  } = props;

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
  const finalActivity: ActivityFormData = (activity as ActivityFormData) || internalActivity;
  const finalOnChange = onActivityChange || setInternalActivity;
  const finalEventId = eventId || tripId;

  // ---------- NEW: resolve tripDates if not provided (chat flow) ----------
  const [resolvedTripDates, setResolvedTripDates] = React.useState<ActivityDialogProps["tripDates"] | undefined>(tripDates);

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
          setResolvedTripDates({ arrival_date: arrival, departure_date: departure });
        }
      } catch (e) {
        // Non-fatal; if this fails, ActivityForm will fall back to hiding the date picker
        console.error("Failed to resolve trip dates for ActivityDialog:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tripDates, finalOpen, tripId]);

  // ✅ Safe prefill for preselectedDate — use final* and guard against undefined
  useEffect(() => {
    if (!isEditMode && preselectedDate) {
      if ((finalActivity?.date || "") !== preselectedDate) {
        const next: ActivityFormData = { ...(finalActivity || ({} as any)), date: preselectedDate };
        finalOnChange(next);
      }
    }
    // We intentionally depend on preselectedDate + isEditMode only to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, preselectedDate]);

  // Debug aid for real edit mode
  useEffect(() => {
    if (isEditMode && activityId) {
      console.log("Editing activity with data:", finalActivity);
    }
  }, [isEditMode, activityId, finalActivity]);

  // Keep internal state in sync when chat passes new initialData (OCR result)
  useEffect(() => {
    if (initialData) {
      // Map 'name' to 'title' for chat system compatibility
      const mapped = { ...initialData };
      if (mapped.name && !mapped.title) {
        mapped.title = mapped.name;
        delete mapped.name;
      }
      setInternalActivity((curr) => ({ ...curr, ...mapped }));
    }
  }, [initialData]);

  const handleDelete = () => {
    if (activityId && onDelete) {
      onDelete(activityId);
      onOpenChange(false);
    }
  };

  // ❗ Save is ONLY triggered when user clicks "Save" in the form
  // (Opening the dialog never saves automatically.)
  const handleSubmit = async (activityData?: ActivityFormData) => {
    if (onSubmit) {
      // Legacy path: parent manages persistence
      await onSubmit(activityData);
      return;
    }
    if (!onSuccess) return;

    // Chat system path: persist on explicit Save
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { toast } = await import("sonner");

      const dataToSave = activityData || finalActivity;

      if (activityId) {
        const { error } = await supabase.from("day_activities").update(dataToSave).eq("id", activityId);
        if (error) throw error;
        toast.success("Activity updated");
      } else {
        const { error } = await supabase
          .from("day_activities")
          .insert([{ ...dataToSave, trip_id: tripId }]);
        if (error) throw error;
        toast.success("Activity added");
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      const { toast } = await import("sonner");
      toast.error(error?.message || "Failed to save activity");
    }
  };

  return (
    <Dialog open={finalOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] max-w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto scrollbar-none p-4 sm:p-6"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditMode ? "Edit Activity" : "Add New Activity"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Update your activity details." : "Enter the details for your new activity."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scrollbar-none">
          <ActivityForm
            activity={finalActivity}
            onActivityChange={finalOnChange}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            onDelete={isEditMode ? handleDelete : undefined}
            submitLabel={isEditMode ? "Save" : "Save"}
            eventId={finalEventId}
            tripDates={resolvedTripDates}
            preselectedDate={preselectedDate || (isEditMode ? finalActivity.date : undefined)}
            tripId={tripId}
            activityId={activityId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityDialog;
