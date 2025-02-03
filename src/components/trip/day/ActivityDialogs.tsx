import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ActivityForm from '../ActivityForm';

interface ActivityDialogsProps {
  isAddingActivity: boolean;
  setIsAddingActivity: (value: boolean) => void;
  editingActivity: string | null;
  setEditingActivity: (value: string | null) => void;
  newActivity: { text: string; cost: string; currency: string };
  setNewActivity: (activity: { text: string; cost: string; currency: string }) => void;
  activityEdit: { text: string; cost: string; currency: string };
  setActivityEdit: (activity: { text: string; cost: string; currency: string }) => void;
  onAddActivity: () => void;
  onEditActivity: (id: string) => void;
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
}) => {
  return (
    <>
      <Dialog open={isAddingActivity} onOpenChange={setIsAddingActivity}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Activity</DialogTitle>
          </DialogHeader>
          <ActivityForm
            activity={newActivity}
            onActivityChange={setNewActivity}
            onSubmit={onAddActivity}
            onCancel={() => setIsAddingActivity(false)}
            submitLabel="Add Activity"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingActivity} onOpenChange={() => setEditingActivity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
          </DialogHeader>
          <ActivityForm
            activity={activityEdit}
            onActivityChange={setActivityEdit}
            onSubmit={() => editingActivity && onEditActivity(editingActivity)}
            onCancel={() => setEditingActivity(null)}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActivityDialogs;