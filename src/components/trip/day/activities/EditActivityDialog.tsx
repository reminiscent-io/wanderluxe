
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ActivityForm from '../../ActivityForm';

interface EditActivityDialogProps {
  activityId: string | null;
  onOpenChange: (open: boolean) => void;
  activity: {
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    cost: string;
    currency: string;
  };
  onActivityChange: (activity: {
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    cost: string;
    currency: string;
  }) => void;
  onSubmit: () => void;
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
  return (
    <Dialog open={!!activityId} onOpenChange={() => onOpenChange(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Activity</DialogTitle>
        </DialogHeader>
        <ActivityForm
          activity={activity}
          onActivityChange={onActivityChange}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(null)}
          submitLabel="Save Changes"
          eventId={eventId}
        />
      </DialogContent>
    </Dialog>
  );
};

export default EditActivityDialog;
