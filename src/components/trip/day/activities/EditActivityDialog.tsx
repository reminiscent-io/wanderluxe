import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ActivityForm from '../../ActivityForm';
import { ActivityFormData } from '@/types/trip';

interface EditActivityDialogProps {
  activityId: string | null;
  onOpenChange: (open: boolean) => void;
  activity: ActivityFormData;
  onActivityChange: (activity: ActivityFormData) => void;
  onSubmit: (updatedActivity: ActivityFormData) => void;
  onDelete: (id: string) => void;
  eventId: string;
  tripDates?: { arrival_date: string; departure_date: string };
}

const EditActivityDialog: React.FC<EditActivityDialogProps> = ({
  activityId,
  onOpenChange,
  activity,
  onActivityChange,
  onSubmit,
  onDelete,
  eventId,
  tripDates,
}) => {
  useEffect(() => {
    if (activityId) {
      console.log('Editing activity with data:', activity);
    }
  }, [activityId, activity]);

  const handleDelete = async () => {
    if (activityId && onDelete) {
      onDelete(activityId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={!!activityId} onOpenChange={(open) => { if (!open) onOpenChange(false) }}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[500px] mx-auto">
        <DialogHeader>
          <DialogTitle>Edit Activity</DialogTitle>
        </DialogHeader>
        <ActivityForm
          activity={activity}
          onActivityChange={onActivityChange}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          onDelete={handleDelete}
          submitLabel="Save Changes"
          eventId={eventId}
          tripDates={tripDates}
        />
      </DialogContent>
    </Dialog>
  );
};

export default EditActivityDialog;