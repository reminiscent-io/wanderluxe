import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ActivityForm from '../ActivityForm';

interface Activity {
  id: string;
  text: string;
  cost?: number;
  currency?: string;
}

interface EventActivitiesListProps {
  activities: Activity[];
  isCheckoutDay: boolean;
  hotel?: string;
  onAddActivity: () => void;
  onEditActivity: (activity: Activity) => void;
  isAddingActivity: boolean;
  onAddingActivityChange: (isAdding: boolean) => void;
  newActivity: { text: string; cost: string; currency: string };
  onNewActivityChange: (activity: { text: string; cost: string; currency: string }) => void;
  handleAddActivity: () => void;
  editingActivity: string | null;
  onEditingActivityChange: (id: string | null) => void;
  activityEdit: { text: string; cost: string; currency: string };
  onActivityEditChange: (edit: { text: string; cost: string; currency: string }) => void;
  handleEditActivity: (id: string) => void;
}

const EventActivitiesList: React.FC<EventActivitiesListProps> = ({
  activities,
  isCheckoutDay,
  hotel,
  onAddActivity,
  onEditActivity,
  isAddingActivity,
  onAddingActivityChange,
  newActivity,
  onNewActivityChange,
  handleAddActivity,
  editingActivity,
  onEditingActivityChange,
  activityEdit,
  onActivityEditChange,
  handleEditActivity,
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-earth-500">Activities</h4>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onAddActivity}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Activity
        </Button>
      </div>
      
      {isCheckoutDay && hotel && (
        <div className="text-sm text-gray-400 p-2 bg-gray-50 rounded-md mb-2">
          Check-out of {hotel}
        </div>
      )}

      <Dialog open={isAddingActivity} onOpenChange={onAddingActivityChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Activity</DialogTitle>
          </DialogHeader>
          <ActivityForm
            activity={newActivity}
            onActivityChange={onNewActivityChange}
            onSubmit={handleAddActivity}
            onCancel={() => onAddingActivityChange(false)}
            submitLabel="Add Activity"
          />
        </DialogContent>
      </Dialog>

      <ul className="space-y-2">
        {activities.map((activity) => (
          <li 
            key={activity.id} 
            className="flex justify-between items-center text-sm text-gray-600 p-2 hover:bg-gray-50 rounded-md"
          >
            {editingActivity === activity.id ? (
              <Dialog open={true} onOpenChange={() => onEditingActivityChange(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Activity</DialogTitle>
                  </DialogHeader>
                  <ActivityForm
                    activity={activityEdit}
                    onActivityChange={onActivityEditChange}
                    onSubmit={() => handleEditActivity(activity.id)}
                    onCancel={() => onEditingActivityChange(null)}
                    submitLabel="Save Changes"
                  />
                </DialogContent>
              </Dialog>
            ) : (
              <>
                <div>
                  <span>{activity.text}</span>
                  {activity.cost && (
                    <span className="ml-2 text-earth-500">
                      {activity.cost} {activity.currency}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onEditingActivityChange(activity.id);
                    onActivityEditChange({
                      text: activity.text,
                      cost: activity.cost?.toString() || "",
                      currency: activity.currency || "USD"
                    });
                  }}
                >
                  <Pencil className="h-4 w-4 text-earth-500" />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EventActivitiesList;