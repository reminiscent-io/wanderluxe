
import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ActivityForm from '../../ActivityForm';
import { DayActivity } from '@/types/trip';

interface DayActivitiesSectionProps {
  activities: DayActivity[];
  isAddingActivity: boolean;
  setIsAddingActivity: (value: boolean) => void;
  editingActivityId: string | null;
  setEditingActivityId: (value: string | null) => void;
  onAddActivity: (activity: any) => void;
  onUpdateActivity: (activity: any) => void;
  formatTime: (time?: string) => string;
  dayId: string;
}

const DayActivitiesSection: React.FC<DayActivitiesSectionProps> = ({
  activities,
  isAddingActivity,
  setIsAddingActivity,
  editingActivityId,
  setEditingActivityId,
  onAddActivity,
  onUpdateActivity,
  formatTime,
  dayId,
}) => {
  const emptyActivity = {
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    cost: '',
    currency: 'USD'
  };

  const activityBeingEdited = editingActivityId
    ? activities.find(act => act.id === editingActivityId)
    : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-base font-semibold text-earth-700">Activities</h4>
        <Button
          onClick={() => setIsAddingActivity(true)}
          variant="ghost"
          size="sm"
          className="text-earth-600 hover:text-earth-700 hover:bg-earth-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Activity
        </Button>
      </div>

      {/* Add Activity Dialog */}
      <Dialog open={isAddingActivity} onOpenChange={setIsAddingActivity}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Activity</DialogTitle>
          </DialogHeader>
          <ActivityForm
            activity={emptyActivity}
            onActivityChange={() => {}}
            onSubmit={onAddActivity}
            onCancel={() => setIsAddingActivity(false)}
            submitLabel="Add Activity"
            eventId={dayId}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Activity Dialog */}
      <Dialog open={!!editingActivityId} onOpenChange={() => setEditingActivityId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
          </DialogHeader>
          {activityBeingEdited && (
            <ActivityForm
              activity={{
                title: activityBeingEdited.title,
                description: activityBeingEdited.description || '',
                start_time: activityBeingEdited.start_time || '',
                end_time: activityBeingEdited.end_time || '',
                cost: activityBeingEdited.cost?.toString() || '',
                currency: activityBeingEdited.currency || 'USD'
              }}
              onActivityChange={() => {}}
              onSubmit={onUpdateActivity}
              onCancel={() => setEditingActivityId(null)}
              submitLabel="Update Activity"
              eventId={dayId}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Activities List */}
      <div className="space-y-2">
        {activities.sort((a, b) => {
          const timeA = a.start_time || '';
          const timeB = b.start_time || '';
          if (timeA === '' && timeB === '') return 0;
          if (timeA === '') return 1;
          if (timeB === '') return -1;
          return new Date(timeA).getTime() - new Date(timeB).getTime();
        }).map((activity) => (
          <div
            key={activity.id}
            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <h4 className="font-medium text-sm">{activity.title}</h4>
              {activity.start_time && (
                <p className="text-xs text-gray-500">
                  {formatTime(activity.start_time)}
                  {activity.end_time && ` - ${formatTime(activity.end_time)}`}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingActivityId(activity.id)}
            >
              Edit
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DayActivitiesSection;
