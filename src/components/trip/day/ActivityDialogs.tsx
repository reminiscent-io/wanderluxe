
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import ActivityForm from '../ActivityForm';
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
  onAddActivity: (activity: ActivityFormData) => Promise<void>;
  onEditActivity: (id: string) => void;
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
  eventId,
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
            eventId={eventId}
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
            eventId={eventId}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActivityDialogs;
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import ActivityForm from '../ActivityForm';
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
  const initialActivity: ActivityFormData = { 
    title: '', 
    description: '', 
    start_time: '', 
    end_time: '', 
    cost: '', 
    currency: 'USD' 
  };

  const handleAddClose = () => {
    setIsAddingActivity(false);
    // Reset form data
    setNewActivity(initialActivity);
  };

  const handleEditClose = () => {
    setEditingActivity(null);
    // Reset form data
    setActivityEdit(initialActivity);
  };

  return (
    <>
      {/* Add Activity Dialog */}
      <Dialog open={isAddingActivity} onOpenChange={setIsAddingActivity}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
            <DialogDescription>
              Add a new activity to your trip day
            </DialogDescription>
          </DialogHeader>
          <ActivityForm
            formData={newActivity}
            onChange={setNewActivity}
            onSubmit={async () => {
              await onAddActivity(newActivity);
              handleAddClose();
            }}
            onCancel={handleAddClose}
            submitLabel="Add Activity"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Activity Dialog */}
      <Dialog 
        open={!!editingActivity} 
        onOpenChange={(open) => {
          if (!open) handleEditClose();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
            <DialogDescription>
              Modify your activity details
            </DialogDescription>
          </DialogHeader>
          <ActivityForm
            formData={activityEdit}
            onChange={setActivityEdit}
            onSubmit={async () => {
              if (editingActivity) {
                await onEditActivity(editingActivity);
              }
            }}
            onCancel={handleEditClose}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActivityDialogs;
