
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
      <DialogContent 
        onPointerDownOutside={(e) => e.preventDefault()}
        className="w-[95vw] max-w-[95vw] sm:max-w-[600px] mx-auto"
      >
        <div className="flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Add New Activity</DialogTitle>
            <DialogDescription>Enter the details for your new activity.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto scrollbar-none">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddActivityDialog;
