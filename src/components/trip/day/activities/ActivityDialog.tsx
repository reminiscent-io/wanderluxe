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

  // Chat-system internal state fallback
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

  // ✅ Safe prefill for preselectedDate — use final* and guard against undefined
  useEffect(() => {
    if (!isEditMode && preselectedDate) {
      if ((finalActivity?.date || "") !== preselectedDate) {
        const next: ActivityFormData = { ...(finalActivity || ({} as any)), date: preselectedDate };
        finalOnChange(next);
      }
    }
    // We intentionally depend on preselectedDate + isEditMode only to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, preselectedDate]);

  // Debug aid for real edit mode
  useEffect(() => {
    if (isEditMode && activityId) {
      console.log("Editing activity with data:", finalActivity);
    }
  }, [isEditMode, activityId, finalActivity]);

  // Keep internal state in sync when chat passes new initialData
  useEffect(() => {
    if (initialData) {
      setInternalActivity((curr) => ({ ...curr, ...initialData }));
    }
  }, [initialData]);

  const handleDelete = () => {
    if (activityId && onDelete) {
      onDelete(activityId);
      onOpenChange(false);
    }
  };

  const handleSubmit = async (activityData?: ActivityFormData) => {
    if (onSubmit) {
      // Legacy interface
      await onSubmit(activityData);
      return;
    }
    if (!onSuccess) return;

    // Chat system interface - save directly
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
            tripDates={tripDates}
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
