import React from 'react';
import AddActivityDialog from './AddActivityDialog';
import EditActivityDialog from './EditActivityDialog';

interface ActivityDialogsProps {
  isAddingActivity: boolean;
  setIsAddingActivity: (value: boolean) => void;
  editingActivity: string | null;
  setEditingActivity: (value: string | null) => void;
  newActivity: {
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    cost: string;
    currency: string;
  };
  setNewActivity: (activity: {
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    cost: string;
    currency: string;
  }) => void;
  activityEdit: {
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    cost: string;
    currency: string;
  };
  setActivityEdit: (activity: {
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    cost: string;
    currency: string;
  }) => void;
  onAddActivity: () => void;
  onEditActivity: (id: string) => void;
  onDeleteActivity: (id: string) => void; // Added onDeleteActivity prop
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
  onDeleteActivity, // Added onDeleteActivity prop
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
        onSubmit={() => editingActivity && onEditActivity(editingActivity)}
        onDelete={onDeleteActivity} // Passed onDeleteActivity prop
        eventId={eventId}
      />
    </>
  );
};

export default ActivityDialogs;