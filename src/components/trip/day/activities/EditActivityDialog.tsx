import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import ActivityForm from '../../ActivityForm';
import { Trash } from "lucide-react";
import { ActivityFormData } from '@/types/trip';

interface EditActivityDialogProps {
  activityId: string | null;
  onOpenChange: (open: boolean) => void;
  activity: ActivityFormData;
  onActivityChange: (activity: ActivityFormData) => void;
  onSubmit: (updatedActivity: ActivityFormData) => void;
  onDelete?: (id: string) => void;
  eventId: string;
}

const EditActivityDialog: React.FC<EditActivityDialogProps> = ({
  activityId,
  onOpenChange,
  activity,
  onActivityChange,
  onSubmit,
  onDelete,
  eventId,
}) => {
  useEffect(() => {
    if (activityId) {
      console.log('Editing activity with data:', activity);
    }
  }, [activityId, activity]);

  const handleDelete = () => {
    if (activityId && onDelete) {
      onDelete(activityId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={!!activityId} onOpenChange={(open) => { if (!open) onOpenChange(false) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Activity</DialogTitle>
        </DialogHeader>
        <ActivityForm
          activity={activity}
          onActivityChange={onActivityChange}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Save Changes"
          eventId={eventId}
        />
        <DialogFooter className="flex justify-between items-center mt-4 pt-2 border-t">
          <div className="flex w-full justify-between items-center">
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center justify-center size-9 text-red-600 hover:text-white bg-transparent border border-red-600 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              title="Delete activity"
              aria-label="Delete activity"
            >
              <Trash className="w-4 h-4" />
            </button>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="activity-form"
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Save Changes
              </button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditActivityDialog;