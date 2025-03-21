import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ActivityItem from './ActivityItem';

interface ActivitiesListProps {
  activities: Array<{
    id: string;
    day_id: string;
    title: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    cost?: number;
    currency?: string;
    order_index: number;
    created_at: string;
  }>;
  onAddActivity: () => void;
  onEditActivity: (activity: any) => void;  // Accept the full activity
  formatTime: (time?: string) => string;
}

const ActivitiesList: React.FC<ActivitiesListProps> = ({
  activities,
  onAddActivity,
  onEditActivity,
  formatTime,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddActivity}
          className="text-earth-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Activity
        </Button>
      </div>

      <div className="space-y-2">
        {activities.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            onEditClick={(activity) => onEditActivity(activity)}
            formatTime={formatTime}
          />
        ))}
      </div>
    </div>
  );
};

export default ActivitiesList;
import React from 'react';
import { Button } from '@/components/ui/button';
import { DayActivity } from '@/types/trip';
import { formatTime } from '@/utils/timeFormatter';
import { Pencil, Plus } from 'lucide-react';

interface ActivitiesListProps {
  activities: DayActivity[];
  onAddActivity: () => void;
  onEditActivity: (activity: DayActivity) => void;
  formatTime?: (time?: string) => string;
}

const ActivitiesList: React.FC<ActivitiesListProps> = ({
  activities,
  onAddActivity,
  onEditActivity,
  formatTime: customFormatTime,
}) => {
  // Use either provided format function or our default
  const timeFormatter = customFormatTime || formatTime;

  const handleActivityClick = (activity: DayActivity) => {
    console.log("Activity item clicked:", activity);
    onEditActivity(activity);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Activities</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onAddActivity}
          className="text-white hover:bg-white/20"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="space-y-2">
        {activities && activities.length > 0 ? (
          activities.map((activity) => (
            <div
              key={activity.id || `temp-${activity.title}-${activity.created_at}`}
              className="flex justify-between items-center p-3
                         bg-white rounded-lg shadow-sm 
                         hover:bg-gray-50 cursor-pointer"
              onClick={() => handleActivityClick(activity)}
            >
              <div>
                <h4 className="font-medium text-gray-900">{activity.title}</h4>
                {activity.start_time && (
                  <p className="text-sm text-gray-500">
                    {timeFormatter(activity.start_time)}
                    {activity.end_time && ` - ${timeFormatter(activity.end_time)}`}
                  </p>
                )}
                {activity.cost && (
                  <p className="text-sm text-gray-500">
                    {activity.cost} {activity.currency || 'USD'}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleActivityClick(activity);
                }}
                className="text-gray-600 hover:bg-gray-200"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          ))
        ) : (
          <div className="py-4 text-center text-gray-500">
            <p className="text-sm">No activities scheduled yet.</p>
            <Button 
              variant="ghost" 
              onClick={onAddActivity}
              className="mt-2 text-sm text-blue-500 hover:text-blue-700"
            >
              Add an activity
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivitiesList;
