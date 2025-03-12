import React, { useEffect } from 'react';
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
  eventId: string;
}

const EditActivityDialog: React.FC<EditActivityDialogProps> = ({
  activityId,
  onOpenChange,
  activity,
  onActivityChange,
  onSubmit,
  eventId,
}) => {
  useEffect(() => {
    if (activityId) {
      console.log('Editing activity with data:', activity);
    }
  }, [activityId, activity]);

  return (
    <Dialog open={!!activityId} onOpenChange={(open) => { if (!open) onOpenChange(false) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Activity</DialogTitle>
        </DialogHeader>
        <ActivityForm
          activity={activity}
          onActivityChange={onActivityChange}
          onSubmit={() => onSubmit(activity)}
          onCancel={() => onOpenChange(false)}
          submitLabel="Save Changes"
          eventId={eventId}
        />
      </DialogContent>
    </Dialog>
  );
};

export default EditActivityDialog;
