import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DayActivity } from '@/types/trip';
import ActivityItem from './ActivityItem';

interface ActivitiesListProps {
  activities: DayActivity[];
  formatTime: (time?: string) => string;
  onAddActivity: () => void;
  onEditActivity: (activity: DayActivity) => void;
}

const ActivitiesList: React.FC<ActivitiesListProps> = ({
  activities,
  formatTime,
  onAddActivity,
  onEditActivity,
}) => {
  const sortedActivities = activities.sort((a, b) => {
    const timeA = a.start_time || '';
    const timeB = b.start_time || '';
    if (timeA === '' && timeB === '') return 0;
    if (timeA === '') return 1;
    if (timeB === '') return -1;
    return new Date(`2000-01-01T${timeA}`).getTime() - new Date(`2000-01-01T${timeB}`).getTime();
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-base font-semibold text-earth-700">Activities</h4>
        <Button
          onClick={onAddActivity}
          variant="ghost"
          size="sm"
          className="text-earth-600 hover:text-earth-700 hover:bg-earth-50"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Activity
        </Button>
      </div>

      {activities.length > 0 ? (
        <ul className="space-y-1">
          {sortedActivities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              formatTime={formatTime}
              onEditActivity={onEditActivity} // Added onEditActivity prop
            />
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center py-4">No activities planned yet</p>
      )}
    </div>
  );
};

export default ActivitiesList;