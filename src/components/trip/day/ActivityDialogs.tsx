
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/dialog";
import { DayActivity, ActivityFormData } from '@/types/trip';
import ActivityForm from './activities/ActivityForm';

interface ActivityDialogsProps {
  isAddingActivity: boolean;
  setIsAddingActivity: (value: boolean) => void;
  newActivity: ActivityFormData;
  setNewActivity: (activity: ActivityFormData) => void;
  onAddActivity: (activity: ActivityFormData) => Promise<void>;
  eventId: string;
  editingActivity: DayActivity | null;
  setEditingActivity: (activity: DayActivity | null) => void;
  onEditActivity: (activity: DayActivity) => void;
}

const ActivityDialogs: React.FC<ActivityDialogsProps> = ({
  isAddingActivity,
  setIsAddingActivity,
  newActivity,
  setNewActivity,
  onAddActivity,
  eventId,
  editingActivity,
  setEditingActivity,
  onEditActivity,
}) => {
  // Handle for adding activity
  const handleAddActivity = async (formData: ActivityFormData) => {
    await onAddActivity(formData);
    setIsAddingActivity(false);
    
    // Reset form data
    setNewActivity({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      cost: '',
      currency: 'USD'
    });
  };

  // Prepare the activity data for editing, ensuring we handle all the conversions properly
  const [editFormData, setEditFormData] = React.useState<ActivityFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    cost: '',
    currency: 'USD'
  });

  // When an activity is being edited, initialize the form data
  React.useEffect(() => {
    if (editingActivity) {
      setEditFormData({
        title: editingActivity.title || '',
        description: editingActivity.description || '',
        start_time: editingActivity.start_time || '',
        end_time: editingActivity.end_time || '',
        cost: editingActivity.cost ? String(editingActivity.cost) : '',
        currency: editingActivity.currency || 'USD'
      });
    }
  }, [editingActivity]);

  // Handle for editing activity
  const handleEditActivity = async (formData: ActivityFormData) => {
    if (!editingActivity) return;
    
    const updatedActivity: DayActivity = {
      ...editingActivity,
      title: formData.title,
      description: formData.description || '',
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      cost: formData.cost ? parseFloat(formData.cost) : null,
      currency: formData.currency || 'USD',
    };
    
    onEditActivity(updatedActivity);
    setEditingActivity(null);
  };

  return (
    <>
      {/* Add Activity Dialog */}
      <Dialog open={isAddingActivity} onOpenChange={setIsAddingActivity}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
          </DialogHeader>
          <ActivityForm
            activity={newActivity}
            onActivityChange={setNewActivity}
            onSubmit={handleAddActivity}
            onCancel={() => setIsAddingActivity(false)}
            submitLabel="Add Activity"
            eventId={eventId}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Activity Dialog */}
      <Dialog
        open={!!editingActivity}
        onOpenChange={(open) => {
          if (!open) setEditingActivity(null);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
          </DialogHeader>
          {editingActivity && (
            <ActivityForm
              activity={editFormData}
              onActivityChange={setEditFormData}
              onSubmit={handleEditActivity}
              onCancel={() => setEditingActivity(null)}
              submitLabel="Save Changes"
              eventId={eventId}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActivityDialogs;
