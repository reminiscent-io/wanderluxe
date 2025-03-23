
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ActivityForm from '../../ActivityForm';
import RequiredLabel from '@/components/ui/RequiredLabel';

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
}

const AddActivityDialog: React.FC<AddActivityDialogProps> = ({
  isOpen,
  onOpenChange,
  activity,
  onActivityChange,
  onSubmit,
  eventId,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Activity <RequiredLabel className="inline">Title</RequiredLabel></DialogTitle>
        </DialogHeader>
        <ActivityForm
          activity={activity}
          onActivityChange={onActivityChange}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Add Activity"
          eventId={eventId}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddActivityDialog;
