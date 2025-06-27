import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
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
          tripDates={tripDates}
        />
        <DialogFooter className="mt-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Activity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditActivityDialog;