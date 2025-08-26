import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ActivityForm from '../../ActivityForm';
import { ActivityFormData } from '@/types/trip';

interface ActivityDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activity: ActivityFormData;
  onActivityChange: (activity: ActivityFormData) => void;
  onSubmit: (activity?: ActivityFormData) => void;
  onDelete?: (id: string) => void;
  eventId: string;
  tripDates?: { arrival_date: string; departure_date: string };
  preselectedDate?: string;
  tripId: string;
  activityId?: string | null; // For edit mode
}

const ActivityDialog: React.FC<ActivityDialogProps> = ({
  isOpen,
  onOpenChange,
  activity,
  onActivityChange,
  onSubmit,
  onDelete,
  eventId,
  tripDates,
  preselectedDate,
  tripId,
  activityId,
}) => {
  const isEditMode = !!activityId;

  useEffect(() => {
    if (isEditMode && activityId) {
      console.log('Editing activity with data:', activity);
    }
  }, [isEditMode, activityId, activity]);

  const handleDelete = () => {
    if (activityId && onDelete) {
      onDelete(activityId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[95vw] max-w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto scrollbar-none p-4 sm:p-6"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditMode ? 'Edit Activity' : 'Add New Activity'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update your activity details.' : 'Enter the details for your new activity.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto scrollbar-none">
          <ActivityForm
            activity={activity}
            onActivityChange={onActivityChange}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            onDelete={isEditMode ? handleDelete : undefined}
            submitLabel={isEditMode ? 'Save Changes' : 'Save'}
            eventId={eventId}
            tripDates={tripDates}
            preselectedDate={preselectedDate || (isEditMode ? activity.date : undefined)}
            tripId={tripId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityDialog;