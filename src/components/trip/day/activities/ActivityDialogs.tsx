import React from 'react';
import AddActivityDialog from './AddActivityDialog';
import EditActivityDialog from './EditActivityDialog';
import { ActivityFormData } from '@/types/trip';

interface ActivityDialogsProps {
  isAddingActivity: boolean;
  setIsAddingActivity: (value: boolean) => void;
  editingActivity: string | null;
  setEditingActivity: (value: string | null) => void;
  newActivity: ActivityFormData;
  setNewActivity: (activity: ActivityFormData) => void;
  activityEdit: ActivityFormData;
  setActivityEdit: (activity: ActivityFormData) => void;
  onAddActivity: (activity: ActivityFormData) => void;
  onEditActivity: (id: string, updatedActivity: ActivityFormData) => void;
  onDeleteActivity: (id: string) => void;
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
  onDeleteActivity,
  eventId,
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
        onSubmit={onAddActivity}
        eventId={eventId}
      />

      <EditActivityDialog
        activityId={editingActivity}
        onOpenChange={handleEditActivityDialogClose}
        activity={activityEdit}
        onActivityChange={setActivityEdit}
        onSubmit={(updatedActivity: ActivityFormData) =>
          editingActivity && onEditActivity(editingActivity, updatedActivity)
        }
        onDelete={onDeleteActivity}
        eventId={eventId}
      />
    </>
  );
};

export default ActivityDialogs;
