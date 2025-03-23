import React from 'react';
import AddActivityDialog from './activities/AddActivityDialog';
import EditActivityDialog from './activities/EditActivityDialog';
import { ActivityFormData } from '@/types/trip';

interface ActivityDialogsProps {
  isAddingActivity: boolean;
  setIsAddingActivity: (value: boolean) => void;
  editingActivity: string | null;
  setEditingActivity: (value: string | null) => void;
  newActivity: ActivityFormData;
  setNewActivity: (value: ActivityFormData) => void;
  activityEdit: ActivityFormData;
  setActivityEdit: (value: ActivityFormData) => void;
  onAddActivity: (activity: ActivityFormData) => Promise<void>;
  onEditActivity: (activityId: string) => Promise<void>;
  eventId: string;
}

const ActivityDialogs: React.FC<ActivityDialogsProps> = ({
  isAddingActivity,
  setIsAddingActivity,
  editingActivity,
  setEditingActivity,
  newActivity,
  setNewActivity,
  activityEdit,
  setActivityEdit,
  onAddActivity,
  onEditActivity,
  eventId
}) => {
  // Helper function to handle the dialog closing
  const handleEditActivityDialogClose = () => {
    setEditingActivity(null);
  };

  return (
    <>
      <AddActivityDialog
        isOpen={isAddingActivity}
        onOpenChange={setIsAddingActivity}
        activity={newActivity}
        onActivityChange={setNewActivity}
        onSubmit={() => onAddActivity(newActivity)}
        eventId={eventId}
      />

      <EditActivityDialog
        activityId={editingActivity}
        onOpenChange={handleEditActivityDialogClose}
        activity={activityEdit}
        onActivityChange={setActivityEdit}
        onSubmit={() => editingActivity && onEditActivity(editingActivity)}
        eventId={eventId}
      />
    </>
  );
};

export default ActivityDialogs;