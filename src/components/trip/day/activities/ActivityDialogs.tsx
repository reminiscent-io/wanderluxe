import React from 'react';
import ActivityDialog from './ActivityDialog';
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
  tripDates?: { arrival_date: string; departure_date: string };
  preselectedDate?: string;
  tripId: string;
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
  tripDates,
  preselectedDate,
  tripId,
}) => {
  return (
    <>
      {/* Add Activity Dialog */}
      <ActivityDialog
        isOpen={isAddingActivity}
        onOpenChange={setIsAddingActivity}
        activity={newActivity}
        onActivityChange={setNewActivity}
        onSubmit={() => onAddActivity(newActivity)}
        eventId={eventId}
        tripDates={tripDates}
        preselectedDate={preselectedDate}
        tripId={tripId}
      />
      
      {/* Edit Activity Dialog */}
      <ActivityDialog
        isOpen={!!editingActivity}
        onOpenChange={(open) => !open && setEditingActivity(null)}
        activity={activityEdit}
        onActivityChange={setActivityEdit}
        onSubmit={(updatedActivity: ActivityFormData) =>
          editingActivity && onEditActivity(editingActivity, updatedActivity || activityEdit)
        }
        onDelete={onDeleteActivity}
        eventId={eventId}
        tripDates={tripDates}
        tripId={tripId}
        activityId={editingActivity}
      />
    </>
  );
};

export default ActivityDialogs;
