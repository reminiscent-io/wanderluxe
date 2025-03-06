
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ActivityForm from '../../ActivityForm';

interface AddActivityDialogProps {
  isOpen: boolean;
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
  title?: string;
  isSubmitting?: boolean;
}

const AddActivityDialog: React.FC<AddActivityDialogProps> = ({
  isOpen,
  onOpenChange,
  activity,
  onActivityChange,
  onSubmit,
  eventId,
  title = "Add New Activity",
  isSubmitting = false,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ActivityForm
          activity={activity}
          onActivityChange={onActivityChange}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Add Activity"
          eventId={eventId}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddActivityDialog;
