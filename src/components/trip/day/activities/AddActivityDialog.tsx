
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ActivityForm from '../../ActivityForm';
import RequiredLabel from '@/components/ui/RequiredLabel';

import { ActivityFormData } from '@/types/trip';

interface AddActivityDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activity: ActivityFormData;
  onActivityChange: (activity: ActivityFormData) => void;
  onSubmit: () => void;
  eventId: string;
  tripDates?: { arrival_date: string; departure_date: string };
  preselectedDate?: string;
}

const AddActivityDialog: React.FC<AddActivityDialogProps> = ({
  isOpen,
  onOpenChange,
  activity,
  onActivityChange,
  onSubmit,
  eventId,
  tripDates,
  preselectedDate,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Activity</DialogTitle>
        </DialogHeader>
        <ActivityForm
          activity={activity}
          onActivityChange={onActivityChange}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Add Activity"
          eventId={eventId}
          tripDates={tripDates}
          preselectedDate={preselectedDate}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddActivityDialog;
